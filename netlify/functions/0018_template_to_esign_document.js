/**
 * File : 0018_template_to_esign_document.js
 *
 * Creates a signing request from an uploaded document
 * and returns an editor URL to modify fields before sending.
 */
import {
  GoodSignTemplateToEsignUrl,
  populateApiFields,
  populateCorsHeaders,
  populateSignerFields,
} from "./utils/utils";

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
    const WEBHOOK_KEY = process.env.ESIGN_WEBHOOK_KEY;
    const { uuid, doc_name, userId, additional_senders, fields } = JSON.parse(
      event.body,
    );

    if (
      !userId ||
      !uuid ||
      !doc_name ||
      (Array.isArray(fields) && fields.length >= 0)
    ) {
      console.error("Invalid request parameters");
      return {
        statusCode: 400,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: "Invalid request parameters" }),
      };
    }

    const generatedFields = populateApiFields(fields);
    const generatedPropertyOwnerFields = populateSignerFields(
      "Property Owner",
      fields.owner,
      fields.ownerEmail,
    );
    const generatedTenantFields = populateSignerFields(
      "Tenant",
      fields.tenant,
      fields.tenantEmail,
    );

    const draftPayload = {
      uuid: uuid,
      doc_name: doc_name,
      attachment_names_in_order: [],
      metadata: ["placeholder"],
      webhook: "WEBHOOK_KEY",
      cc_email: additional_senders,
      smsverify: false,
      send_in_order: false,
      duplicate: false,
      ignore_missing_signers: false,
      fields: Object.values(generatedFields),
      signers: [generatedPropertyOwnerFields, generatedTenantFields],
    };

    console.log(draftPayload);

    const uploadRes = await fetch(GoodSignTemplateToEsignUrl, {
      method: "POST",
      // headers: {
      //   Authorization: API_KEY,
      //   "Content-Type": "application/json",
      // },
      headers: {
        authorization:
          "Bearer ",
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(draftPayload),
    });

    const rawText = await uploadRes.text();

    if (!uploadRes.ok) {
      console.error("Goodsign error:", rawText);
      return {
        statusCode: uploadRes.status,
        headers: populateCorsHeaders(),
        body: rawText,
      };
    }

    let signingRequest;
    try {
      signingRequest = JSON.parse(rawText);
    } catch {
      throw new Error("Goodsign returned invalid JSON");
    }

    console.log(
      "Created signing request successfully:",
      signingRequest.doc.uuid,
    );

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify(signingRequest),
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
