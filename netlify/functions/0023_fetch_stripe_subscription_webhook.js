/**
 * File : 0023_fetch_stripe_subscription_webhook.js
 *
 * This file is used to fetch data from stripe when the event loop
 * is completed in stripe for subscription session. This functionality
 * is used by stripe to support XX event after an activity in stripe has
 * been completed.
 *
 * Must have feature flags enabled for this feature.
 */
import dayjs from "dayjs";

import { Constants } from "./utils/constants";
import {
  RentAppSubscriptionStatusEnumValues,
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
  } catch (err) {
    console.debug("Webhook signature verification failed:", err.message);
    return {
      statusCode: 400,
      headers: populateCorsHeaders(),
      body: `Webhook Error: ${err.message}`,
    };
  }

  // handle subscription charge code associations
  handleSubscriptionChargeCodes(stripeEvent?.type, stripeEvent?.data?.object);

  return {
    statusCode: 200,
    headers: populateCorsHeaders(),
    body: JSON.stringify({ received: true }),
  };
};

// handleSubscriptionChargeCodes ...
// defines a function that is used to handle subscription event
// created subscription identifies as intent to subscribe with payment
const handleSubscriptionChargeCodes = async (type, data) => {
  switch (type) {
    case "customer.subscription.created":
      console.debug(Constants.SubscriptionCreatedSuccessMsg);
      const subscriptionItem = data?.items.data[0];
      updateDb(type, {
        stripeSubscriptionId: data?.id,
        subscriptionAmount: subscriptionItem?.plan?.amount,
        subscriptionStatus:
          RentAppSubscriptionStatusEnumValues.SubscriptionInit,
        stripeInvoiceId: "", // display intent
        stripeCustomerId: data.customer,
        stripeCustomerEmail: "", // display intent
        createdOn: dayjs().toISOString(),
      });
      return;

    case "invoice.payment_succeeded":
      // only webhook that can setup stripe subscription; suggested by Stripe
      console.debug(Constants.SubscriptionPaymentSuccessMsg);
      updateDb(type, {
        stripeSubscriptionId: data?.parent?.subscription_details?.subscription,
        subscriptionAmount: data?.total,
        subscriptionStatus: data?.status,
        stripeInvoiceId: data?.lines?.data[0].invoice, // 1 item per line
        stripeCustomerId: data.customer,
        stripeCustomerEmail: data.customer_email,
        updatedOn: dayjs().toISOString(),
      });
      break;

    // does not send "updatedOn" column to prevent interference with payment_succeeded notification
    case "checkout.session.completed":
      console.debug(Constants.SubscriptionCheckoutSuccessMsg);
      // extra validation for subscription
      if (data.mode === "subscription") {
        const formattedNumber = Number(data?.metadata?.productCost ?? 0) / 100;

        updateDb(type, {
          stripeSubscriptionId: data.subscription,
          subscriptionAmount: formattedNumber,
          subscriptionProductName: data?.metadata?.productName,
          subscriptionStatus: data?.payment_status,
          stripeInvoiceId: data?.invoice,
          stripeCustomerId: data.customer,
          stripeCustomerEmail: data.metadata?.customer_email,
        });
      }
      break;

    case "invoice.payment_failed":
      console.debug(Constants.SubscriptionPaymentErrorMsg);
      updateDb(type, {
        stripeSubscriptionId: invoice.subscription,
        subscriptionStatus:
          RentAppSubscriptionStatusEnumValues.SubscriptionPastDue,
      });
      break;

    default:
      console.debug("Unhandled event:", type);
  }
};

// updateDb ...
// defines a function that updates firestore db
const updateDb = async (type, data) => {
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
    console.error("updateDb error:", err);
    return false;
  }
};
