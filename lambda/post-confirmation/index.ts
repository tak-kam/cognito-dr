import { PostConfirmationTriggerEvent } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { DYNAMODB_TABLE_NAME } from "../../const";

export const handler = async (event: PostConfirmationTriggerEvent) => {
  try {
    // Backup user data to DynamoDB
    const db = new DynamoDB.DocumentClient();
    console.log(event);
    const userName = event.userName;
    const email = event.request.userAttributes.email;
    const res = await db
      .put({
        TableName: DYNAMODB_TABLE_NAME,
        Item: {
          userName,
          email,
        },
      })
      .promise();
    console.log(res.$response);
    return event;
  } catch (e) {
    console.error(e);
    throw e;
  }
};
