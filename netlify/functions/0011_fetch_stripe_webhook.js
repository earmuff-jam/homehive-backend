/**
 * File : 0011_fetch_stripe_webhook.js
 *
 * This file is used to fetch data from stripe when the event loop
 * is completed in stripe. Supports subscription and rental payment from
 * tenant to property owner via the button "Pay Rent" under Tenant view
 * in Rent App
 *
 * Must have feature flags enabled for this feature.
 */
import dayjs from "dayjs";

import { Constants } from "./utils/constants";
import {
  ETSSEventType,
  RentAppSubscriptionStatusEnumValues,
  StripeOnetimePaymentEnumValue,
  StripeWebhookEnumValues,
  populateCorsHeaders,
} from "./utils/utils";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    console.debug(Constants.StripeEventHandlerInit, stripeEvent?.type);
  } catch (err) {
    console.debug(Constants.StripeEventHandlerErrorMsg, err.message);
    return {
      statusCode: 400,
      headers: populateCorsHeaders(),
      body: `Webhook Error: ${err.message}`,
    };
  }

  await handleStripeEventChargeCodes(
    stripeEvent?.type,
    stripeEvent?.data?.object,
  );
  console.debug(Constants.StripeEventHandlerComplete, stripeEvent?.type);

  return {
    statusCode: 200,
    headers: populateCorsHeaders(),
    body: JSON.stringify({ received: true }),
  };
};

// handleStripeEventChargeCodes ...
// defines a function that is used to update stripe payment services
// based on various associations made by stripe payment services.
const handleStripeEventChargeCodes = async (type, data) => {
  switch (type) {
    // Subscription Intents
    case StripeWebhookEnumValues.CustomerSubscriptionCreated: {
      console.debug(Constants.SubscriptionCreatedSuccessMsg);
      const subscriptionItem = data?.items.data[0];
      await processSubscriptionData(type, {
        stripeSubscriptionId: data?.id,
        subscriptionAmount: subscriptionItem?.plan?.amount,
        subscriptionStatus:
          RentAppSubscriptionStatusEnumValues.SubscriptionInit,
        stripeInvoiceId: "", // display intent
        stripeCustomerId: data.customer,
        stripeCustomerEmail: "", // display intent
        createdOn: dayjs().toISOString(),
      });
      break;
    }

    // stripeInvoiceId and stripeCustomerEmail here are not present.
    // this is by stripe design. does not affect structural change
    // for subscription handler. no subscriptionStatus enum value
    // since we retain validity till payment completion
    case StripeWebhookEnumValues.CustomerSubscriptionUpdated: {
      console.debug(Constants.SubscriptionUpdatedSuccessMsg);

      const subsItem = data?.items.data[0];
      const isUserAttemptingToCancelSubscription =
        Boolean(data?.cancel_at) ||
        Boolean(data?.cancel_at_period_end) ||
        Boolean(data?.canceled_at);

      if (isUserAttemptingToCancelSubscription) {
        console.debug(
          "Cancelling subscription per user request at ",
          dayjs().toISOString(),
        );

        await processSubscriptionData(type, {
          stripeSubscriptionId: data?.id,
          subscriptionAmount: subsItem?.plan?.amount,
          subscriptionStatus:
            RentAppSubscriptionStatusEnumValues.SubscriptionCancelled,
          stripeLatestInvoiceId: data?.latest_invoice, // displays the last invoice
          stripeCustomerId: data.customer,
          markedDeletedOn: dayjs().toISOString(),
          updatedOn: dayjs().toISOString(),
        });

        return;
      }

      console.debug(Constants.SubscriptionDetailsUpdatedSuccessMsg);

      await processSubscriptionData(type, {
        stripeSubscriptionId: data?.id,
        subscriptionAmount: data?.plan?.amount,
        stripeCustomerId: data.customer,
        updatedOn: dayjs().toISOString(),
      });

      break;
    }

    // Checkout Session events
    case StripeWebhookEnumValues.CheckoutSessionCompleted:
      if (data?.payment_status !== Constants.StripePaymentStatusCompleted) {
        console.debug(Constants.StripePaymentStatusError);
        return;
      }

      console.debug(Constants.StripeCheckoutSessionCompleted);
      await processVariousCheckoutSessions(type, data);

      break;

    case StripeWebhookEnumValues.CheckoutSessionAsyncPaymentSucceeded:
      console.debug(Constants.StripeCheckoutSessionAsyncPaymentSucceeded);
      await processVariousCheckoutSessions(type, data);

      break;

    case StripeWebhookEnumValues.CheckoutSessionAsyncPaymentFailed:
      console.debug(Constants.StripeCheckoutSessionAsyncPaymentFailed);
      await processVariousCheckoutSessions(type, data);

      break;

    // Invoice intents; after payments workflow
    case StripeWebhookEnumValues.InvoicePaymentSucceeded:
      // only webhook that can setup stripe subscription; suggested by Stripe
      console.debug(Constants.SubscriptionPaymentSuccessMsg);
      await processSubscriptionData(type, {
        stripeSubscriptionId: data?.parent?.subscription_details?.subscription,
        subscriptionAmount: data?.total,
        subscriptionStatus: data?.status,
        stripeInvoiceId: data?.lines?.data[0].invoice, // users can only select monthly plan or yearly plan
        stripeCustomerId: data.customer,
        stripeCustomerEmail: data.customer_email,
        updatedOn: dayjs().toISOString(),
        subscriptionProductId: data?.lines?.data[0].pricing?.price_details?.product,
        updateExtraCollection: ["users"], // server representation of additional tables to update
      });

      break;

    case StripeWebhookEnumValues.InvoicePaymentFailed:
      console.debug(Constants.SubscriptionPaymentErrorMsg);

      await processSubscriptionData(type, {
        stripeCustomerId: data.customer,
        stripeSubscriptionId: data.subscription,
        subscriptionStatus:
          RentAppSubscriptionStatusEnumValues.SubscriptionPastDue,
        updatedOn: dayjs().toISOString(),
      });

      break;

    // Default
    default:
      /* eslint-disable no-console */
      console.debug(Constants.StripeNoMatchingWebhookValue, type);
      break;
  }
};

