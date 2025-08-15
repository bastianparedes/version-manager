import { describe, it, expect, vi, beforeEach } from 'vitest';

const getThereAreUncommittedChanges = vi.fn();
const getBranchData = vi.fn();
const localTagsPromise = Promise.resolve(['v1.0.0']);
vi.mock('../git', () => ({
  getThereAreUncommittedChanges,
  getBranchData,
  localTagsPromise
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
    getReleaseData.mockResolvedValue({ releaseType: 'patch', preid: undefined });
    getNewVersion.mockResolvedValue({ version: '1.0.1', tag: 'v1.0.1' });
  });

  it('throws if there are uncommitted changes and ignoreGitChanges is false', async () => {
    getThereAreUncommittedChanges.mockResolvedValue(true);
    const { bumpVersion } = await import('../index');

    await expect(bumpVersion({ dryRun: false, branch: 'main', commitMsgTemplate: undefined, ignoreGitChanges: false })).rejects.toThrowError(
      'There are uncommitted changes in the repository. Please commit or stash them before proceeding.'
    );
  });

  it('executes full flow when there are no uncommitted changes', async () => {
    getThereAreUncommittedChanges.mockResolvedValue(false);
    const { bumpVersion } = await import('../index');

    await bumpVersion({ dryRun: false, branch: 'main', commitMsgTemplate: undefined, ignoreGitChanges: false });

    expect(getPkgToWork).toHaveBeenCalled();
    expect(getBranchData).toHaveBeenCalledWith('main');
    expect(getReleaseData).toHaveBeenCalled();
    expect(getNewVersion).toHaveBeenCalled();
    expect(setNewVersion).toHaveBeenCalledWith('1.0.1', 'v1.0.1', expect.any(Object), ['v1.0.0']);
  });

  it('does not set version when dryRun is true', async () => {
    getThereAreUncommittedChanges.mockResolvedValue(false);
    const { bumpVersion } = await import('../index');

    await bumpVersion({ dryRun: true, branch: 'main', commitMsgTemplate: undefined, ignoreGitChanges: false });

    expect(setNewVersion).not.toHaveBeenCalled();
  });
});
