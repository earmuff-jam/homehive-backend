/**
 * File : 0007_create_stripe_checkout_session.js
 *
 * This file is used to allow tenants to perform checkout session.
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
      rentAmount,
      additionalCharges,
      initialLateFee,
      dailyLateFee,
      stripeOwnerAccountId,
      propertyId,
      propertyOwnerId,
      tenantId,
      rentMonth,
      tenantEmail,
    } = JSON.parse(event.body);

    if (
      !rentAmount ||
      !additionalCharges ||
      !initialLateFee ||
      !dailyLateFee ||
      !stripeOwnerAccountId ||
      !propertyId ||
      !propertyOwnerId ||
      !tenantId ||
      !rentMonth ||
      !tenantEmail
    ) {
      console.debug(Constants.MethodNotAuthorized);
      return {
        statusCode: 401,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MethodNotAuthorized }),
      };
    }

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card", "us_bank_account"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Monthly Rent",
              },
              unit_amount: rentAmount,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Additional Charges",
              },
              unit_amount: additionalCharges,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Initial late fee",
              },
              unit_amount: initialLateFee,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Daily late fee",
              },
              unit_amount: dailyLateFee,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: tenantEmail,
        metadata: {
          tenantId,
          propertyId,
          propertyOwnerId,
          rentMonth,
          rentAmount,
          additionalCharges,
          initialLateFee,
          dailyLateFee,
          customer_email: tenantEmail,
        },
        success_url:
          process.env.STRIPE_PAYMENT_SUCCESS_URL +
          "&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: process.env.STRIPE_PAYMENT_FAILURE_URL,
      },
      {
        stripeAccount: stripeOwnerAccountId, // session is created on behalf of the property owner
      },
    );

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ id: session.id, url: session.url }),
    };
  } catch (err) {
    console.debug(Constants.StripeFailedToCreateCheckoutSession, err);
    return {
      statusCode: 400,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        error: Constants.StripeFailedToCreateCheckoutSession,
        errorDetails: err.message,
      }),
    };
  }
};
