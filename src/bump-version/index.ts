import { getBranchData, getThereAreUncommittedChanges } from './git';
import { getPkgToWork, getNewVersion, getReleaseData, setNewVersion } from './pkg';
import { getLocalTags } from './variables';

const bumpVersion = async (options: { dryRun: boolean; branch?: string; commitMsgTemplate?: string; gitCheck: boolean; preid?: string; commit: boolean }) => {
  const thereAreUncommittedChanges = await getThereAreUncommittedChanges();
  if (options.gitCheck && thereAreUncommittedChanges) throw new Error('There are uncommitted changes in the repository. Please commit or stash them before proceeding.');
  const pkg = await getPkgToWork();
  const branchData = await getBranchData(options.branch);
  const releaseData = await getReleaseData(branchData);
  if (options.preid !== undefined) releaseData.preid = options.preid;
  const newVersionData = await getNewVersion(pkg, releaseData.releaseType, releaseData.preid, options.commitMsgTemplate);

  const localTags = await getLocalTags();
  if (!options.dryRun) await setNewVersion(newVersionData.version, newVersionData.tag, pkg, localTags, options.commit);

  if (options.commit)
    console.log(
      '%s\n%s\n%s',
      `✅ The commit with tag \x1b[93m${newVersionData.tag}\x1b[0m is ready.`,
      `🚀 Now you need to run \x1b[4m\x1b[92mgit push && git push origin ${newVersionData.tag}\x1b[0m to upload them.`,
      '📦 Then, from the tag pipeline, you can publish the package.'
    );
  else
    console.log(
      '%s\n%s\n%s',
      `No commit or tag was created (--no-commit enabled).`,
      `📦 The version was set to \x1b[93m${newVersionData.version}\x1b[0m.`,
      `🚀 You can review the changes and commit/tag manually if needed.`
    );
};

export { bumpVersion };
