import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { DYNAMODB_TABLE_NAME } from "../const";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import { Stack } from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

export class BackupRegionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create Cognito userpool
    const userPool = new UserPool(this, "userPool", {
      userPoolName: "BackupUserPool",
    });

    const awsSdkCall: AwsSdkCall = {
      service: "DynamoDBStreams",
      action: "listStreams",
      region: Stack.of(this).region,
      physicalResourceId: PhysicalResourceId.of(`${DYNAMODB_TABLE_NAME}ListStreams`),
      parameters: {
        TableName: DYNAMODB_TABLE_NAME,
      },
    };

    const call = new AwsCustomResource(this, `${DYNAMODB_TABLE_NAME}GetTableStreams`, {
      onCreate: awsSdkCall,
      onUpdate: awsSdkCall,
      logRetention: RetentionDays.ONE_DAY,
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ["dynamodb:*"],
          resources: ["*"],
        }),
      ]),
    });
    const userBackupTable = Table.fromTableAttributes(this, DYNAMODB_TABLE_NAME, {
      tableName: DYNAMODB_TABLE_NAME,
      tableStreamArn: call.getResponseField("Streams.0.StreamArn"),
    });

    // Role for lambda
    const role = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
    });

    const onStreamsUpdate = new NodejsFunction(this, "onStreamsUpdate", {
      entry: "lambda/on-streams-update/index.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      role: role,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    onStreamsUpdate.addEventSource(new DynamoEventSource(userBackupTable, { startingPosition: StartingPosition.TRIM_HORIZON }));
  }
}
