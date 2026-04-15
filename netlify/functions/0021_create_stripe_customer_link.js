/**
 * File : 0021_create_stripe_customer_link.js
 *
 * This file is used to create stripe customer link for RentApp product.
 * This function allows customers to subscribe with the RentApp product.
 * Subscribers select the price identifer and stripe handles the rest for us.
 *
 * Must have feature flags enabled for this feature.
 */
import { Constants } from "./utils/constants";
import { populateCorsHeaders, validateRequest } from "./utils/utils";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION,
});

// defines a handler function that allows users to create a new customer via
// stripe for subscription services
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
    const {
      email,
      userId,
      productName,
      productCost,
      productPriceId,
      productInterval,
      stripeCustomerId = "",
    } = JSON.parse(event.body);

    if (!email || !userId || !productName || !productCost || !productPriceId) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: Constants.MissingRequiredFields }),
      };
    }

    let customerId = stripeCustomerId;

    if (!customerId) {
      if (!email) {
        console.debug(Constants.StripeCreateCustomerLinkMissingEmailMsg);
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: Constants.StripeCreateCustomerLinkSuccessMsg,
          }),
        };
      }

      const customer = await stripe.customers.create({
        email,
      });

      customerId = customer.id;
      console.debug("Created new customer with id: ", customerId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_types: ["card", "us_bank_account"],
      line_items: [
        {
          price: productPriceId,
          quantity: 1,
        },
      ],
      success_url: process.env.BASE_SERVICE_URL + "/rent/settings?success=1",
      cancel_url: process.env.BASE_SERVICE_URL + "/rent/settings?refresh=1",
      metadata: {
        customer_email: email, // customer_email for stripe metadata
        userId,
        productName,
        productCost,
        productPriceId,
        productInterval: productInterval,
      },
    });

    console.debug("Created session for customer successfully.");
    return {
      statusCode: 200,
      body: JSON.stringify({
        url: session.url,
      }),
    };
  } catch (err) {
    console.debug("Unable to create stripe customer link. Error: ", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
