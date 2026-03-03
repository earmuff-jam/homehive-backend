/**
 * File : 0024_update_user_subscription.js
 *
 * This file is used to update firestore as user subscription changes
 * over the course of time. This function is responsible to update user subscription.
 * Must have feature flags enabled for this feature.
 */
import { Constants } from "./utils/constants";
import {
  generateSubscriptionMessageNotification,
  initializeFirebase,
  populateCorsHeaders,
  sanitizeApiFields,
} from "./utils/utils";

const isDevEnv = process.env.DEV_ENV;
const AdminAuthorizedKey = process.env.ADMIN_KEY;
const IntegrationKey = process.env.INTEGRATION_KEY;

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
    // other values can be non-existent
    if (
      !data?.stripeEventType ||
      !data?.stripeCustomerId ||
      !data?.stripeSubscriptionId
    ) {
      console.error(Constants.MissingRequiredFields);
      return false;
    }

    const draftSubscriptionData = {
      stripeEventType: data?.stripeEventType,
      stripeSubscriptionId: data?.stripeSubscriptionId,
      subscriptionProductName: data?.subscriptionProductName,
      subscriptionAmount: data?.subscriptionAmount,
      subscriptionStatus: data?.subscriptionStatus,
      stripeInvoiceId: data?.stripeInvoiceId,
      stripeCustomerId: data?.stripeCustomerId,
      stripeCustomerEmail: data?.stripeCustomerEmail,
      createdOn: data?.createdOn, // resembles the time user attempted to checkout
      updatedOn: data?.updatedOn, // resembles the time user bank approved payment
    };

    const sanitizedSubscriptionData = sanitizeApiFields(draftSubscriptionData);

    const db = initializeFirebase(isDevEnv);
    const containsMetadata =
      sanitizedSubscriptionData?.stripeEventType ===
      "checkout.session.completed";

    const docRef = db
      .collection("subscriptionPayments")
      .doc(sanitizedSubscriptionData.stripeCustomerId);

    await docRef.set(sanitizedSubscriptionData, { merge: true });

    if (containsMetadata) {
      // send email notification here
      const { subject, text } = generateSubscriptionMessageNotification(
        sanitizedSubscriptionData?.subscriptionProductName,
        sanitizedSubscriptionData?.subscriptionAmount,
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
            to: sanitizedSubscriptionData?.stripeCustomerEmail,
            subject,
            text,
          }),
        },
      );

      if (!response.ok) {
        console.error(Constants.SubscriptionNotificationFailureErrorMsg);
        // eat the exception
        return {
          statusCode: 500,
          headers: {
            ...populateCorsHeaders(),
            "Content-Type": "application/json",
          },
          body: Constants.SubscriptionNotificationFailureErrorMsg,
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: Constants.SubscriptionNotificationSuccessMsg,
    };
  } catch (err) {
    console.debug(Constants.SubscriptionFailureMessage, err);
    return {
      statusCode: 500,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: Constants.SubscriptionFailureMessage,
    };
  }
};
