/**
 * File : 0006_FetchRecentStripeTransactions.js
 *
 * This file is used to display recent stripe transactions for
 * the provided stripe account id
 *
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

  try {
    const { userId, stripeAccountId } = JSON.parse(event.body);

    if (!userId || !stripeAccountId) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 400,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MissingRequiredFields }),
      };
    }

    // fetch recent transactions made on stripe
    const transactions = await stripe.paymentIntents.list(
      {
        limit: 10,
        expand: ["data.payment_method"],
      },
      {
        stripeAccount: stripeAccountId,
      },
    );

    console.debug(Constants.StripeFetchRecentTransactionsInit);
    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        transactions,
      }),
    };
  } catch (error) {
    console.debug(Constants.StripeFailedToFetchRecentTransactions, error);
    return {
      statusCode: 500,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        error: Constants.StripeFailedToFetchRecentTransactions,
        errorDetails: error.message,
      }),
    };
  }
};
