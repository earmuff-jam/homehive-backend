/**
 * File : 0012_update_stripe_payments.js
 *
 * This file is used to update the database with new stripe payment
 * information once the payment has been completed. This is an
 * automatic process that uses the webhook workflow to update
 * the firestore database
 *
 * Must have feature flags enabled for this feature.
 */
import { Constants } from "./utils/constants";
import { initializeFirebase, populateCorsHeaders } from "./utils/utils";

const isDevEnv = process.env.DEV_ENV === "true";
const AdminAuthorizedKey = process.env.ADMIN_KEY;
const IntegrationKey = process.env.INTEGRATION_KEY;

// defines a function used to retrieve rental payments and associated property data.
// also sends email to associated rentees if applicable.
// if the "createdBy" column exists, we assume that the webhook request
// contained metadata which needs to be stored and processed differently.
// this allows us to have idempotency over rental payments that are marked
// as complete vs payments that are not fully completed.
export const handler = async (event) => {
  if (!isDevEnv && event.queryStringParameters?.key !== AdminAuthorizedKey) {
    console.error(Constants.MethodNotAuthorized);
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
    const containsMetadata = Boolean(data?.createdBy);

    let draftCollection = "rentalPayments";
    console.debug(Constants.ARPSRentalPaymentsDbDuringUpdateStripePayment);
    if (containsMetadata) {
      draftCollection = "rents";
      console.debug(Constants.ARPSRentsDbDuringUpdateStripePayment);
    }

    const db = initializeFirebase(isDevEnv);
    const docRef = db
      .collection(draftCollection)
      .doc(data.stripePaymentIntentID);
    await docRef.set(data, { merge: true });

    // send email for payment notification from clients
    if (containsMetadata) {
      console.debug(Constants.ARPSMetadataFoundMessage);
      const subject = "Notification of payment attached.";
      const text = `
      Hi there,
      
      Attached is your notification of payment.

      Rent Month: ${data?.rentMonth}
      Rent Amount: $${data?.rentAmount}
      Additional Charges: $${data?.additionalCharges}
      Initial Late Fee: $${data?.initialLateFee}
      Daily Late Fee: $${data?.dailyLateFee}


      Current payment status: ${data?.status}

      Thank you,

      This is an auto-generated email. Please do not reply to this email.
      `;

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
            to: data?.tenantEmail,
            subject,
            text,
          }),
        },
      );

      if (!response.ok) {
        console.error(
          "unable to send email notification from stripe webhook handler.",
        );
        // eat the exception
        return;
      }
    }
    return {
      statusCode: 200,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ success: true, id: docRef.id }),
    };
  } catch (err) {
    console.error(Constants.ARPSWebhookHandlerFailed, err);
    return {
      statusCode: 500,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: Constants.ARPSWebhookHandlerFailed,
    };
  }
};
