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
  const Authorization = event.headers.Authorization;
  const opts = {
    headers: { Authorization },
  };

  const {
    data: { website },
  } = await axios.get(
    `${process.env.FLOSS_API_URL}/auth-user-metadata?key=website`,
    opts
  );

  const cancelled = await axios
    .get(
      `${process.env.FLOSS_API_URL}/stripe-is-subscribed?product=${encodeURI(
        "RoamJS Site"
      )}`,
      opts
    )
    .then((r) =>
      axios
        .post(
          "stripe-cancel",
          {
            subscriptionId: r.data.subscribedId,
          },
          opts
        )
        .then((r) => r.data.success)
    );
  if (!cancelled) {
    return {
      statusCode: 500,
      body: "Failed to cancel RoamJS Site subscription",
      headers,
    };
  }

  await dynamo
    .putItem({
      TableName: "RoamJSWebsiteStatuses",
      Item: {
        uuid: {
          S: v4(),
        },
        action_graph: {
          S: `launch_${website.graph}`,
        },
        date: {
          S: new Date().toJSON(),
        },
        status: {
          S: "SHUTTING DOWN",
        },
      },
    })
    .promise();

  await axios.put(
    `${process.env.FLOSS_API_URL}/auth-user-metadata`,
    { website: undefined },
    opts
  );

  await lambda
    .invoke({
      FunctionName: "RoamJS_shutdown",
      InvocationType: "Event",
      Payload: JSON.stringify({
        roamGraph: website.graph,
      }),
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify(website),
    headers,
  };
};