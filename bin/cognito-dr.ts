#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MainRegionStack } from "../lib/main-region-stack";
import { MAIN_REGION } from "../const";

const app = new cdk.App();
new MainRegionStack(app, "MainRegionStack", {
  env: {
    region: MAIN_REGION,
  },
});
