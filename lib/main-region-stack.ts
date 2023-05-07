import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CfnGlobalTable } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { UserPool, CfnUserPool } from "aws-cdk-lib/aws-cognito";
import { BACKUP_REGION, MAIN_REGION } from "../bin/cognito-dr";
import { DYNAMODB_TABLE_NAME } from "../const";
import { aws_apigateway } from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

export class MainRegionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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

    // create Role for Lambda
    const postConfirmationLambdaRole = new Role(this, "postConfirmationLambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
    });
    // add Policy for PutItem
    const dynamoDbPutItemPolicy = new Policy(this, "dynamoDbPutItem", {
      statements: [
        new PolicyStatement({
          actions: ["dynamodb:PutItem"],
          resources: [dynamoDbGlobalTable.attrArn],
        }),
      ],
    });
    dynamoDbPutItemPolicy.attachToRole(postConfirmationLambdaRole);

    const updateUserLambdaRole = new Role(this, "updateUserLambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
    });
    // add Policy for PutItem
    const dynamoDbUpdateItemPolicy = new Policy(this, "dynamoDbUpdateItem", {
      statements: [
        new PolicyStatement({
          actions: ["dynamodb:UpdateItem"],
          resources: [dynamoDbGlobalTable.attrArn],
        }),
      ],
    });
    dynamoDbUpdateItemPolicy.attachToRole(updateUserLambdaRole);

    const deleteUserLambdaRole = new Role(this, "deleteUserLambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
    });
    // add Policy for PutItem
    const dynamoDbDeleteItemPolicy = new Policy(this, "dynamoDbDeleteItem", {
      statements: [
        new PolicyStatement({
          actions: ["dynamodb:DeleteItem"],
          resources: [dynamoDbGlobalTable.attrArn],
        }),
      ],
    });
    dynamoDbDeleteItemPolicy.attachToRole(deleteUserLambdaRole);

    // create Lambda for PutItem
    const postConfirmationLambda = new NodejsFunction(this, "postConfirmation", {
      entry: "lambda/post-confirmation/index.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      role: postConfirmationLambdaRole,
      memorySize: 1024,
    });

    // create Lambda for updateUser
    const updateUserLambda = new NodejsFunction(this, "updateUser", {
      entry: "lambda/update-user/index.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      role: updateUserLambdaRole,
    });

    // create Lambda for deleteUser
    const deleteUserLambda = new NodejsFunction(this, "deleteUser", {
      entry: "lambda/delete-user/index.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      role: deleteUserLambdaRole,
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

    const userConfigApi = new RestApi(this, "userConfig");
    const usersResource = userConfigApi.root.addResource("users");
    const updateUserApi = usersResource.addResource("me").addMethod("PUT", new LambdaIntegration(updateUserLambda));
    const deleteUserApi = usersResource
      .addResource("userId")
      .resourceForPath("{userId}")
      .addMethod("DELETE", new LambdaIntegration(deleteUserLambda));
  }
}
