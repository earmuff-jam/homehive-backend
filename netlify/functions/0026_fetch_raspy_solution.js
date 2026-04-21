/**
 * File : 0026_fetch_raspy_solution.js
 *
 * This file is used to send and recieve question and
 * answer to AI chat Raspy.
 *
 * Must have feature flags enabled
 */
import { Constants } from "./utils/constants";
import { GrokModelProps, IntentEnumValues } from "./utils/raspy/config";
import {
  DefaultRecommendedActionsResponseSchema,
  RaspyAIDevTestDataset,
} from "./utils/raspy/schemaConfig";
import { populateCorsHeaders, validateRequest } from "./utils/utils";
import Groq from "groq-sdk";

const isGroqDevEnv = process.env.GROQ_DEV_ENV === "true";

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
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 401,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MethodNotAuthorized }),
      };
    }

    if (isGroqDevEnv) {
      // return predefined dataset if dev env is present
      console.debug(Constants.RaspyDevEnvDetected);
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
          // empty recommended actions for other intent
          DefaultRecommendedActionsResponseSchema,
        }),
      };
    }

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

Rules:
  - recommendedActions must be array of strings
  - no objects allowed inside array
  - no extra fields
  - always return valid JSON
          `,
        },
      ],
    });

    const rawReply = completion?.choices[0]?.message?.content || "";
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
