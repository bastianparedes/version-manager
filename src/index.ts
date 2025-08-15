import { Command } from 'commander';
import { bumpVersion } from './bump-version';

export const program = new Command();

program.name('@bastian-paredes/version-manager').description('Command-line tool to easily bump versions, handle pre-releases, and create Git tags for both monorepos and standalone packages.');

program
  .command('bump-version')
  .description('Bump the package version and create a Git tag')
  .option('--dry-run', 'Simulate the actions without making any changes', false)
  .option('--branch <branch>', 'Name of the branch', undefined)
  .option(
    '--commit-msg-template <template>',
    `Template for commit message and tag name. Available variables:
    {package_name} - name of the package
    {package_version} - version of the package
    Example: {package_name}@{package_version}`
  )
  .option('--ignore-git-changes', 'Ignore uncommitted changes', false)
  .action((options: { dryRun: boolean; branch: string | undefined; commitMsgTemplate: string | undefined; ignoreGitChanges: boolean }) => {
    void bumpVersion(options);
  });

program.parse();
