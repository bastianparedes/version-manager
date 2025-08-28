import { describe, it, expect, vi, beforeEach } from 'vitest';

const getRemoteTags = vi.fn();
const getRepositoryData = vi.fn();
vi.mock('../variables', () => ({
  getRemoteTags,
  getRepositoryData
}));

const promptsMock = vi.fn();
vi.mock('prompts', () => ({
  default: promptsMock
}));

const execaMock = vi.fn();
vi.mock('execa', () => ({
  execa: execaMock
}));

const incMock = vi.fn();
vi.mock('semver', () => ({
  inc: incMock
}));

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
vi.mock('../git', () => ({
  default: git
}));

describe('version helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    promptsMock.mockReturnValue({ releaseType: 'major', subPkgName: 'root' });
    execaMock.mockReturnValue({ stdout: JSON.stringify(['1.0.0']) });
    getRemoteTags.mockReturnValue([]);
    getRepositoryData.mockReturnValue({
      isMonoRepo: true,
      rootPkg: { name: 'root', version: '1.0.0', path: '/root', jsonPath: '/root/package.json', isMonoRepo: true },
      allPkgs: [
        { name: 'root', version: '1.0.0', path: '/root', jsonPath: '/root/package.json', isMonoRepo: true },
        { name: 'sub', version: '0.1.0', path: '/sub', jsonPath: '/sub/package.json', isMonoRepo: true }
      ],
      subPkgs: [{ name: 'sub', version: '0.1.0', path: '/sub', jsonPath: '/sub/package.json', isMonoRepo: true }]
    });
    incMock.mockReturnValue('0.1.1');
  });

  describe('getPublishedVersions', () => {
    it('should return published versions from npm', async () => {
      const { getPublishedVersions } = await import('../pkg');
      const versions = await getPublishedVersions('test-package');
      expect(versions).toEqual(['1.0.0']);
      expect(execaMock).toHaveBeenCalledWith('npm', ['view', 'test-package', 'versions', '--json']);
    });

    it('should throw if npm view fails', async () => {
      execaMock.mockRejectedValue(new Error('fail'));
      const { getPublishedVersions } = await import('../pkg');
      await expect(getPublishedVersions('bad-package')).rejects.toThrow('Failed to fetch the published versions');
    });
  });

  describe('getPkgToWork', () => {
    it('should return root package in single repo', async () => {
      getRepositoryData.mockReturnValue({
        isMonoRepo: false,
        rootPkg: { name: 'root', version: '1.0.0', path: '/root', jsonPath: '/root/package.json', isMonoRepo: false },
        allPkgs: [{ name: 'root', version: '1.0.0', path: '/root', jsonPath: '/root/package.json', isMonoRepo: false }],
        subPkgs: []
      });
      const { getPkgToWork } = await import('../pkg');
      const pkg = await getPkgToWork();
      expect(pkg.name).toBe('root');
    });

    it('should select sub package in monorepo', async () => {
      promptsMock.mockReturnValue({ subPkgName: 'sub' });
      const { getPkgToWork } = await import('../pkg');
      const pkg = await getPkgToWork();
      expect(pkg.name).toBe('sub');
    });

    it('should throw if sub package not found', async () => {
      promptsMock.mockReturnValue({ subPkgName: 'missing' });
      const { getPkgToWork } = await import('../pkg');
      await expect(getPkgToWork()).rejects.toThrow('Failed to fetch the published versions');
    });
  });

  describe('getNewVersion', () => {
    it('should calculate a new version and tag', async () => {
      incMock.mockReturnValue('1.0.1');
      const { getNewVersion } = await import('../pkg');
      const result = await getNewVersion({
        pkg: { name: 'root', version: '1.0.0', path: '/root', jsonPath: '', isMonoRepo: false },
        releaseType: 'patch',
        preid: undefined,
        commitMsgTemplate: undefined
      });
      expect(result.version).toBe('1.0.1');
      expect(result.tag).toBe('v1.0.1');
    });

    it('should calculate a new version and tag for monorepo', async () => {
      incMock.mockReturnValue('0.1.1');
      const { getNewVersion } = await import('../pkg');
      const result = await getNewVersion({
        pkg: { name: 'sub', version: '0.1.0', path: '/sub', jsonPath: '/sub/package.json', isMonoRepo: true },
        releaseType: 'patch',
        preid: undefined,
        commitMsgTemplate: undefined
      });
      expect(result.version).toBe('0.1.1');
      expect(result.tag).toBe('sub@0.1.1');
    });

    it('should throw if inc returns null', async () => {
      incMock.mockReturnValue(null);
      const { getNewVersion } = await import('../pkg');
      await expect(
        getNewVersion({
          pkg: { name: 'root', version: '1.0.0', path: '/root', jsonPath: '', isMonoRepo: false },
          releaseType: 'patch',
          preid: undefined,
          commitMsgTemplate: undefined
        })
      ).rejects.toThrow('New version could not be calculated');
    });
  });

  describe('getReleaseData', () => {
    it('should return production release type', async () => {
      const { getReleaseData } = await import('../pkg');
      promptsMock.mockReturnValue({ releaseType: 'minor' });
      const result = await getReleaseData({ isProduction: true, isUat: false, isDevelop: false });
      expect(result.preid).toBeUndefined();
      expect(result.releaseType).toBe('minor');
    });

    it('should return uat release type', async () => {
      const { getReleaseData } = await import('../pkg');
      promptsMock.mockReturnValue({ releaseType: 'preminor' });
      const result = await getReleaseData({ isProduction: false, isUat: true, isDevelop: false });
      expect(result.preid).toBe('rc');
    });

    it('should return develop release type', async () => {
      const { getReleaseData } = await import('../pkg');
      promptsMock.mockReturnValue({ releaseType: 'prepatch' });
      const result = await getReleaseData({ isProduction: false, isUat: false, isDevelop: true });
      expect(result.preid).toBe('beta');
    });

    it('should return default alpha release type', async () => {
      const { getReleaseData } = await import('../pkg');
      promptsMock.mockReturnValue({ releaseType: 'premajor' });
      const result = await getReleaseData({ isProduction: false, isUat: false, isDevelop: false });
      expect(result.preid).toBe('alpha');
    });
  });

  describe('setNewVersion', () => {
    it('should remove local tag and commit if needed', async () => {
      const { setNewVersion } = await import('../pkg');
      await setNewVersion({ version: '1.0.1', tag: 'v1.0.1', pkg: { path: '/root', isMonoRepo: false, jsonPath: '', name: '', version: '' }, localTags: ['v1.0.1'], commit: true, push: false });

      expect(git.removeTag).toHaveBeenCalledWith('v1.0.1');
      expect(execaMock).toHaveBeenCalledWith('npm', ['version', '1.0.1', '--no-git-tag-version'], { cwd: '/root' });
      expect(git.addAll).toHaveBeenCalled();
      expect(git.commit).toHaveBeenCalledWith('v1.0.1');
      expect(git.tag).toHaveBeenCalledWith('v1.0.1');
    });

    it('should skip commit if commit flag is false', async () => {
      const { setNewVersion } = await import('../pkg');
      await setNewVersion({ version: '1.0.1', tag: 'v1.0.1', pkg: { path: '/root', isMonoRepo: false, jsonPath: '', name: '', version: '' }, localTags: [], commit: false, push: false });

      expect(git.addAll).not.toHaveBeenCalled();
      expect(git.commit).not.toHaveBeenCalled();
      expect(git.tag).not.toHaveBeenCalled();
    });

    it('should push and pushTag when push is true', async () => {
      const { setNewVersion } = await import('../pkg');
      await setNewVersion({
        version: '1.0.1',
        tag: 'v1.0.1',
        pkg: { path: '/root', isMonoRepo: false, jsonPath: '', name: '', version: '' },
        localTags: [],
        commit: true,
        push: true
      });

      expect(git.push).toHaveBeenCalled();
      expect(git.pushTag).toHaveBeenCalledWith('v1.0.1');
    });
  });
});
