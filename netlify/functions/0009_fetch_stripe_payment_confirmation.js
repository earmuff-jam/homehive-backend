/**
 * File : 0009_fetch_stripe_payment_confirmation.js
 * This file is used to confirm payments
 * Must have feature flags enabled for this feature.
 */
import { Constants } from "./utils/constants";
import { populateCorsHeaders, validateRequest } from "./utils/utils";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION,
});

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
    const { userId, sessionId, stripeAccountId } = JSON.parse(event.body);

    if (!userId || !sessionId || !stripeAccountId) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 400,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MissingRequiredFields }),
      };
    }

    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      { expand: ["payment_intent"] },
      { stripeAccount: stripeAccountId },
    );

    const paymentIntent = session.payment_intent;

    if (!paymentIntent) {
      console.debug(Constants.MissingPaymentIntentFromStripe);
      return {
        statusCode: 400,
        headers: populateCorsHeaders(),
        body: JSON.stringify({
          error: Constants.MissingPaymentIntentFromStripe,
        }),
      };
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(
      paymentIntent.payment_method,
      { stripeAccount: stripeAccountId },
    );

    let paymentMethodDescription;
    if (paymentMethod.type === "card") {
      paymentMethodDescription = `${paymentMethod.card.brand.toUpperCase()} ${paymentMethod.card.funding.toUpperCase()} CARD`;
    } else if (paymentMethod.type === "us_bank_account") {
      paymentMethodDescription = `US BANK ACCOUNT (${paymentMethod.us_bank_account.bank_name || "Unknown Bank"})`;
    } else {
      paymentMethodDescription = paymentMethod.type.toUpperCase();
    }

    if (
      session?.payment_status === Constants.StripePaymentStatusCompleted ||
      paymentIntent.status === Constants.StripePaymentIntentStatusCompleted
    ) {
      return {
        statusCode: 200,
        headers: populateCorsHeaders(),
        body: JSON.stringify({
          session: session,
          paymentMethod: paymentMethodDescription,
        }),
      };
    }

    if (
      !paymentIntent ||
      paymentIntent.status !== Constants.StripePaymentIntentStatusCompleted
    ) {
      console.debug(Constants.MissingOrInvalidPaymentIntentFromStripe);
      return {
        statusCode: 200,
        headers: populateCorsHeaders(),
        body: JSON.stringify({
          status: paymentIntent?.status || Constants.UnknownErrorOccured,
          message: Constants.MissingOrInvalidPaymentIntentFromStripe,
          session: session,
        }),
      };
    }

    console.debug(Constants.PaymentRecievedYetToProcess);
    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        status: paymentIntent.status,
        paymentMethod: paymentMethodDescription,
        message: Constants.PaymentRecievedYetToProcess,
      }),
    };
  } catch (error) {
    console.debug(Constants.StripeFailedToProcessPaymentConfirmation, error);
    return {
      statusCode: 500,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        error: Constants.StripeFailedToProcessPaymentConfirmation,
        errorDetails: error.message,
      }),
    };
  }
};
