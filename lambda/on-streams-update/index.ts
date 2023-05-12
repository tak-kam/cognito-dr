import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";

export const handler = async (event: DynamoDBStreamEvent) => {
  try {
    console.log(JSON.stringify(event));
    event.Records.forEach((record) => {
      handleRecord(record);
    });
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
};

const onModify = async (record: DynamoDBRecord) => {
  const userName = record.dynamodb?.NewImage?.userName.S as string;
  const email = record.dynamodb?.NewImage?.email.S as string;
  console.log(`Modify: username=${userName}, email=${email}`);
};

const onRemove = async (record: DynamoDBRecord) => {
  const userName = record.dynamodb?.OldImage?.userName.S as string;
  const email = record.dynamodb?.OldImage?.email.S as string;
  console.log(`Remove: username=${userName}, email=${email}`);
};
