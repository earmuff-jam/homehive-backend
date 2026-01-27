/**
 * File : 0015_fetch_esign_templates.js
 *
 * This file is used to fetch esign templates that are created
 * by the selected user. The backend responds with a list of all templates
 * and we transpose the response to return only the templates created
 * by the selected user.
 *
 * Must have feature flags enabled for this feature.
 */
import { Constants } from "./utils/constants";
import {
  GoodSignTemplatesUrl,
  populateCorsHeaders,
  validateRequest,
} from "./utils/utils";

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

  if (("POST" || "OPTIONS") !== event.httpMethod) {
    console.debug(Constants.MethodNotAllowed);
    return {
      statusCode: 405,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: Constants.MethodNotAllowed }),
    };
  }

  try {
    const AdminKey = process.env.ESIGN_ADMIN_KEY;
    const response = await fetch(GoodSignTemplatesUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AdminKey}`,
      },
    });

    if (!response.ok) {
      console.debug(Constants.InvalidRequest);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: Constants.InvalidRequest }),
      };
    }

    const results = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        templates: results,
      }),
    };
  } catch (err) {
    console.error("failed to fetch esign templates. details ", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
