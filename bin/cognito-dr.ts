#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MainRegionStack } from "../lib/main-region-stack";
import { BACKUP_REGION, MAIN_REGION } from "../const";
import { BackupRegionStack } from "../lib/backup-region-stack";

const app = new cdk.App();
new MainRegionStack(app, "MainRegionStack", {
  env: {
    region: MAIN_REGION,
  },
});

new BackupRegionStack(app, "BackupRegionStack", {
  env: {
    region: BACKUP_REGION,
  },
});
