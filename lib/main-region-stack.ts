import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CfnGlobalTable } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { UserPool, CfnUserPool } from "aws-cdk-lib/aws-cognito";
import { BACKUP_REGION, DYNAMODB_TABLE_NAME, MAIN_REGION } from "../const";
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
      ],
      keySchema: [
        {
          attributeName: "userName",
          keyType: "HASH",
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

    // create Lambda for PutItem
    const postConfirmationLambda = new NodejsFunction(this, "postConfirmation", {
      entry: "lambda/post-confirmation/index.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      role: postConfirmationLambdaRole,
      memorySize: 1024,
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

    // Role for updating user attributes
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
    // add policy for AdminUpdateUserAttributes
    const updateCognitoUserPolicy = new Policy(this, "updateCognitoUserPolicy", {
      statements: [
        new PolicyStatement({
          actions: ["cognito-idp:AdminUpdateUserAttributes"],
          resources: [userPool.userPoolArn],
        }),
      ],
    });
    updateCognitoUserPolicy.attachToRole(updateUserLambdaRole);

    // Role for deleting user attributes
    const deleteUserLambdaRole = new Role(this, "deleteUserLambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
    });
    // add policy for PutItem
    const dynamoDbDeleteItemPolicy = new Policy(this, "dynamoDbDeleteItem", {
      statements: [
        new PolicyStatement({
          actions: ["dynamodb:DeleteItem"],
          resources: [dynamoDbGlobalTable.attrArn],
        }),
      ],
    });
    dynamoDbDeleteItemPolicy.attachToRole(deleteUserLambdaRole);
    // add policy for AdminDeleteUser
    const deleteCognitoUserPolicy = new Policy(this, "deleteCognitoUserPolicy", {
      statements: [
        new PolicyStatement({
          actions: ["cognito-idp:AdminDeleteUser"],
          resources: [userPool.userPoolArn],
        }),
      ],
    });
    deleteCognitoUserPolicy.attachToRole(deleteUserLambdaRole);

    // create Lambda for updateUser
    const updateUserLambda = new NodejsFunction(this, "updateUser", {
      entry: "lambda/update-user/index.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      role: updateUserLambdaRole,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    // create Lambda for deleteUser
    const deleteUserLambda = new NodejsFunction(this, "deleteUser", {
      entry: "lambda/delete-user/index.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      role: deleteUserLambdaRole,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    const userConfigApi = new RestApi(this, "userConfig");
    const usersResource = userConfigApi.root.addResource("users");
    const userIdResource = usersResource.resourceForPath("{userId}");
    userIdResource.addMethod("PUT", new LambdaIntegration(updateUserLambda));
    userIdResource.addMethod("DELETE", new LambdaIntegration(deleteUserLambda));
  }
}
