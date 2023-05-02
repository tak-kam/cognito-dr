import { PostConfirmationTriggerEvent } from "aws-lambda";

export const handler = async (event: PostConfirmationTriggerEvent) => {
  console.log(event);
  return event;
};
