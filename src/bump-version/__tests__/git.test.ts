import { describe, it, expect, vi, beforeEach } from 'vitest';

const execa = vi.fn();

vi.mock('execa', () => ({
  execa,
}));

describe('git helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  describe('getBranchData', () => {
    it('should get branch data with develop branch', async () => {
      execa.mockReturnValue({ stdout: 'develop' });

      const { default: git } = await import('../git');
      const result = await git.getBranchData(undefined);

      expect(result).toEqual({
        name: 'develop',
        isProduction: false,
        isUat: false,
        isDevelop: true,
        isCustom: false,
      });
    });

    it('should get branch data with initialName overriding git branch', async () => {
      execa.mockReturnValue({ stdout: 'feature/new-feature' });

      const { default: git } = await import('../git');
      const result = await git.getBranchData('main');

      expect(result.name).toBe('main');
      expect(result.isProduction).toBe(true);
      expect(result.isCustom).toBe(false);
    });

    it('should detect custom branch', async () => {
      execa.mockReturnValue({ stdout: 'feature/new-feature' });

      const { default: git } = await import('../git');
      const result = await git.getBranchData(undefined);

      expect(result.isCustom).toBe(true);
      expect(result.isProduction).toBe(false);
      expect(result.isDevelop).toBe(false);
      expect(result.isUat).toBe(false);
    });
  });

  describe('removeTag', () => {
    it('should remove a local tag', async () => {
      const { default: git } = await import('../git');
      await git.removeTag('v1.0.0');

      expect(execa).toHaveBeenCalledWith('git', ['tag', '-d', 'v1.0.0']);
    });
  });

  describe('getThereAreUncommittedChanges', () => {
    it('should detect uncommitted changes', async () => {
      execa.mockReturnValue({ stdout: 'MM package-lock.json' });

      const { default: git } = await import('../git');
      const hasChanges = await git.getThereAreUncommittedChanges();

      expect(hasChanges).toBe(true);
    });

    it('should return false if no uncommitted changes', async () => {
      execa.mockReturnValue({ stdout: '' });

      const { default: git } = await import('../git');
      const hasChanges = await git.getThereAreUncommittedChanges();

      expect(hasChanges).toBe(false);
    });
  });

  describe('add & addAll', () => {
    it('should add a single file', async () => {
      const { default: git } = await import('../git');
      await git.add('file.txt');

      expect(execa).toHaveBeenCalledWith('git', ['add', 'file.txt']);
    });

    it('should add all files', async () => {
      const { default: git } = await import('../git');
      await git.addAll();

      expect(execa).toHaveBeenCalledWith('git', ['add', '.']);
    });
  });

  describe('commit', () => {
    it('should commit with a message', async () => {
      const { default: git } = await import('../git');
      await git.commit('my commit');

      expect(execa).toHaveBeenCalledWith('git', ['commit', '-m', 'my commit']);
    });
  });

  describe('push & pushTag', () => {
    it('should push changes', async () => {
      const { default: git } = await import('../git');
      await git.push();

      expect(execa).toHaveBeenCalledWith('git', ['push']);
    });

    it('should push a tag', async () => {
      const { default: git } = await import('../git');
      await git.pushTag('v1.2.3');

      expect(execa).toHaveBeenCalledWith('git', ['push', 'origin', 'v1.2.3']);
    });
  });

  describe('getLocalTags', () => {
    it('should list local tags', async () => {
      execa.mockReturnValue({ stdout: 'v1.0.0\nv1.1.0\n' });

      const { default: git } = await import('../git');
      const tags = await git.getLocalTags();

      expect(tags).toEqual(['v1.0.0', 'v1.1.0']);
      expect(execa).toHaveBeenCalledWith('git', ['tag', '--list'], { cwd: process.cwd() });
    });
  });

  describe('tag', () => {
    it('should create a tag', async () => {
      const { default: git } = await import('../git');
      await git.tag('v2.0.0');

      expect(execa).toHaveBeenCalledWith('git', ['tag', 'v2.0.0'], { cwd: process.cwd() });
    });
  });

  describe('getRemoteTags', () => {
    it('should list remote tags', async () => {
      execa.mockReturnValue({
        stdout: `abc123\trefs/tags/v1.0.0\nxyz456\trefs/tags/v1.1.0\n`,
      });

      const { default: git } = await import('../git');
      const tags = await git.getRemoteTags();

      expect(tags).toEqual(['v1.0.0', 'v1.1.0']);
      expect(execa).toHaveBeenCalledWith('git', ['ls-remote', '--tags', 'origin']);
    });
  });
});
