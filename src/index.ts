import { Command } from 'commander';
import { bumpVersion } from './bump-version';
import packageJson from '../package.json';

export const program = new Command();

program.name(packageJson.name).description(packageJson.description).version(packageJson.version);

program
  .command('bump-version')
  .description('Bump the package version and create a Git tag')
  .option('--dry-run', 'Simulate the actions without making any changes', false)
  .option('--branch <branch>', 'Name of the branch', undefined)
  .option(
    '--commit-msg-template <template>',
    `Template for commit message and tag name.
    Example: {package_name}@{package_version}
    Available variables:
      {package_name} - name of the package
      {package_version} - version of the package`
  )
  .option('--ignore-git-changes', 'Ignore uncommitted changes', false)
  .action((options: { dryRun: boolean; branch: string | undefined; commitMsgTemplate: string | undefined; ignoreGitChanges: boolean }) => {
    console.log(`Runing \x1b[4m\x1b[92m${packageJson.name}\x1b[0m version \x1b[4m\x1b[92m${packageJson.version}\x1b[0m`);
    void bumpVersion(options);
  });

program.parse();
