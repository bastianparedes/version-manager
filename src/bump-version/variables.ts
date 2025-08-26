import simpleGit from 'simple-git';
import fs from 'fs/promises';
import { glob } from 'glob';
import path from 'path';
import { type PackageJson } from 'type-fest';

export const git = simpleGit(process.cwd());

const localTagsPromise = (async () => {
  return (await git.tags()).all;
})();
export const getLocalTags = async () => await localTagsPromise;

const remoteTagsPromise = (async () => {
  const tags = await git.listRemote(['--tags', 'origin']);
  const tagList = tags
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line)
    .map((line) => {
      const match = line.match(/refs\/tags\/(.+)$/);
      return match?.[1];
    })
    .filter((line) => line !== undefined)
    .filter(Boolean);
  return tagList;
})();
export const getRemoteTags = async () => await remoteTagsPromise;

const repositoryDataPromise = (async () => {
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
          () => false
        )
      ) {
        packagePaths.add(match);
      }
    }
  }

  const subPkgs = [];
  for (const pkgPath of packagePaths) {
    const pkgJson: PackageJson = JSON.parse(await fs.readFile(path.join(pkgPath, 'package.json'), 'utf-8'));
    subPkgs.push({
      path: pkgPath,
      jsonPath: path.resolve(pkgPath, 'package.json'),
      name: pkgJson.name as string,
      version: pkgJson.version as string,
      isMonoRepo: true
    });
  }

  const rootPkg = {
    path: rootDir,
    jsonPath: rootPkgPath,
    name: rootPkgJson.name as string,
    version: rootPkgJson.version as string,
    isMonoRepo: subPkgs.length > 0
  };

  return {
    allPkgs: [rootPkg, ...subPkgs],
    rootPkg,
    subPkgs,
    isMonoRepo: subPkgs.length > 0
  };
})();
export const getRepositoryData = async () => await repositoryDataPromise;
