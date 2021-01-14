import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
import { headers } from "../lambda-helpers";
import AWS from "aws-sdk";
import { v4 } from "uuid";

const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
const dynamo = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { graph, url } = JSON.parse(event.body);
  if (!graph) {
    return {
      statusCode: 400,
      body: JSON.stringify("Roam Graph is required"),
      headers,
    };
  }

  /*
  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify("Target URL is required"),
      headers,
    };
  }
  */

  await dynamo
    .putItem({
      TableName: "RoamJSWebsiteStatuses",
      Item: {
        uuid: {
          S: v4(),
        },
        action_graph: {
          S: `launch_${graph}`,
        },
        date: {
          S: new Date().toJSON(),
        },
        status: {
          S: "INITIALIZING",
        },
      },
    })
    .promise();

  const website = { graph, url };
  await axios.put(
    `${process.env.FLOSS_API_URL}/auth-user-metadata`,
    { website },
    {
      headers: { Authorization: event.headers.Authorization },
    }
  );

  await lambda
    .invoke({
      FunctionName: "RoamJS_launch",
      InvocationType: 'Event',
      Payload: JSON.stringify({
        roamGraph: graph,
      }),
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify(website),
    headers,
  };
};