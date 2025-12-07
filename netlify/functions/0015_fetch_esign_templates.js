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
import { EsignTemplatesUrl, populateCorsHeaders } from "./utils/utils";

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
    const { userId } = JSON.parse(event.body);

    const response = await fetch(EsignTemplatesUrl, {
      method: "GET",
      headers: {
        Authorization: AdminKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid Request." }),
      };
    }

    const { results, pagination } = await response.json();

    console.log(results, pagination);
    const filteredTemplates = results.filter(
      (template) => template.createdBy === userId,
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        templates: filteredTemplates,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
