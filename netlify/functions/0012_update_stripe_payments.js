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
import dayjs from "dayjs";

import { Constants } from "./utils/constants";
import {
  StripeOnetimePaymentEnumValue,
  initializeFirebase,
  populateCorsHeaders,
} from "./utils/utils";

const isDevEnv = process.env.DEV_ENV === "true";
const IntegrationKey = process.env.INTEGRATION_KEY;

export const handler = async (event) => {
  try {
    // if the "createdBy" column exists, we assume that the webhook request
    // contained metadata which needs to be stored and processed differently.
    // this allows us to have idempotency over rental payments that are marked
    // as complete vs payments that are not fully completed.
    const data = JSON.parse(event.body);
    const containsMetadata = Boolean(data?.createdBy);
    const isOnetimePayment =
      data?.customEventType === StripeOnetimePaymentEnumValue;

    const draftCollection = "rents";
    console.debug(Constants.StripeSelectedCollectionInit);
    if (containsMetadata) {
      console.debug(Constants.StripeUpdateSelectedCollection);
    }

    const db = initializeFirebase(isDevEnv);
    const docRef = db
      .collection(draftCollection)
      .doc(data.stripePaymentIntentID);

    if (isOnetimePayment) {
      console.debug(Constants.StripeOneTimePaymentUpdateDbMsg);
      await docRef.set(data, { merge: true });
    } else {
      console.debug(Constants.StripeRegularRentPaymentUpdateDbMsg);
      await docRef.set(data, { merge: true });
    }

    // send email for payment notification from clients
    if (containsMetadata) {
      console.debug(Constants.ARPSMetadataFoundMessage);
      const subject = "Notification of payment attached.";

      let text = "";
      if (isOnetimePayment) {
        text = `
      Hi there,
      
      Attached is your notification of payment.

      Payment Date: ${dayjs().format("DD-MM-YYYY")}
      Payment Amount: $${data?.rentAmount}

      Current payment status: ${data?.status}

      Thank you,

      This is an auto-generated email. Please do not reply to this email.
      `;
      } else {
        text = `
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
      }

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
        console.debug(
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
    console.debug(Constants.ARPSWebhookHandlerFailed, err);

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