//  processVariousCheckoutSessions ...
// defines a function that attempts to process various checkout sessions
// used to denote if a handler request is of subscription, ETSS or Rental
// payments type
const processVariousCheckoutSessions = async (type, data) => {
  if (data.mode === "subscription") {
    console.debug(Constants.StripeCheckoutSessionSubscriptionMode);
    const formattedNumber = Number(data?.metadata?.productCost ?? 0) / 100;
    processSubscriptionData(type, {
      stripeSubscriptionId: data.subscription,
      subscriptionAmount: formattedNumber,
      subscriptionProductName: data?.metadata?.productName,
      subscriptionStatus: data?.payment_status,
      stripeInvoiceId: data?.invoice,
      stripeCustomerId: data.customer,
      stripeCustomerEmail: data.metadata?.customer_email,
    });
  } else {
    const isETSSPurchase = data?.metadata?.eventType === ETSSEventType;
    if (isETSSPurchase) {
      console.debug(Constants.StripeCheckoutSessionETSSPaymentMode);
      await processETSSPurchaseData(type, data);
    } else {
      console.debug(Constants.StripeCheckoutSessionRentOrOneTimePaymentMode);
      await processRentalPaymentsData(type, data);
    }
  }
};

// processSubscriptionData ...
// defines a function that is used to process subscription wehbook events
const processSubscriptionData = async (type, data) => {
  if (!data?.stripeCustomerId) {
    console.debug(Constants.MissingRequiredFields);
    return null;
  }

  try {
    const response = await fetch(
      `${process.env.SITE_URL}/.netlify/functions/0024_update_user_subscription`,
      {
        method: "POST",
        headers: {
          ...populateCorsHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, stripeEventType: type }),
      },
    );

    if (!response.ok) {
      console.error("failed to update db.");
      throw new Error(`Failed to update db: ${response.statusText}`);
    }

    return true;
  } catch (err) {
    console.error("processSubscriptionData error:", err);
    return false;
  }
};

