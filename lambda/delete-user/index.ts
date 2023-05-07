import { APIGatewayProxyEvent, APIGatewayEventRequestContext, APIGatewayProxyCallback } from "aws-lambda";

export const handler = async (event: APIGatewayProxyEvent, context: APIGatewayEventRequestContext, callback: APIGatewayProxyCallback) => {
  try {
    callback(null, {
      statusCode: 200,
      body: "OK",
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
};
