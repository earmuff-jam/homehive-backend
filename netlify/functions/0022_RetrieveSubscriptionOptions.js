/**
 * File : 0022_RetrieveSubscriptionOptions.js
 *
 * This file is used to retrieve subscription options for RentApp
 *
 * Must have feature flags enabled for this feature.
 */
import { Constants } from "./utils/constants";
import { populateCorsHeaders, validateRequest } from "./utils/utils";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION,
});

// AllowedProductNamesForSubscription ...
// defines an array of titles used to retrieve specific products
const AllowedProductNamesForSubscription = [
  "Monthly Starter Plan",
  "Monthly Professional Plan",
  "Monthly Enterprise Plan",
];

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
    console.debug("retrieving list of subscription plans with recurring theme");
    const prices = await stripe.prices.list({
      active: true,
      type: "recurring",
      expand: ["data.product"],
    });

    const plans = prices.data
      .filter((price) =>
        AllowedProductNamesForSubscription.includes(price.product.name),
      )
      .map((price) => ({
        productId: price.product.id,
        productName: price.product.name,
        description: price.product.description,
        priceId: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring.interval,
      }));

    return {
      statusCode: 200,
      body: JSON.stringify(plans),
    };
  } catch (err) {
    console.debug("Unable to retrieve subscription options. Error: ", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
