/**
 * File : 0013_fetch_esign_status.js
 *
 * This file is used to to check the health of the third party.
 * Must have feature flags enabled for this feature.
 */
import { EsignWorkspaceUrl, populateCorsHeaders } from "./utils/utils";

/**
 * handler fn
 *
 * handler fn to fetch the current status of the esign
 *
 * @param {Object} event - The event payload passed
 */
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: populateCorsHeaders(),
      body: "Method Not Allowed",
    };
  }

  try {
    //  key provided by the server
    const AdminKey = process.env.ESIGN_ADMIN_KEY;
    const response = await fetch(EsignWorkspaceUrl, {
      headers: {
        Authorization: AdminKey,
      },
    });

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          ready: false,
          error: "Invalid key or service unavailable.",
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
    return {
      statusCode: 500,
      body: JSON.stringify({
        ready: false,
        error: err.message,
      }),
    };
  }
};
