import { APIGatewayProxyEvent, APIGatewayEventRequestContext, APIGatewayProxyCallback } from "aws-lambda";

export const handler = async (event: APIGatewayProxyEvent, context: APIGatewayEventRequestContext, callback: APIGatewayProxyCallback) => {
  try {
    console.log(event);
    callback(null, {
      statusCode: 204,
      body: "",
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
};
