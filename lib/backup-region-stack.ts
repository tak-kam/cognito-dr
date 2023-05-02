import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { Runtime, Function, AssetCode } from "aws-cdk-lib/aws-lambda";
import { UserPool } from "aws-cdk-lib/aws-cognito";

export class BackupRegionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create Cognito userpool
    const userPool = new UserPool(this, "userPool", {
      userPoolName: "BackupUserPool",
    });
  }
}
