import path from 'path';
import { getPackages, Package } from '@manypkg/get-packages';
import prompts from 'prompts';
import { inc, type ReleaseType } from 'semver';
import { remoteTagsPromise, removeLocalTag } from './git';
import { execa } from 'execa';
import { getFilledTemplate } from '../utils/template';

type PkgType = {
  isMonoRepo: boolean;
  path: string;
  jsonPath: string;
  name: string;
  version: string;
};

const formatPkg = (pkg: Package) => ({
  path: pkg.dir,
  jsonPath: path.resolve(pkg.dir, 'package.json'),
  name: pkg.packageJson.name,
  version: pkg.packageJson.version
});

export const getPublishedVersions = async (packageName: string) => {
  try {
    const { stdout } = await execa('npm', ['view', packageName, 'versions', '--json']);
    const versions: string[] = JSON.parse(stdout);
    return versions;
  } catch {
    throw new Error('Failed to fetch the published versions. This may be because the package does not exist on npm, the .npmrc is not configured, or another unknown issue occurred.');
  }
};

export const getPkg = async (name: string) => {
  const { packages } = await getPackages(process.cwd());
  const requiredPkg = packages.find((pkg) => pkg.packageJson.name === name);
  if (!requiredPkg) throw new Error(`package.json not found for project ${name}`);

  return formatPkg(requiredPkg);
};

export const getRepositoryData = async () => {
  const { packages, rootPackage } = await getPackages(process.cwd());
  if (!rootPackage) throw new Error('package.json not found in root');

  const subPkgs = packages.filter((pkg) => pkg.relativeDir !== '.').map((pkg) => formatPkg(pkg));

  const isMonoRepo = subPkgs.length > 0;

  return {
    rootPkg: formatPkg(rootPackage),
    subPkgs,
    isMonoRepo
  };
};

export const getPkgToWork = async () => {
  const repositoryData = await getRepositoryData();
  if (repositoryData.isMonoRepo) {
    const { subPkgName }: { subPkgName: string } = await prompts({
      type: 'select',
      name: 'subPkgName',
      message: 'Choose the package whose version you want to modify:',
      choices: repositoryData.subPkgs.map((pkg) => ({
        title: pkg.name,
        value: pkg.name
      }))
    });
    return {
      ...(await getPkg(subPkgName)),
      isMonoRepo: repositoryData.isMonoRepo
    };
  }
  return {
    ...(await getPkg(repositoryData.rootPkg.name)),
    isMonoRepo: repositoryData.isMonoRepo
  };
};

export const getNewVersion = async (pkg: PkgType, releaseType: ReleaseType, preid: string | undefined, commitMsgTemplate: string | undefined) => {
  const publishedVersions = await getPublishedVersions(pkg.name);
  const remoteTags = await remoteTagsPromise;

  const defaultTemplate = pkg.isMonoRepo ? `{package_name}@{package_version}` : `v{package_version}`;
  const correctedTemplate = commitMsgTemplate || defaultTemplate;

  let newVersion = pkg.version;
  while (true) {
    const calculatedNewVersion = inc(newVersion, releaseType, preid);
    if (!calculatedNewVersion) throw new Error(`New version could not be calculated`);
    newVersion = calculatedNewVersion;
    const tag = getFilledTemplate(correctedTemplate, {
      package_name: pkg.name,
      package_version: newVersion
    });

    const verionIsAlreadyPublished = publishedVersions.includes(newVersion);
    const tagExists = remoteTags.includes(tag);
    if (!tagExists && !verionIsAlreadyPublished)
      return {
        version: newVersion,
        tag
      };
  }
};

export const getReleaseData = async (branch: { isProduction: boolean; isUat: boolean; isDevelop: boolean }) => {
  const { releaseType }: { releaseType: 'major' | 'minor' | 'patch' | 'premajor' | 'preminor' | 'prepatch' } = await prompts({
    type: 'select',
    name: 'releaseType',
    message: 'Which one describes better your changes?',
    choices: [
      { title: 'Your changes are breaking changes', value: branch.isProduction ? 'major' : 'premajor' },
      { title: 'Your changes do not break anything, but they add a new feature', value: branch.isProduction ? 'minor' : 'preminor' },
      { title: 'Your changes do not add a new feature, but they fix something', value: branch.isProduction ? 'patch' : 'prepatch' }
    ]
  });

  const preids = {
    main: undefined,
    uat: 'rc',
    develop: 'beta'
  };

  if (branch.isProduction) return { releaseType, preid: preids.main };
  if (branch.isUat) return { releaseType, preid: preids.uat };
  if (branch.isDevelop) return { releaseType, preid: preids.develop };

  return {
    releaseType,
    preid: 'alpha'
  };
};

export const setNewVersion = async (version: string, tag: string, pkg: PkgType, localTags: string[]) => {
  if (localTags.includes(tag)) {
    await removeLocalTag(tag);
  }
  await execa('npm', ['version', version, '-m', tag], { cwd: pkg.path });
};
