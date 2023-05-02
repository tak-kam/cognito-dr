#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MainRegionStack } from "../lib/main-region-stack";

export const MAIN_REGION = "us-east-1";
export const BACKUP_REGION = "us-east-2";

const app = new cdk.App();
new MainRegionStack(app, "MainRegionStack", {
  env: {
    region: MAIN_REGION,
  },
});
