export type BumpVersionOptions = {
  dryRun: boolean;
  commit: boolean;
  gitCheck: boolean;
  json: boolean;
  push: boolean;
  branch?: string;
  preid?: string;
  commitMsgTemplate?: string;
};
