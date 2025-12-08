/**
 * File : 0017_remove_esign_template.js
 *
 * This file is used to remove esign template when the user
 * chooses to do such.
 *
 * Must have feature flags enabled for this feature.
 */
import { EsignTemplatesUrl, populateCorsHeaders } from "./utils/utils";

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
    const { id } = JSON.parse(event.body);

    const response = await fetch(`${EsignTemplatesUrl}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: AdminKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        statusCode: 500,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: "Failed to delete template" }),
      };
    }

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ message: "Template removed" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};
