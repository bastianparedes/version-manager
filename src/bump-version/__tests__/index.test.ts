import { describe, it, expect, vi, beforeEach } from 'vitest';

const getThereAreUncommittedChanges = vi.fn();
const getBranchData = vi.fn();
vi.mock('../git', () => ({
  getThereAreUncommittedChanges,
  getBranchData
}));

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
vi.mock('../variables', () => ({
  getLocalTags
}));

describe('bumpVersion', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getPkgToWork.mockResolvedValue({
      name: 'pkg-a',
      version: '1.0.0',
      isMonoRepo: false,
      path: '/repo/pkg-a',
      jsonPath: ''
    });

    getBranchData.mockResolvedValue({ isProduction: true, isUat: false, isDevelop: false });
    getLocalTags.mockResolvedValue(['v1.0.0']);
    getReleaseData.mockResolvedValue({ releaseType: 'patch', preid: undefined });
    getNewVersion.mockResolvedValue({ version: '1.0.1', tag: 'v1.0.1' });
  });

  it('throws if there are uncommitted changes and gitCheck is true', async () => {
    getThereAreUncommittedChanges.mockResolvedValue(true);
    const { bumpVersion } = await import('../index');

    await expect(bumpVersion({ dryRun: false, branch: 'main', commitMsgTemplate: undefined, gitCheck: true, commit: true })).rejects.toThrowError(
      'There are uncommitted changes in the repository. Please commit or stash them before proceeding.'
    );
  });

  it('executes full flow when there are no uncommitted changes', async () => {
    getThereAreUncommittedChanges.mockResolvedValue(false);
    const { bumpVersion } = await import('../index');

    await bumpVersion({ dryRun: false, branch: 'main', commitMsgTemplate: undefined, gitCheck: true, commit: true });

    expect(getPkgToWork).toHaveBeenCalled();
    expect(getBranchData).toHaveBeenCalledWith('main');
    expect(getReleaseData).toHaveBeenCalled();
    expect(getNewVersion).toHaveBeenCalled();
    expect(setNewVersion).toHaveBeenCalledWith({
      version: '1.0.1',
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
    getThereAreUncommittedChanges.mockResolvedValue(false);
    const { bumpVersion } = await import('../index');

    await bumpVersion({ dryRun: true, branch: 'main', commitMsgTemplate: undefined, gitCheck: true, commit: true });

    expect(setNewVersion).not.toHaveBeenCalled();
  });

  it('passes preid to releaseData when provided', async () => {
    getThereAreUncommittedChanges.mockResolvedValue(false);
    const { bumpVersion } = await import('../index');

    await bumpVersion({ dryRun: false, branch: 'main', commitMsgTemplate: undefined, gitCheck: true, preid: 'beta', commit: true });

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
    getThereAreUncommittedChanges.mockResolvedValue(false);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { bumpVersion } = await import('../index');

    await bumpVersion({ dryRun: false, branch: 'main', commitMsgTemplate: undefined, gitCheck: true, commit: false });

    expect(consoleSpy).toHaveBeenCalledWith(
      '%s\n%s\n%s',
      expect.stringContaining('No commit or tag was created'),
      expect.stringContaining('📦 The version was set to'),
      expect.stringContaining('commit/tag manually if needed')
    );

    consoleSpy.mockRestore();
  });
});
