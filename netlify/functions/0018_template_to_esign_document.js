/**
 * File : 0018_template_to_esign_document.js
 *
 * Creates a signing request from an uploaded document
 * and returns an editor URL to modify fields before sending.
 */
import { Constants } from "./utils/constants";
import {
  DocumentOnePageSchema,
  DocumentThreePageSchema,
  DocumentTwoPageSchema,
  GoodSignTemplateToEsignUrl,
  populateApiFields,
  populateCorsHeaders,
  populateSignerFields,
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
  if (event.httpMethod !== "POST") {
    console.debug(Constants.MethodNotAllowed);
    return {
      statusCode: 405,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: Constants.MethodNotAllowed }),
    };
  }

  try {
    const EsignAdminKey = process.env.ESIGN_ADMIN_KEY;
    const { uuid, doc_name, userId, additional_senders, fields } = JSON.parse(
      event.body,
    );

    if (!userId || !uuid || !doc_name || Array.isArray(fields)) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 400,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MissingRequiredFields }),
      };
    }

    const generatedFields = populateApiFields(fields, [
      ...DocumentOnePageSchema,
      ...DocumentTwoPageSchema,
      ...DocumentThreePageSchema,
    ]);
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
      webhook: "", // TODO: netlify function that can handle a simple payload
      cc_email: additional_senders,
      smsverify: false,
      send_in_order: false,
      duplicate: false,
      ignore_missing_signers: false,
      fields: Object.values(generatedFields),
      signers: [generatedPropertyOwnerFields, generatedTenantFields],
    };

    const uploadRes = await fetch(GoodSignTemplateToEsignUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${EsignAdminKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(draftPayload),
    });

    const draftText = await uploadRes.text();

    if (!uploadRes.ok) {
      console.debug(
        "failed to convert template to esign document. details ",
        draftText,
      );
      return {
        statusCode: uploadRes.status,
        headers: populateCorsHeaders(),
        body: draftText,
      };
    }

    let signingRequest;
    try {
      console.debug(Constants.ARPSCreateSigningRequestInitializedMessage);
      signingRequest = JSON.parse(rawText);
    } catch {
      console.debug(Constants.EsignParsingDataErrorMessage);
      throw new Error(Constants.EsignParsingDataErrorMessage);
    }

    const signingRequestId = signingRequest?.doc?.uuid;
    console.debug(Constants.EsignCreateSigingRequestMessage, signingRequestId);

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify(signingRequest),
    };
  } catch (err) {
    console.error(
      "failed to convert template to esign document. details ",
      err,
    );
    return {
      statusCode: 500,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};
