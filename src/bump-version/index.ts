import { getBranchData, getThereAreUncommittedChanges, localTagsPromise } from './git';
import { getPkgToWork, getNewVersion, getReleaseData, setNewVersion } from './pkg';

const bumpVersion = async (options: { dryRun: boolean; branch: string | undefined; commitMsgTemplate: string | undefined; ignoreGitChanges: boolean }) => {
  const thereAreUncommittedChanges = await getThereAreUncommittedChanges();
  if (!options.ignoreGitChanges && thereAreUncommittedChanges) throw new Error('There are uncommitted changes in the repository. Please commit or stash them before proceeding.');
  const pkg = await getPkgToWork();
  const branchData = await getBranchData(options.branch);
  const releaseData = await getReleaseData(branchData);
  const newVersionData = await getNewVersion(pkg, releaseData.releaseType, releaseData.preid, options.commitMsgTemplate);

  if (!options.dryRun) {
    const localTags = await localTagsPromise;
    await setNewVersion(newVersionData.version, newVersionData.tag, pkg, localTags);
  }
  console.log(
    '%s\n%s\n%s',
    `✅ The commit with tag \x1b[93m${newVersionData.tag}\x1b[0m is ready.`,
    `🚀 Now you need to run \x1b[4m\x1b[92mgit push && git push origin ${newVersionData.tag}\x1b[0m to upload them.`,
    '📦 Then, from the tag pipeline, you can publish the package.'
  );
};

export { bumpVersion };
