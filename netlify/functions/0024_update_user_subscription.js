/**
 * File : 0024_update_user_subscription.js
 *
 * This file is used to update firestore as user subscription changes
 * over the course of time. This function is responsible to update user subscription.
 * Must have feature flags enabled for this feature.
 */
import { Constants } from "./utils/constants";
import {
  Role,
  generateSubscriptionMessageNotification,
  initializeFirebase,
  populateCorsHeaders,
  sanitizeApiFields,
} from "./utils/utils";

const isDevEnv = process.env.DEV_ENV === "true";
const IntegrationKey = process.env.INTEGRATION_KEY;

export const handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    // other values can be non-existent
    if (
      !data?.stripeEventType ||
      !data?.stripeCustomerId ||
      !data?.stripeSubscriptionId
    ) {
      console.debug(Constants.MissingRequiredFields);
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
    const shouldPublishEmailNotification = isDevEnv
      ? false
      : ["invoice.payment_failed", "checkout.session.completed"].includes(
          sanitizedSubscriptionData?.stripeEventType,
        );

    const docRef = db
      .collection("subscriptionPayments")
      .doc(sanitizedSubscriptionData.stripeCustomerId);

    await docRef.set(sanitizedSubscriptionData, { merge: true });

    // only update other collections if valid email and db is present
    if (data?.stripeCustomerEmail && data?.updateExtraCollection?.length > 0) {
      const userCollection = data?.updateExtraCollection[0];
      console.debug(
        "Updating extra collections because of relevant changes.",
        userCollection,
      );
      const usersRef = db.collection(userCollection);
      const snapshot = await usersRef
        .where("email", "==", data?.stripeCustomerEmail)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        console.debug(
          "Found existing user with provided email. Updating user access",
        );
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        if (userData.role !== Role.Owner) {
          // update ROLE if user has valid subscription for property
          await userDoc.ref.update({ role: Role.Owner });
          console.debug("Updated existing user with proper user access.");
        }
      }
    }

    if (shouldPublishEmailNotification) {
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
        console.debug(Constants.FailedToSendEmailNotification);
        // eat the exception
        return {
          statusCode: 500,
          headers: {
            ...populateCorsHeaders(),
            "Content-Type": "application/json",
          },
          body: Constants.FailedToSendEmailNotification,
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
