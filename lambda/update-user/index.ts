import { APIGatewayProxyEvent, APIGatewayEventRequestContext, APIGatewayProxyCallback } from "aws-lambda";
import { CognitoIdentityServiceProvider, DynamoDB } from "aws-sdk";
import { DYNAMODB_TABLE_NAME } from "../../const";

export const handler = async (event: APIGatewayProxyEvent, context: APIGatewayEventRequestContext, callback: APIGatewayProxyCallback) => {
  try {
    console.log(event);
    if (!event.body) {
      return callback("body cannot be null");
    }
    const bodyJson = JSON.parse(event.body);
    const email = bodyJson.email as string;
    if (!email) {
      return callback("email cannot be undefined");
    }
    // Forcibly update user data in Cognito UserPool
    const cognito = new CognitoIdentityServiceProvider();
    const result = await cognito
      .adminUpdateUserAttributes({
        UserPoolId: process.env.USER_POOL_ID as string,
        Username: event.pathParameters?.userId as string,
        UserAttributes: [
          {
            Name: "email_verified",
            Value: "true",
          },
          { Name: "email", Value: email },
        ],
      })
      .promise();

    console.log("update cognito result: ", result);

    // Update user data in DynamoDB
    const db = new DynamoDB.DocumentClient();

    const res = await db
      .update({
        TableName: DYNAMODB_TABLE_NAME,
        Key: {
          userName: event.pathParameters?.userId,
        },
        UpdateExpression: "set email = :e",
        ExpressionAttributeValues: {
          ":e": email,
        },
      })
      .promise();
    console.log(res);
    callback(null, {
      statusCode: 200,
      body: "OK",
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
};
