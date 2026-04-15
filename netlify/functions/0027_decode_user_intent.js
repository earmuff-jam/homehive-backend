/**
 * File : 0027_decode_user_intent.js
 *
 * This file is used to decode the user intent so that Raspy
 * does not go off rails
 *
 * Must have feature flags enabled
 */
import { Constants } from "./utils/constants";
import { GrokModelProps, IntentEnumValues } from "./utils/raspy/config";
import {
  pickRandom,
  populateCorsHeaders,
  validateRequest,
} from "./utils/utils";
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
    const { email, message } = JSON.parse(event.body);

    if (!email || !message) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 401,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MethodNotAuthorized }),
      };
    }

    // return fake dataset if dev env is present
    if (isDevEnv) {
      console.debug(Constants.IsDevEnv);
      return {
        statusCode: 200,
        headers: {
          ...populateCorsHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...{ intent: pickRandom(Object.values(IntentEnumValues)) },
        }),
      };
    }

    // decode user intent and return confidence
    const completion = await groq.chat.completions.create({
      model: GrokModelProps.model,
      temperature: GrokModelProps.temperature,
      max_tokens: GrokModelProps.max_tokens,
      response_format: { type: "json_object" },
      messages: [
        GrokModelProps.systemMessages.userIntent,
        {
          role: "user",
          content: `
          User Question: ${message}
          Valid Intents: ${Object.values(IntentEnumValues)}
          Classify user messages for a property management assistant.
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
