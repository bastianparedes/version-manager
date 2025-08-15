import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Package } from '@manypkg/get-packages';
import path from 'path';

const getPackages = vi.fn();
vi.mock('@manypkg/get-packages', () => ({
  getPackages
}));

const prompts = vi.fn();
vi.mock('prompts', () => ({
  default: prompts
}));

const removeLocalTag = vi.fn();
const remoteTagsPromise = Promise.resolve(['v1.0.0']);
vi.mock('../git', () => ({
  removeLocalTag,
  remoteTagsPromise
}));

const execa = vi.fn();
vi.mock('execa', () => ({
  execa
}));

const fakePkg = (name: string, dir = `/repo/${name}`): Package =>
  ({
    dir,
    relativeDir: name === 'root' ? '.' : name,
    packageJson: {
      name,
      version: '1.0.0'
    }
  }) as unknown as Package;

describe('pkg utils', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('getPkg', () => {
    it('returns correct format if package exists', async () => {
      getPackages.mockResolvedValue({ packages: [fakePkg('root')] });
      const { getPkg } = await import('../pkg');
      const pkg = await getPkg('root');
      expect(pkg).toEqual({
        path: '/repo/root',
        jsonPath: path.resolve('/repo/root', 'package.json'),
        name: 'root',
        version: '1.0.0'
      });
    });

    it('throws error if package does not exist', async () => {
      getPackages.mockResolvedValue({ packages: [] });
      const { getPkg } = await import('../pkg');
      await expect(getPkg('nope')).rejects.toThrowError('package.json not found for project nope');
    });
  });

  describe('getRepositoryData', () => {
    it('returns root and sub-packages', async () => {
      getPackages.mockResolvedValue({
        packages: [fakePkg('root'), fakePkg('pkg-a')],
        rootPackage: fakePkg('root')
      });
      const { getRepositoryData } = await import('../pkg');
      const data = await getRepositoryData();
      expect(data.isMonoRepo).toBe(true);
      expect(data.subPkgs.length).toBe(1);
      expect(data.rootPkg.name).toBe('root');
    });

    it('throws error if root package is missing', async () => {
      getPackages.mockResolvedValue({ packages: [], rootPackage: null });
      const { getRepositoryData } = await import('../pkg');
      await expect(getRepositoryData()).rejects.toThrowError('package.json not found in root');
    });
  });

  describe('getPkgToWork', () => {
    it('monorepo: asks for sub-package via prompts', async () => {
      getPackages.mockResolvedValue({
        packages: [fakePkg('root'), fakePkg('pkg-a')],
        rootPackage: fakePkg('root')
      });
      prompts.mockResolvedValue({ subPkgName: 'pkg-a' });
      const { getPkgToWork } = await import('../pkg');
      const pkg = await getPkgToWork();
      expect(pkg.name).toBe('pkg-a');
      expect(pkg.isMonoRepo).toBe(true);
    });

    it('single repo: returns root package', async () => {
      getPackages.mockResolvedValue({
        packages: [fakePkg('root')],
        rootPackage: fakePkg('root')
      });
      const { getPkgToWork } = await import('../pkg');
      const pkg = await getPkgToWork();
      expect(pkg.name).toBe('root');
      expect(pkg.isMonoRepo).toBe(false);
    });
  });

  describe('getNewVersion', () => {
    beforeEach(() => {
      execa.mockResolvedValue({ stdout: '["1.0.0"]' });
    });

    it('calculates a new version that does not exist in tags', async () => {
      const { getNewVersion } = await import('../pkg');
      const result = await getNewVersion({ name: 'pkg-a', version: '1.0.0', isMonoRepo: false, path: '', jsonPath: '' }, 'patch', undefined, undefined);
      expect(result.version).toBe('1.0.1');
      expect(result.tag).toBe('v1.0.1');
    });

    it('monorepo: calculates a new version that does not exist in tags', async () => {
      const { getNewVersion } = await import('../pkg');
      const result = await getNewVersion({ name: 'pkg-a', version: '1.0.0', isMonoRepo: true, path: '', jsonPath: '' }, 'patch', undefined, undefined);
      expect(result.version).toBe('1.0.1');
      expect(result.tag).toBe('pkg-a@1.0.1');
    });

    it('throws error if increment cannot calculate a version', async () => {
      const { getNewVersion } = await import('../pkg');
      await expect(getNewVersion({ name: 'pkg-a', version: 'invalid', isMonoRepo: false, path: '', jsonPath: '' }, 'patch', undefined, undefined)).rejects.toThrowError(
        'New version could not be calculated'
      );
    });
  });

  describe('getReleaseData', () => {
    it('returns releaseType and preid correctly for production', async () => {
      prompts.mockResolvedValue({ releaseType: 'major' });
      const { getReleaseData } = await import('../pkg');
      const result = await getReleaseData({ isProduction: true, isUat: false, isDevelop: false });
      expect(result).toEqual({ releaseType: 'major', preid: undefined });
    });

    it('returns preid "rc" if UAT', async () => {
      prompts.mockResolvedValue({ releaseType: 'preminor' });
      const { getReleaseData } = await import('../pkg');
      const result = await getReleaseData({ isProduction: false, isUat: true, isDevelop: false });
      expect(result.preid).toBe('rc');
    });

    it('returns preid "beta" if develop', async () => {
      prompts.mockResolvedValue({ releaseType: 'prepatch' });
      const { getReleaseData } = await import('../pkg');
      const result = await getReleaseData({ isProduction: false, isUat: false, isDevelop: true });
      expect(result.preid).toBe('beta');
    });

    it('returns preid "alpha" if custom branch', async () => {
      prompts.mockResolvedValue({ releaseType: 'prepatch' });
      const { getReleaseData } = await import('../pkg');
      const result = await getReleaseData({ isProduction: false, isUat: false, isDevelop: false });
      expect(result.preid).toBe('alpha');
    });
  });

  describe('setNewVersion', () => {
    it('tries to remove tag and runs npm version', async () => {
      const { setNewVersion } = await import('../pkg');
      const pkg = { name: 'pkg-a', version: '1.0.0', isMonoRepo: false, path: '/repo/pkg-a', jsonPath: '' };
      await setNewVersion('1.0.1', 'v1.0.1', pkg, ['v1.0.1']);
      expect(removeLocalTag).toHaveBeenCalledWith('v1.0.1');
      expect(execa).toHaveBeenCalledWith('npm', ['version', '1.0.1', '-m', 'v1.0.1'], { cwd: '/repo/pkg-a' });
    });

    it('does not try to remove tag but runs npm version', async () => {
      const { setNewVersion } = await import('../pkg');
      const pkg = { name: 'pkg-a', version: '1.0.0', isMonoRepo: false, path: '/repo/pkg-a', jsonPath: '' };
      await setNewVersion('1.0.1', 'v1.0.1', pkg, []);
      expect(removeLocalTag).not.toHaveBeenCalled();
      expect(execa).toHaveBeenCalledWith('npm', ['version', '1.0.1', '-m', 'v1.0.1'], { cwd: '/repo/pkg-a' });
    });
  });

  describe('getPublishedVersions', () => {
    it('throws a descriptive error when npm view fails', async () => {
      execa.mockRejectedValue(new Error('npm view failed'));
      const { getPublishedVersions } = await import('../pkg');

      await expect(getPublishedVersions('nonexistent-pkg')).rejects.toThrowError(
        'Failed to fetch the published versions. This may be because the package does not exist on npm, the .npmrc is not configured, or another unknown issue occurred.'
      );
    });
  });
});
