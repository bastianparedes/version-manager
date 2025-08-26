import { describe, it, expect, vi, beforeEach } from 'vitest';

const git = {
  branch: vi.fn(),
  status: vi.fn(),
  tag: vi.fn()
};

vi.mock('../variables', () => ({
  git
}));

describe('git helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    git.branch.mockReturnValue({ current: 'develop' });
    git.status.mockReturnValue({ staged: [], modified: [], not_added: [] });
    git.tag.mockReset();
  });

  describe('getBranchData', () => {
    it('should get branch data with develop branch', async () => {
      git.branch.mockReturnValue({ current: 'develop' });

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
      git.branch.mockReturnValue({ current: 'feature/test' });

      const { getBranchData } = await import('../git');
      const result = await getBranchData('main');

      expect(result.name).toBe('main');
      expect(result.isProduction).toBe(true);
      expect(result.isCustom).toBe(false);
    });

    it('should detect custom branch', async () => {
      git.branch.mockReturnValue({ current: 'feature/new-feature' });

      const { getBranchData } = await import('../git');
      const result = await getBranchData(undefined);

      expect(result.isCustom).toBe(true);
      expect(result.isProduction).toBe(false);
      expect(result.isDevelop).toBe(false);
      expect(result.isUat).toBe(false);
    });
  });

  describe('removeLocalTag', () => {
    it('should remove a local tag', async () => {
      const { removeLocalTag } = await import('../git');
      await removeLocalTag('v1.0.0');

      expect(git.tag).toHaveBeenCalledWith(['-d', 'v1.0.0']);
    });
  });

  describe('getThereAreUncommittedChanges', () => {
    it('should detect uncommitted changes', async () => {
      git.status.mockReturnValue({ staged: ['file1'], modified: [], not_added: [] });
      const { getThereAreUncommittedChanges } = await import('../git');
      const hasChanges = await getThereAreUncommittedChanges();

      expect(hasChanges).toBe(true);
    });

    it('should return false if no uncommitted changes', async () => {
      git.status.mockReturnValue({ staged: [], modified: [], not_added: [] });
      const { getThereAreUncommittedChanges } = await import('../git');
      const hasChanges = await getThereAreUncommittedChanges();

      expect(hasChanges).toBe(false);
    });
  });
});
