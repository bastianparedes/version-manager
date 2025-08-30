import fs from 'fs/promises';
import { glob } from 'glob';
import path from 'path';
import { type PackageJson } from 'type-fest';
import git from './git';

export const localTagsPromise = git.getLocalTags();
export const getLocalTags = () => localTagsPromise;

const remoteTagsPromise = git.getRemoteTags();
export const getRemoteTags = async () => remoteTagsPromise;

const repositoryDataPromise = (async () => {
  type Pkg = {
    path: string;
    jsonPath: string;
    name: string;
    version: string;
    isMonoRepo: boolean;
  };

  const rootDir = process.cwd();
  const rootPkgPath = path.join(rootDir, 'package.json');
  const rootPkgJson: PackageJson = JSON.parse(await fs.readFile(rootPkgPath, 'utf-8'));
  const workspaces = (rootPkgJson.workspaces || []) as string[];

  const packagePaths = new Set<string>();
  for (const pattern of workspaces) {
    const matches = await glob(pattern, { cwd: rootDir, absolute: true });
    for (const match of matches) {
      if (
        await fs.stat(path.join(match, 'package.json')).then(
          () => true,
          () => false,
        )
      ) {
        packagePaths.add(match);
      }
    }
  }

  const subPkgs: Pkg[] = [];
  for (const pkgPath of packagePaths) {
    const pkgJson: PackageJson = JSON.parse(await fs.readFile(path.join(pkgPath, 'package.json'), 'utf-8'));
    subPkgs.push({
      path: pkgPath,
      jsonPath: path.resolve(pkgPath, 'package.json'),
      name: pkgJson.name as string,
      version: pkgJson.version as string,
      isMonoRepo: true,
    });
  }

  const rootPkg: Pkg = {
    path: rootDir,
    jsonPath: rootPkgPath,
    name: rootPkgJson.name as string,
    version: rootPkgJson.version as string,
    isMonoRepo: subPkgs.length > 0,
  };

  return {
    allPkgs: [rootPkg, ...subPkgs],
    rootPkg,
    subPkgs,
    isMonoRepo: subPkgs.length > 0,
  };
})();
export const getRepositoryData = async () => await repositoryDataPromise;
