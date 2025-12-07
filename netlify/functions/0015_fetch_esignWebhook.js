/**
 * File : 0015_fetch_esignWebhook.js
 *
 * This file is used to fetch notifications when
 * an action occurs on a signed envelope.
 *
 * Must have feature flags enabled for this feature.
 */
import { initializeFirebase, populateCorsHeaders } from "./utils/utils";

const isDevEnv = process.env.DEV_ENV;
const AdminAuthorizedKey = process.env.ADMIN_KEY;

/**
 * handler fn
 *
 * handler fn to handle the link between stripe and a user
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
    const db = initializeFirebase(isDevEnv);

    const payload = JSON.parse(event.body);

    if (payload.event_type === "signrequest_completed") {
      const signRequestId = payload.signrequest.uuid;
      const signedFileUrl = payload.signrequest.signed_file;
      const tenantEmail = payload.signrequest.signers[0].email;

      console.log("Lease Signed:", signRequestId, tenantEmail, signedFileUrl);

      // update db for this record via admin priv
      console.log("wat - ", db, AdminAuthorizedKey);
    }

    return {
      statusCode: 200,
      body: "ok",
    };
  } catch (err) {
    console.error("Webhook error", err);
    return { statusCode: 500, body: "Webhook failed" };
  }
};
