import { describe, it, expect, vi, beforeEach } from 'vitest';

const branch = vi.fn();
const listRemote = vi.fn();
const status = vi.fn();
const tag = vi.fn();
const tags = vi.fn();
vi.mock('simple-git', () => ({
  default: () => ({
    branch,
    listRemote,
    status,
    tag,
    tags
  })
}));

describe('git helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    branch.mockReturnValue({ current: 'develop' });
    listRemote.mockReturnValue('');
    status.mockReturnValue({ modified: [], not_added: [], staged: [] });
    tag.mockReset();
    tags.mockReturnValue({ all: [] });
  });

  describe('getBranchData', () => {
    it('should get branch data with develop branch', async () => {
      branch.mockReturnValue({ current: 'develop' });

      const { getBranchData } = await import('../git');
      const result = await getBranchData(undefined);

      expect(result).toEqual({
        name: 'develop',
        isProduction: false,
        isUat: false,
        isDevelop: true,
        isCustom: false
      });
    });

    it('should get branch data with initialName overriding git branch', async () => {
      branch.mockReturnValue({ current: 'feature/test' });

      const { getBranchData } = await import('../git');
      const result = await getBranchData('main');

      expect(result.name).toBe('main');
      expect(result.isProduction).toBe(true);
      expect(result.isCustom).toBe(false);
    });
  });

  describe('localTagsPromise', () => {
    it('should return local tags', async () => {
      tags.mockReturnValue({ all: ['v1.0.0', 'v1.1.0'] });

      const { localTagsPromise } = await import('../git');
      const localTags = await localTagsPromise;

      expect(localTags).toEqual(['v1.0.0', 'v1.1.0']);
    });
  });

  describe('remoteTagsPromise', () => {
    it('should return remote tags', async () => {
      listRemote.mockReturnValue(`abc123 refs/tags/v1.0.0\n def456 refs/tags/v2.0.0\n ghi789 refs/tags/v3.0.0\n`);

      const { remoteTagsPromise } = await import('../git');
      const remoteTags = await remoteTagsPromise;

      expect(remoteTags).toEqual(['v1.0.0', 'v2.0.0', 'v3.0.0']);
    });
  });

  describe('removeLocalTag', () => {
    it('should remove a local tag', async () => {
      const { removeLocalTag } = await import('../git');
      await removeLocalTag('v1.0.0');

      expect(tag).toHaveBeenCalledWith(['-d', 'v1.0.0']);
    });
  });

  describe('getThereAreUncommittedChanges', () => {
    it('should detect uncommitted changes', async () => {
      status.mockReturnValue({ staged: ['file1'], modified: [], not_added: [] });

      const { getThereAreUncommittedChanges } = await import('../git');
      const hasChanges = await getThereAreUncommittedChanges();

      expect(hasChanges).toBe(true);
    });

    it('should return false if no uncommitted changes', async () => {
      status.mockReturnValue({
        staged: [],
        modified: [],
        not_added: []
      });

      const { getThereAreUncommittedChanges } = await import('../git');
      const hasChanges = await getThereAreUncommittedChanges();

      expect(hasChanges).toBe(false);
    });
  });
});
