# @bastian-paredes/version-manager

A CLI tool to automatically manage semantic versioning for Node.js packages.  
Designed for Falabella projects, it works with both single packages and monorepos.

## Installation

You can run it directly using `npm exec` or `npx`:

```bash
npm exec @bastian-paredes/version-manager@latest <command>
# or
npx @bastian-paredes/version-manager <command>
````

## Commands

### `bump-version`

Automatically determines the next version and updates the package, commit, and tag accordingly.

#### Usage

```bash
npm exec @bastian-paredes/version-manager@latest bump-version [options]
```

#### Options

* `--dry-run`
  Runs the versioning process without making any changes.

* `--commit-msg-template="<template>"`
  Customize the commit message and tag name.
  Supports placeholders:

  * `{package_name}` – The name of the package
  * `{package_version}` – The new version

  ```bash
  --commit-msg-template="{package_name}@{package_version}"
  ```

* `--preid=<identifier>`
  Specify a pre-release identifier (like `alpha`, `beta`, `rc`).
  If not provided, the script will automatically choose one when needed.

#### Behavior

* Detects if the current directory is a monorepo or a single package.
* Checks the current branch, remote tags, and published versions on NPM.
* Determines the next semantic version and tag based on all the information.
* Stops execution if there are uncommitted changes in the repository.

## Examples

Bump a package version with default behavior:

```bash
npm exec @bastian-paredes/version-manager@latest bump-version
```

Run a dry run to see the changes without applying them:

```bash
npm exec @bastian-paredes/version-manager@latest bump-version --dry-run
```

Bump a package version with a custom commit message:

```bash
npm exec @bastian-paredes/version-manager@latest bump-version --commit-msg-template="{package_name}@{package_version}"
```

Bump a pre-release version with a specific identifier:

```bash
npm exec @bastian-paredes/version-manager@latest bump-version --preid=beta
```
