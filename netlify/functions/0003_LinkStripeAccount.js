/**
 * File : 0003_LinkStripeAccount.js
 * This file is used to link stripe account to a user.
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
    const { accountId } = JSON.parse(event.body);
    if (!accountId) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 401,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MissingRequiredFields }),
      };
    }
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: process.env.BASE_SERVICE_URL + "/rent/settings?refresh=1",
      return_url: process.env.BASE_SERVICE_URL + "/rent/settings?success=1",
      type: "account_onboarding",
    });

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ url: accountLink.url }),
    };
  } catch (err) {
    console.debug("failed to link stripe account. details ", err);
    return {
      statusCode: 400,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};
