/**
 * File : 0026_fetch_raspy_solution.js
 *
 * This file is used to send and recieve question and
 * answer to Raspy AI.
 *
 * Must have feature flags enabled
 */
import { Constants } from "./utils/constants";
import {
  GrokModelProps,
  IntentEnumValues,
  PropertyOverviewEnumValue,
} from "./utils/raspy/config";
import {
  RaspyAIDevTestDataset,
  RaspyAIResponseSchemaOriginalArgs,
} from "./utils/raspy/schemaConfig";
import { populateCorsHeaders, validateRequest } from "./utils/utils";
import Groq from "groq-sdk";

const isDevEnv = process.env.DEV_ENV === "true";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const handler = async (event) => {
  const isValidRequest = validateRequest(event.headers["x-api-key"]);
  if (!isValidRequest) {
    console.debug(Constants.MethodNotAuthorized);
    return {
      statusCode: 401,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: Constants.MethodNotAuthorized }),
    };
  }

  if (event.httpMethod !== "POST") {
    console.debug(Constants.MethodNotAllowed);
    return {
      statusCode: 405,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: Constants.MethodNotAllowed }),
    };
  }

  try {
    const {
      email,
      message,
      intent,
      properties = [],
      rents = [],
      tenants = [],
    } = JSON.parse(event.body);

    if (!email || !intent) {
      console.error(Constants.MissingRequiredFields);
      return {
        statusCode: 401,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MethodNotAuthorized }),
      };
    }

    // return fake dataset if dev env is present
    if (isDevEnv) {
      console.debug(Constants.IsDevEnv);
      const selectedResponse = RaspyAIDevTestDataset[intent];

      return {
        statusCode: 200,
        headers: {
          ...populateCorsHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...selectedResponse,
        }),
      };
    }

    // prevent grok token misuse if intent is different then objective
    if (intent === IntentEnumValues.Other) {
      console.debug(Constants.RaspyOtherIntentDetected);
      return {
        statusCode: 200,
        headers: {
          ...populateCorsHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // blanket statement; UI should recheck message
          ...RaspyAIResponseSchemaOriginalArgs,
        }),
      };
    }

    // main schema keys
    const keys = Object.keys(RaspyAIResponseSchemaOriginalArgs);

    const completion = await groq.chat.completions.create({
      model: GrokModelProps.model,
      temperature: GrokModelProps.temperature,
      max_tokens: GrokModelProps.max_tokens,
      response_format: { type: "json_object" },
      messages: [
        // fetch response using the property analysis schema
        GrokModelProps.systemMessages.propertyAnalysis,
        {
          role: "user",
          content: `
          Intent: ${intent}
          User Question: ${message}
          Properties: ${JSON.stringify(properties)}
          Tenants: ${JSON.stringify(tenants)}
          Rents: ${JSON.stringify(rents)}
          
          MUST return JSON matching EXACTLY this structure keys:
          ${JSON.stringify(keys)}
          `,
        },
      ],
    });

    const rawReply = completion.choices[0]?.message?.content || "";
    const rawReplyJson = JSON.parse(rawReply);

    return {
      statusCode: 200,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...rawReplyJson,
      }),
    };
  } catch (err) {
    console.debug(Constants.RaspyErrorMessage, err);
    return {
      statusCode: 500,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: null,
    };
  }
};
