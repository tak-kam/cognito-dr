import { DynamoDBStreamEvent } from "aws-lambda";

export const handler = async (event: DynamoDBStreamEvent) => {
  try {
    console.log(event);
  } catch (e) {
    console.error(e);
    throw e;
  }
};
