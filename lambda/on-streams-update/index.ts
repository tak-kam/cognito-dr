import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import { CognitoIdentityServiceProvider } from "aws-sdk";

export const handler = async (event: DynamoDBStreamEvent) => {
  try {
    console.log(JSON.stringify(event));
    for await (const record of event.Records) {
      await handleRecord(record);
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
};

const handleRecord = async (record: DynamoDBRecord) => {
  switch (record.eventName) {
    case "INSERT":
      await onInsert(record);
      break;
    case "MODIFY":
      await onModify(record);
      break;
    case "REMOVE":
      await onRemove(record);
      break;
    default:
      throw new Error(`Unknown event for event: ${record.eventID}`);
  }
};

const onInsert = async (record: DynamoDBRecord) => {
  const userName = record.dynamodb?.NewImage?.userName.S as string;
  const email = record.dynamodb?.NewImage?.email.S as string;
  console.log(`Insert: username=${userName}, email=${email}`);

  const cognito = new CognitoIdentityServiceProvider();
  const result = await cognito
    .adminCreateUser({
      UserPoolId: process.env.USER_POOL_ID as string,
      Username: userName,
      UserAttributes: [
        {
          Name: "email_verified",
          Value: "true",
        },
        { Name: "email", Value: email },
      ],
    })
    .promise();
  console.log("Create user result: ", result);
};

const onModify = async (record: DynamoDBRecord) => {
  const userName = record.dynamodb?.NewImage?.userName.S as string;
  const email = record.dynamodb?.NewImage?.email.S as string;
  console.log(`Modify: username=${userName}, email=${email}`);

  const cognito = new CognitoIdentityServiceProvider();
  const result = await cognito
    .adminUpdateUserAttributes({
      UserPoolId: process.env.USER_POOL_ID as string,
      Username: userName,
      UserAttributes: [
        {
          Name: "email_verified",
          Value: "true",
        },
        { Name: "email", Value: email },
      ],
    })
    .promise();
  console.log("Update user result: ", result);
};

const onRemove = async (record: DynamoDBRecord) => {
  const userName = record.dynamodb?.OldImage?.userName.S as string;
  const email = record.dynamodb?.OldImage?.email.S as string;
  console.log(`Remove: username=${userName}, email=${email}`);

  const cognito = new CognitoIdentityServiceProvider();
  const result = await cognito
    .adminDeleteUser({
      UserPoolId: process.env.USER_POOL_ID as string,
      Username: userName,
    })
    .promise();
  console.log("Delete user result: ", result);
};
