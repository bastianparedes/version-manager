import { execa } from 'execa';

export default {
  add: (filePath: string) => execa('git', ['add', filePath]),
  addAll: () => execa('git', ['add', '.']),
  commit: (message: string) => execa('git', ['commit', '-m', message]),
  push: () => execa('git', ['push']),
  pushTag: (name: string) => execa('git', ['push', 'origin', name]),
  getLocalTags: async () => {
    const { stdout } = await execa('git', ['tag', '--list'], { cwd: process.cwd() });
    return stdout.split('\n').filter(Boolean);
  },
  tag: (tagName: string) => execa('git', ['tag', tagName], { cwd: process.cwd() }),
  removeTag: (tagName: string) => execa('git', ['tag', '-d', tagName]),
  getRemoteTags: async () => {
    const { stdout } = await execa('git', ['ls-remote', '--tags', 'origin']);
    const tagList = stdout
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
  },
  getBranchData: async (initialName: string | undefined) => {
    const { stdout: currentBranch } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD']);

    const name = initialName || currentBranch;
    const isProduction = ['main', 'master', 'release'].includes(name);
    const isUat = ['uat'].includes(name);
    const isDevelop = ['develop'].includes(name);
    const isCustom = !isProduction && !isUat && !isDevelop;

    return {
      name,
      isProduction,
      isUat,
      isDevelop,
      isCustom,
    };
  },

  getThereAreUncommittedChanges: async () => {
    const { stdout } = await execa('git', ['status', '--porcelain']);
    const gitHasChanges = stdout.trim().length > 0;
    return gitHasChanges;
  },
};
