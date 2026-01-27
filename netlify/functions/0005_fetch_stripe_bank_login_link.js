/**
 * File : 0005_fetch_stripe_bank_login_link.js
 * Allows connected Stripe Custom accounts to manage bank info, payouts, etc.
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
      body: JSON.stringify({
        error: Constants.MethodNotAllowed,
      }),
    };
  }

  try {
    const { accountId } = JSON.parse(event.body);
    if (!accountId) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 400,
        headers: populateCorsHeaders(),
        body: JSON.stringify({
          error: Constants.MissingRequiredFields,
        }),
      };
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: process.env.STRIPE_RETURN_URL,
      return_url: process.env.STRIPE_REFRESH_URL,
      type: "account_update",
    });

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ url: accountLink.url }),
    };
  } catch (err) {
    console.debug("Failed to create stripe login link. details ", err);
    return {
      statusCode: 400,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};
