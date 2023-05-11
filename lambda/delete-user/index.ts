import { APIGatewayProxyEvent, APIGatewayEventRequestContext, APIGatewayProxyCallback } from "aws-lambda";
import { CognitoIdentityServiceProvider, DynamoDB } from "aws-sdk";
import { DYNAMODB_TABLE_NAME } from "../../const";

export const handler = async (event: APIGatewayProxyEvent, context: APIGatewayEventRequestContext, callback: APIGatewayProxyCallback) => {
  try {
    console.log(event);
    // Forcibly update user data in Cognito UserPool
    const cognito = new CognitoIdentityServiceProvider();
    const result = await cognito
      .adminDeleteUser({
        UserPoolId: process.env.USER_POOL_ID as string,
        Username: event.pathParameters?.userId as string,
      })
      .promise();

    console.log("delete user result: ", result);

    // Delete user data in DynamoDB
    const db = new DynamoDB.DocumentClient();

    await db
      .delete({
        TableName: DYNAMODB_TABLE_NAME,
        Key: {
          userName: event.pathParameters?.userId,
        },
      })
      .promise();

    callback(null, {
      statusCode: 204,
      body: "",
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
};
