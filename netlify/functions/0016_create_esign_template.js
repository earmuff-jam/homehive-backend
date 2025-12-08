/**
 * File : 0016_create_esign_template.js
 *
 * This file is used to create a new esign template for a selected user.
 *
 * Must have feature flags enabled for this feature.
 */
import dayjs from "dayjs";

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
    const body = JSON.parse(event.body);

    const { userId, fileName, fileType, fileData } = body;

    if (!userId || !fileName || !fileType || !fileData) {
      return {
        statusCode: 400,
        headers: populateCorsHeaders(),
        body: JSON.stringify({
          error: "Invalid request parameters.",
        }),
      };
    }

    const response = await fetch(EsignTemplatesUrl, {
      method: "POST",
      headers: {
        Authorization: AdminKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: fileName,
        description: fileName,
        document: fileData.replace(/^data:.*;base64,/, ""),
        settings: {
          allow_editing_before_sending: true,
          attach_pdf_on_finish: true,
          allow_download: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Internal Service Exception. Details: ", errorText);

      return {
        statusCode: response.status,
        headers: populateCorsHeaders(),
        body: errorText,
      };
    }

    const result = await response.json();

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        ...result,
        createdBy: userId,
        createdAt: dayjs().toISOString(),
        updatedBy: userId,
        updatedAt: dayjs().toISOString(),
      }),
    };
  } catch (err) {
    console.error("Unable to create esign template. Error: ", err);

    return {
      statusCode: 500,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
};
