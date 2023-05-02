import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CfnGlobalTable } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { UserPool, CfnUserPool } from "aws-cdk-lib/aws-cognito";
import { BACKUP_REGION, MAIN_REGION } from "../bin/cognito-dr";

export const DYNAMODB_TABLE_NAME = "CognitoBackupTable";

export class MainRegionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const postConfirmationLambda = new NodejsFunction(this, "postConfirmation", {
      entry: "lambda/post-confirmation/index.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
    });

    // create Cognito userpool
    const userPool = new UserPool(this, "userPool", {
      userPoolName: "MainUserPool",
      mfa: cdk.aws_cognito.Mfa.OFF,
      email: cdk.aws_cognito.UserPoolEmail.withCognito(),
      selfSignUpEnabled: true,
      userVerification: {
        emailStyle: cdk.aws_cognito.VerificationEmailStyle.LINK,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      lambdaTriggers: {
        postConfirmation: postConfirmationLambda,
      },
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    userPool.addDomain("mainUserPoolDomain", {
      cognitoDomain: {
        domainPrefix: "cgnt-dr-test-main",
      },
    });

    userPool.addClient("mainClient", {
      generateSecret: true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        callbackUrls: ["http://localhost:3000"],
      },
      authFlows: {
        userPassword: true,
        adminUserPassword: true,
      },
    });

    const cfnUserPool = userPool.node.defaultChild as unknown as CfnUserPool;
    cfnUserPool.userAttributeUpdateSettings = {
      attributesRequireVerificationBeforeUpdate: ["email"],
    };

    // create DynamoDB Global Table
    const dynamoDbGlobalTable = new CfnGlobalTable(this, "userBackupTable", {
      tableName: DYNAMODB_TABLE_NAME,
      attributeDefinitions: [
        {
          attributeName: "userName",
          attributeType: "S",
        },
        {
          attributeName: "email",
          attributeType: "S",
        },
      ],
      keySchema: [
        {
          attributeName: "userName",
          keyType: "HASH",
        },
        {
          attributeName: "email",
          keyType: "RANGE",
        },
      ],
      replicas: [
        {
          region: MAIN_REGION,
        },
        {
          region: BACKUP_REGION,
        },
      ],
      billingMode: "PAY_PER_REQUEST",
      streamSpecification: {
        streamViewType: "NEW_AND_OLD_IMAGES",
      },
      sseSpecification: {
        sseEnabled: true,
      },
    });
  }
}
