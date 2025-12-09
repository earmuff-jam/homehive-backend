/**
 * File : 0018_template_to_esign_document.js
 *
 * Creates a signing request from an uploaded document
 * and returns an editor URL to modify fields before sending.
 */
import { populateCorsHeaders } from "./utils/utils";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    console.error("Method Not Allowed");
    return {
      statusCode: 405,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const API_KEY = process.env.ESIGN_ADMIN_KEY;
    const { fileData, fileName, userId } = JSON.parse(event.body);

    if (!userId || !fileName || !fileData) {
      console.error("Invalid request parameters");
      return {
        statusCode: 400,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: "Invalid request parameters" }),
      };
    }

    const uploadRes = await fetch(
      "https://api.firma.dev/functions/v1/signing-request-api/signing-requests",
      {
        method: "POST",
        headers: {
          Authorization: API_KEY,
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
      },
    );

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error("Upload failed:", text);
      return {
        statusCode: uploadRes.status,
        headers: populateCorsHeaders(),
        body: text,
      };
    }

    const signingRequest = await uploadRes.json();
    console.log("Created signing request successfully:", signingRequest.id);

    const editorRes = await fetch(
      "https://api.firma.dev/functions/v1/signing-request-api/signing-request-editor-session",
      {
        method: "POST",
        headers: {
          Authorization: API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signing_request_id: signingRequest.id,
        }),
      },
    );

    if (!editorRes.ok) {
      const text = await editorRes.text();
      console.error("Editor URL creation failed:", text);
      return {
        statusCode: editorRes.status,
        headers: populateCorsHeaders(),
        body: text,
      };
    }

    const editorSession = await editorRes.json();
    console.log("Generated editor session successfully");

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        signingRequest,
        editorUrl: editorSession.editor_url,
      }),
    };
  } catch (err) {
    console.error("Internal server exception:", err);
    return {
      statusCode: 500,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};
