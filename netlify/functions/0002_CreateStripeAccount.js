/**
 * File : 0002_CreateStripeAccount.js
 * This file is used to connect to a stripe account.
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
    const { email } = JSON.parse(event.body);
    if (!email) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 401,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MissingRequiredFields }),
      };
    }

    const account = await stripe.accounts.create({
      type: "custom",
      country: "US",
      email,
      capabilities: {
        card_payments: { requested: true }, // credit / debit cards
        transfers: { requested: true },
        us_bank_account_ach_payments: { requested: true }, // ach
      },
    });

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ accountId: account.id }),
    };
  } catch (error) {
    console.debug(Constants.StripeFailedToCreateAccount, error);
    return {
      statusCode: 400,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        error: Constants.StripeFailedToCreateAccount,
        errorDetails: error.message || Constants.UnknownErrorOccured,
      }),
    };
  }
};