// processRentalPaymentsData ...
// defines a function that is used to process rental payment webhook events
const processRentalPaymentsData = async (stripeEventType, data) => {
  if (
    !stripeEventType ||
    typeof data !== "object" ||
    Object.keys(data).length === 0
  ) {
    console.debug(Constants.MissingRequiredFields);
    return null;
  }

  try {
    // handle events with session metadata differently
    if (data?.metadata) {
      const metadata = data?.metadata;
      const {
        propertyId,
        propertyOwnerId,
        customer_email: tenantEmail,
        rentAmount,
        additionalCharges,
        initialLateFee,
        dailyLateFee,
        rentMonth,
        tenantId,
        note,
        customEventType,
      } = metadata;

      const stripePaymentIntentID = data?.payment_intent;
      if (customEventType === StripeOnetimePaymentEnumValue) {
        console.debug(Constants.StripeOneTimePaymentInit, customEventType);
        // demonstrates one time payment made by tenant to property owner
        const draftData = {
          tenantId,
          tenantEmail,
          propertyId,
          propertyOwnerId,
          rentMonth: "-",
          rentAmount: Number(rentAmount),
          stripePaymentIntentID,
          method: "stripe",
          status: data.status,
          paymentMethodType: Object.keys(data.payment_method_options)[0],
          createdBy: tenantId, // tenant is the only one who can pay
          note: note, // description of charge
          createdOn: dayjs().toISOString(),
          updatedBy: tenantId,
          updatedOn: dayjs().toISOString(),
          customEventType,
        };

        console.debug(
          Constants.StripeUpdateDbWithOneTimePaymentEvent,
          process.env.SITE_URL,
        );
        const response = await fetch(
          `${process.env.SITE_URL}/.netlify/functions/0012_update_stripe_payments`,
          {
            method: "POST",
            headers: {
              ...populateCorsHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify(draftData),
          },
        );

        if (!response.ok) {
          console.debug(Constants.StripeOneTimePaymentFailed);
          throw new Error(`Failed to update DB: ${response.statusText}`);
        }

        return true;
      } else {
        console.debug(Constants.StripeRentalPaymentsInit, stripeEventType);
        // demonstrates rental payments made by tenant to property owner
        const draftData = {
          tenantId,
          tenantEmail,
          propertyId,
          propertyOwnerId,
          rentMonth,
          rentAmount: Number(rentAmount),
          additionalCharges: Number(additionalCharges),
          initialLateFee: Number(initialLateFee),
          dailyLateFee: Number(dailyLateFee),
          stripePaymentIntentID,
          method: "stripe",
          status: data.status,
          stripeEventType,
          paymentMethodType: Object.keys(data.payment_method_options)[0],
          createdBy: tenantId, // tenant is the only one who can pay
          createdOn: dayjs().toISOString(),
          updatedBy: tenantId,
          updatedOn: dayjs().toISOString(),
        };

        console.debug(
          Constants.StripeUpdateDbWithRentPaymentEvent,
          process.env.SITE_URL,
        );
        const response = await fetch(
          `${process.env.SITE_URL}/.netlify/functions/0012_update_stripe_payments`,
          {
            method: "POST",
            headers: {
              ...populateCorsHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify(draftData),
          },
        );

        if (!response.ok) {
          console.debug(
            Constants.StripeRentalPaymentsFailed,
            response.statusText,
          );
          throw new Error(`Failed to update DB: ${response.statusText}`);
        }

        return true;
      }
    } else {
      // handle events without session metadata
      const draftData = {
        stripePaymentIntentID: data.id,
        method: "stripe",
        status: data.status,
        amount: data.amount,
        stripeEventType,
        createdOn: dayjs().toISOString(),
        updatedOn: dayjs().toISOString(),
      };
      const response = await fetch(
        `${process.env.SITE_URL}/.netlify/functions/0012_update_stripe_payments`,
        {
          method: "POST",
          headers: {
            ...populateCorsHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(draftData),
        },
      );

      if (!response.ok) {
        console.debug(Constants.FailedToprocessRentalPaymentsDataError);
        throw new Error(
          `${Constants.FailedToprocessRentalPaymentsDataError} Error: ${response.statusText}`,
        );
      }
      return false;
    }
  } catch (err) {
    console.error("processRentalPaymentsData error details:", err.message);
    console.error(Constants.StripeEventHandlerErrorMsg, err);
    return false;
  }
};

// processETSSPurchaseData ...
// defines a function that is used to process ETSS token webhook events
const processETSSPurchaseData = async (stripeEventType, data) => {
  if (
    !stripeEventType ||
    typeof data !== "object" ||
    Object.keys(data).length === 0
  ) {
    console.debug(Constants.MissingRequiredFields);
    return null;
  }

  try {
    if (data?.metadata) {
      const metadata = data?.metadata;
      const { label, tokens, derievedPurchaseCost, userId, eventType } =
        metadata;

      const stripePaymentIntentID = data?.payment_intent;

      const draftData = {
        label,
        tokens,
        derievedPurchaseCost,
        userId,
        method: "stripe",
        status: data.status,
        stripeEventType: eventType,
        stripeCustomerEmail: data?.customer_email,
        stripePaymentIntentID: stripePaymentIntentID,
        paymentMethodType: Object.keys(data.payment_method_options)[0],
        createdBy: userId, // the person who paid for the charge
        note: "Added ETSS token",
        createdOn: dayjs().toISOString(),
        updatedBy: userId,
        updatedOn: dayjs().toISOString(),
        customEventType: eventType,
      };

      // use a different handler fn to properly process
      // ETSS payments
      const response = await fetch(
        `${process.env.SITE_URL}/.netlify/functions/0031_ProcessEsignToken`,
        {
          method: "POST",
          headers: {
            ...populateCorsHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(draftData),
        },
      );

      if (!response.ok) {
        console.error("failed to update db.");
        throw new Error(`Failed to update DB: ${response.statusText}`);
      }

      return true;
    }
  } catch (err) {
    console.error(Constants.StripeEventHandlerErrorMsg, err);
    return false;
  }
};
