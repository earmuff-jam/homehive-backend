/**
 * File : 0006_fetch_stripe_recent_transactions.js
 *
 * This file is used to allow property owners and tenants to view their recent trasactions
 * safely.
 *
 * Must have feature flags enabled for this feature.
 */
import { Constants } from "./utils/constants";
import { validateRequest } from "./utils/utils";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION,
});

/**
 * handler fn
 *
 * handler fn to retrieve recent transaction details from stripe
 *
 * @param {Object} event - The event payload passed
 */
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
};
