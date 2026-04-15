/**
 * File : 0030_PurchaseEsignToken.js
 *
 * This file is used to purchase token for electronic signature application. The created tokens
 * are non refundable and are used only for electronic signatures.
 *
 * Must have feature flags enabled
 */
import { Constants } from "./utils/constants";
import {
  ETSSEventType,
  EsignTokenPriceInCreditLabelMap,
  EsignTokenPriceMap,
  populateCorsHeaders,
  validateRequest,
} from "./utils/utils";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION,
});

export const handler = async (event) => {
  const isValidRequest = validateRequest(event.headers["x-api-key"]);
  if (!isValidRequest) {
    console.debug(Constants.MethodNotAuthorized);
    return {
      statusCode: 400,
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
    const { userId, email, label, value } = JSON.parse(event.body);

    if (
      !userId ||
      !email ||
      !label ||
      !Object.keys(EsignTokenPriceMap).includes(value)
    ) {
      console.debug(Constants.MethodNotAuthorized);
      return {
        statusCode: 401,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MethodNotAuthorized }),
      };
    }

    const derievedPurchaseCost = EsignTokenPriceMap[value];
    const derievedPurchaseTokens = EsignTokenPriceInCreditLabelMap[value];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Purchase Credit for Electronic Signature",
            },
            unit_amount: derievedPurchaseCost * 100, // in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: email,
      metadata: {
        userId,
        label,
        tokens: derievedPurchaseTokens,
        derievedPurchaseCost, // in dollar amt
        eventType: ETSSEventType,
      },
      success_url:
        process.env.BASE_SERVICE_URL +
        "/esign/documents?success=1" +
        "&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: process.env.BASE_SERVICE_URL + "/esign/documents?refresh=1",
    });

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
