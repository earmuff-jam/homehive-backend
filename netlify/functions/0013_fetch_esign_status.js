/**
 * File : 0013_fetch_esign_status.js
 * This file is used to to check the health of the third party.
 * Must have feature flags enabled for this feature.
 */
import { Constants } from "./utils/constants";
import {
  EsignWorkspaceUrl,
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
    const response = await fetch(EsignWorkspaceUrl, {
      headers: {
        Authorization: AdminKey,
      },
    });

    if (!response.ok) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 500,
        body: JSON.stringify({
          ready: false,
          error: Constants.MissingRequiredFields,
        }),
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({
        ready: true,
        results: data?.results,
      }),
    };
  } catch (err) {
    console.debug("failed to fetch esign status. detials ", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ready: false,
        error: err.message,
      }),
    };
  }
};
