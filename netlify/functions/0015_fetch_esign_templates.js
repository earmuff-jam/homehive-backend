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
import { GoodSignTemplatesUrl, populateCorsHeaders } from "./utils/utils";

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
    const AdminKey = process.env.ESIGN_ADMIN_KEY;

    const response = await fetch(GoodSignTemplatesUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AdminKey}`,
      },
    });

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid Request." }),
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
    console.error("Unable to fetch templates. Error: ", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
