import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

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
  getThereAreUncommittedChanges: vi.fn(),
};
vi.mock('../git', () => ({
  default: git,
}));

const readFile = vi.fn();
const stat = vi.fn();
vi.mock('fs/promises', () => ({
  default: {
    readFile,
    stat,
  },
}));

const globMock = vi.fn();
vi.mock('glob', () => ({
  glob: globMock,
}));

describe('variables module', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    git.getLocalTags.mockReturnValue(['v1.0.0', 'v1.0.1']);
    git.getRemoteTags.mockReturnValue(['v1.0.0', 'v1.0.1']);
    readFile.mockReturnValue(
      JSON.stringify({
        name: 'root',
        version: '1.0.0',
        workspaces: [],
      }),
    );
  });

  it('returns local tags', async () => {
    git.getLocalTags.mockReturnValue(['v1.0.0', 'v1.0.1']);
    const { getLocalTags } = await import('../variables');

    const result = await getLocalTags();
    expect(result).toEqual(['v1.0.0', 'v1.0.1']);
  });

  it('returns remote tags parsed from listRemote', async () => {
    git.getRemoteTags.mockReturnValue(['v1.0.0', 'v1.0.1']);
    const { getRemoteTags } = await import('../variables');

    const result = await getRemoteTags();
    expect(result).toEqual(['v1.0.0', 'v1.0.1']);
  });

  it('returns repository data for single repo (no workspaces)', async () => {
    readFile.mockImplementation((filePath: string) => {
      if (filePath.endsWith('package.json')) {
        return JSON.stringify({
          name: 'root',
          version: '1.0.0',
        });
      }
      throw new Error('File not found');
    });
    const { getRepositoryData } = await import('../variables');

    const result = await getRepositoryData();
    expect(result.isMonoRepo).toBe(false);
    expect(result.rootPkg.name).toBe('root');
    expect(result.allPkgs).toHaveLength(1);
  });

  it('returns repository data for monorepo (with workspaces)', async () => {
    const rootPath = process.cwd();
    const pkgAPath = path.join(rootPath, 'packages/pkg-a');

    readFile.mockImplementation((filePath: string) => {
      if (filePath.endsWith('package.json')) {
        if (filePath.includes('pkg-a')) {
          return JSON.stringify({ name: 'pkg-a', version: '1.0.1' });
        }
        return JSON.stringify({
          name: 'root',
          version: '1.0.0',
          workspaces: ['packages/*'],
        });
      }
      throw new Error('File not found');
    });

    globMock.mockReturnValue([pkgAPath]);
    stat.mockResolvedValue(true);

    const { getRepositoryData } = await import('../variables');

    const result = await getRepositoryData();
    expect(result.isMonoRepo).toBe(true);
    expect(result.subPkgs).toHaveLength(1);
    expect(result.subPkgs[0]?.name).toBe('pkg-a');
    expect(result.allPkgs).toHaveLength(2);
  });
});
