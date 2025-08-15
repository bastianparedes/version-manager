import simpleGit from 'simple-git';

const git = simpleGit(process.cwd());

export const getBranchData = async (initialName: string | undefined) => {
  const branch = await git.branch();
  const name = initialName || branch.current;
  const isProduction = ['main', 'master'].includes(name);
  const isUat = ['uat'].includes(name);
  const isDevelop = ['develop'].includes(name);
  const isCustom = !isProduction && !isUat && !isDevelop;

  return {
    name,
    isProduction,
    isUat,
    isDevelop,
    isCustom
  };
};

export const localTagsPromise = (async () => {
  return (await git.tags()).all;
})();

export const remoteTagsPromise = (async () => {
  const tags = await git.listRemote(['--tags', 'origin']);
  const tagList = tags
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line)
    .map((line) => {
      const match = line.match(/refs\/tags\/(.+)$/);
      return match?.[1];
    })
    .filter(Boolean);
  return tagList;
})();

export const removeLocalTag = async (tag: string) => {
  await git.tag(['-d', tag]);
};

export const getThereAreUncommittedChanges = async () => {
  const status = await git.status();
  const gitHasChanges = status.staged.length > 0 || status.modified.length > 0 || status.not_added.length > 0;
  return gitHasChanges;
};
