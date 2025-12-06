/**
 * File : 0014_create_esign_workspace.js
 *
 * This file is used to create workspace for each user.
 *
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
    const AdminKey = process.env.ESIGN_ADMIN_KEY;
    const { workspaceId } = JSON.parse(event.body);
    
    const response = await fetch(EsignWorkspaceUrl, {
      method: "POST",
      headers: {
        Authorization: AdminKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: workspaceId,
      }),
    });

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid Request." }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        workspaceId,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
