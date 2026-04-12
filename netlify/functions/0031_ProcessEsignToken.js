/**
 * File : 0031_ProcessEsignToken.js
 *
 * This file is used to process the response from the webhook handler after
 * the ETSS payment has been completed. Instead of reusing the 0012_update_stripe_payments
 * we are using a new handler, to process the data safely and securely.
 *
 * Must have feature flags enabled
 */
import dayjs from "dayjs";

import { Constants } from "./utils/constants";
import { initializeFirebase, populateCorsHeaders } from "./utils/utils";

const isDevEnv = process.env.DEV_ENV === "true";
const AdminAuthorizedKey = process.env.ADMIN_KEY;
const IntegrationKey = process.env.INTEGRATION_KEY;

export const handler = async (event) => {
  if (!isDevEnv && event.queryStringParameters?.key !== AdminAuthorizedKey) {
    console.debug(Constants.MethodNotAuthorized);
    return {
      statusCode: 401,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: Constants.MethodNotAuthorized,
    };
  }

  try {
    const data = JSON.parse(event.body);
    console.debug(Constants.StripeETSSCollectionInit);

    const db = initializeFirebase(isDevEnv);
    const docRef = db
      .collection("etssPayments")
      .doc(data?.stripePaymentIntentID);

    await docRef.set(data, { merge: true });

    console.debug(Constants.ARPSMetadataFoundMessage);
    processEmailService(data);

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ message: Constants.SuccessResponse }),
    };
  } catch (err) {
    console.debug(Constants.StripeFailedToCreateETSSSession, err);
    return {
      statusCode: 400,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        error: Constants.StripeFailedToCreateETSSSession,
        errorDetails: err.message,
      }),
    };
  }
};

// processEmailService ...
// defines a function that is used to process data to the email service
const processEmailService = async (data) => {
  const generatedMsg = generateMessageBody(
    data?.derievedPurchaseCost,
    data?.status,
  );

  const response = await fetch(
    `${process.env.SITE_URL}/.netlify/functions/0001_send_email_fn`,
    {
      method: "POST",
      headers: {
        ...populateCorsHeaders(),
        "x-api-key": IntegrationKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: data?.stripeCustomerEmail,
        subject: "Notification of payment attached",
        text: generatedMsg,
      }),
    },
  );

  if (!response.ok) {
    console.debug(
      "unable to send email notification from stripe webhook handler.",
    );
    // eat the exception
    return;
  }
};

// generateMessageBody ...
// defines a function that is used to generate message body text for ETSS handler
const generateMessageBody = (amount, status) => {
  const draftMessage = `
Dear customer,

Attached is your notification of payment.

  Payment Date: ${dayjs().format("DD-MM-YYYY")}
  Payment Amount: $${amount}

  Current payment status: ${status}

  Thank you,

This is an auto-generated email. Please do not reply to this email.
  `;

  return draftMessage;
};
