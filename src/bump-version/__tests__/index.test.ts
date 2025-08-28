import { describe, it, expect, vi, beforeEach } from 'vitest';

const git = {
  add: vi.fn(),
  addAll: vi.fn(),
  commit: vi.fn(),
  push: vi.fn(),
  pushTag: vi.fn(),
  getLocalTags: vi.fn(),
  tag: vi.fn(),
  removeTag: vi.fn(),
  getRemoteTags: vi.fn(),
  getBranchData: vi.fn(),
  getThereAreUncommittedChanges: vi.fn()
};
vi.mock('../git', () => ({ default: git }));

const getPkgToWork = vi.fn();
const getReleaseData = vi.fn();
const getNewVersion = vi.fn();
const setNewVersion = vi.fn();
vi.mock('../pkg', () => ({
  getPkgToWork,
  getReleaseData,
  getNewVersion,
  setNewVersion
}));

const getLocalTags = vi.fn();
vi.mock('../variables', () => ({ getLocalTags }));

describe('bumpVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getPkgToWork.mockReturnValue({
      name: 'pkg-a',
      version: '1.0.0',
      isMonoRepo: false,
      path: '/repo/pkg-a',
      jsonPath: ''
    });

    git.getBranchData.mockReturnValue({
      isProduction: true,
      isUat: false,
      isDevelop: false
    });

    getLocalTags.mockReturnValue(['v1.0.0']);
    getReleaseData.mockReturnValue({ releaseType: 'patch', preid: undefined });
    getNewVersion.mockReturnValue({ version: '1.0.1', tag: 'v1.0.1' });
  });

  it('throws if there are uncommitted changes and gitCheck is true', async () => {
    git.getThereAreUncommittedChanges.mockReturnValue(true);
    const { bumpVersion } = await import('../index');

    await expect(
      bumpVersion({
        dryRun: false,
        branch: 'main',
        commitMsgTemplate: undefined,
        gitCheck: true,
        commit: true,
        json: false,
        push: false
      })
    ).rejects.toThrowError('There are uncommitted changes in the repository. Please commit or stash them before proceeding.');
  });

  it('executes full flow when there are no uncommitted changes', async () => {
    git.getThereAreUncommittedChanges.mockReturnValue(false);
    const { bumpVersion } = await import('../index');

    await bumpVersion({
      dryRun: false,
      branch: 'main',
      commitMsgTemplate: undefined,
      gitCheck: true,
      commit: true,
      json: false,
      push: false
    });

    expect(getPkgToWork).toHaveBeenCalled();
    expect(git.getBranchData).toHaveBeenCalledWith('main');
    expect(getReleaseData).toHaveBeenCalled();
    expect(getNewVersion).toHaveBeenCalled();
    expect(setNewVersion).toHaveBeenCalledWith({
      version: '1.0.1',
      push: false,
      tag: 'v1.0.1',
      pkg: {
        isMonoRepo: false,
        jsonPath: '',
        name: 'pkg-a',
        path: '/repo/pkg-a',
        version: '1.0.0'
      },
      localTags: ['v1.0.0'],
      commit: true
    });
  });

  it('does not set version when dryRun is true', async () => {
    git.getThereAreUncommittedChanges.mockReturnValue(false);
    const { bumpVersion } = await import('../index');

    await bumpVersion({
      dryRun: true,
      branch: 'main',
      commitMsgTemplate: undefined,
      gitCheck: true,
      commit: true,
      json: false,
      push: false
    });

    expect(setNewVersion).not.toHaveBeenCalled();
  });

  it('passes preid to releaseData when provided', async () => {
    git.getThereAreUncommittedChanges.mockReturnValue(false);
    const { bumpVersion } = await import('../index');

    await bumpVersion({
      dryRun: false,
      branch: 'main',
      commitMsgTemplate: undefined,
      gitCheck: true,
      preid: 'beta',
      commit: true,
      json: false,
      push: false
    });

    expect(getNewVersion).toHaveBeenCalledWith({
      commitMsgTemplate: undefined,
      pkg: {
        isMonoRepo: false,
        jsonPath: '',
        name: 'pkg-a',
        path: '/repo/pkg-a',
        version: '1.0.0'
      },
      preid: 'beta',
      releaseType: 'patch'
    });
  });

  it('logs correct message when commit is false', async () => {
    git.getThereAreUncommittedChanges.mockReturnValue(false);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { bumpVersion } = await import('../index');

    await bumpVersion({
      dryRun: false,
      branch: 'main',
      commitMsgTemplate: undefined,
      gitCheck: true,
      commit: false,
      json: false,
      push: false
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('ℹ️ No commit or tag was created (--no-commit enabled).\n') &&
        expect.stringContaining('📦 The version was set to 1.0.1.\n') &&
        expect.stringContaining('🚀 You can review the changes and commit/tag manually if needed.')
    );

    consoleSpy.mockRestore();
  });

  it('logs JSON and returns when json is true', async () => {
    git.getThereAreUncommittedChanges.mockReturnValue(false);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { bumpVersion } = await import('../index');

    await bumpVersion({
      dryRun: false,
      branch: 'main',
      commitMsgTemplate: undefined,
      gitCheck: true,
      commit: true,
      json: true,
      push: false
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          version: '1.0.1',
          tag: 'v1.0.1'
        },
        null,
        2
      )
    );

    expect(setNewVersion).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
