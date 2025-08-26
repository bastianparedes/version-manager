import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

const tags = vi.fn();
const listRemote = vi.fn();
vi.mock('simple-git', () => ({
  default: () => ({
    tags,
    listRemote
  })
}));

const readFile = vi.fn();
const stat = vi.fn();
vi.mock('fs/promises', () => ({
  default: {
    readFile,
    stat
  }
}));

const globMock = vi.fn();
vi.mock('glob', () => ({
  glob: globMock
}));

describe('variables module', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    listRemote.mockResolvedValue(`abc123\trefs/tags/v1.0.0\nxyz789\trefs/tags/v1.0.1\ninvalid-line`);
    tags.mockResolvedValue({ all: ['v1.0.0', 'v1.0.1'] });
    readFile.mockResolvedValue(
      JSON.stringify({
        name: 'root',
        version: '1.0.0',
        workspaces: []
      })
    );
  });

  it('returns local tags', async () => {
    tags.mockResolvedValue({ all: ['v1.0.0', 'v1.0.1'] });
    const { getLocalTags } = await import('../variables');

    const result = await getLocalTags();
    expect(result).toEqual(['v1.0.0', 'v1.0.1']);
    expect(tags).toHaveBeenCalled();
  });

  it('returns remote tags parsed from listRemote', async () => {
    listRemote.mockResolvedValue(`abc123\trefs/tags/v1.0.0\nxyz789\trefs/tags/v1.0.1\ninvalid-line`);
    const { getRemoteTags } = await import('../variables');

    const result = await getRemoteTags();
    expect(result).toEqual(['v1.0.0', 'v1.0.1']);
    expect(listRemote).toHaveBeenCalledWith(['--tags', 'origin']);
  });

  it('returns repository data for single repo (no workspaces)', async () => {
    readFile.mockImplementation((filePath: string) => {
      if (filePath.endsWith('package.json')) {
        return JSON.stringify({
          name: 'root',
          version: '1.0.0'
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
          workspaces: ['packages/*']
        });
      }
      throw new Error('File not found');
    });

    globMock.mockResolvedValue([pkgAPath]);
    stat.mockResolvedValue(true);

    const { getRepositoryData } = await import('../variables');

    const result = await getRepositoryData();
    expect(result.isMonoRepo).toBe(true);
    expect(result.subPkgs).toHaveLength(1);
    expect(result.subPkgs[0]?.name).toBe('pkg-a');
    expect(result.allPkgs).toHaveLength(2);
  });
});
