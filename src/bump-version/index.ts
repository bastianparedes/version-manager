import chalk from 'chalk';
import git from './git';
import { getNewVersion, getPkgToWork, getReleaseData, setNewVersion } from './pkg';
import type { BumpVersionOptions } from './types/options';
import { getLocalTags } from './variables';

const bumpVersion = async (options: BumpVersionOptions) => {
  const thereAreUncommittedChanges = await git.getThereAreUncommittedChanges();
  if (options.gitCheck && thereAreUncommittedChanges) throw new Error('There are uncommitted changes in the repository. Please commit or stash them before proceeding.');
  const pkg = await getPkgToWork();
  const branchData = await git.getBranchData(options.branch);
  const releaseData = await getReleaseData(branchData);
  if (options.preid !== undefined) releaseData.preid = options.preid;
  const newVersionData = await getNewVersion({
    pkg,
    releaseType: releaseData.releaseType,
    preid: releaseData.preid,
    commitMsgTemplate: options.commitMsgTemplate,
  });
  const localTags = await getLocalTags();
  if (!options.dryRun)
    await setNewVersion({
      version: newVersionData.version,
      tag: newVersionData.tag,
      pkg,
      localTags,
      commit: options.commit,
      push: options.push,
    });

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          version: newVersionData.version,
          tag: newVersionData.tag,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (options.commit) {
    console.log(
      `✅ The commit with tag ${chalk.yellow(newVersionData.tag)} is ready.\n` +
        `🚀 Now you need to run ${chalk.underline.green(`git push && git push origin ${newVersionData.tag}`)} to upload them.\n` +
        '📦 Then, from the tag pipeline, you can publish the package.',
    );
  } else {
    console.log(
      'ℹ️ No commit or tag was created (--no-commit enabled).\n' +
        `📦 The version was set to ${chalk.yellow(newVersionData.version)}.\n` +
        '🚀 You can review the changes and commit/tag manually if needed.',
    );
  }
};

export { bumpVersion };
