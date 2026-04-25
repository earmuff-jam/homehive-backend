/**
 * File : 0028_AddressOnetimePayment.js
 *
 * This file is used to allow the users to create one time payment from
 * the property owner to the tenant.
 *
 * Must have feature flags enabled
 */
import { Constants } from "./utils/constants";
import {
  StripeOnetimePaymentEnumValue,
  generateOnetimePaymentChargeNotification,
  populateCorsHeaders,
  validateRequest,
} from "./utils/utils";
import Stripe from "stripe";

const IntegrationKey = process.env.INTEGRATION_KEY;

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
      propertyId,
      propertyOwnerId,
      stripeOwnerAccountId,
      paymentMethod,
      rentAmount,
      rentMonth,
      status,
      tenantEmail,
      tenantId,
      note,
      createdBy,
      createdOn,
    } = JSON.parse(event.body);

    if (
      !propertyId ||
      !propertyOwnerId ||
      !rentAmount ||
      !rentMonth ||
      !status ||
      !tenantEmail ||
      !tenantId ||
      !note ||
      !paymentMethod ||
      !createdBy ||
      !createdOn ||
      !stripeOwnerAccountId
    ) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 401,
        headers: populateCorsHeaders(),
        body: JSON.stringify({ error: Constants.MissingRequiredFields }),
      };
    }

    console.debug(
      Constants.StripeOneTimePaymentAllowedMethodMsg,
      paymentMethod,
    );

    // creates a session to send charge to the tenant
    // the tenant opens email and pays the amount
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: tenantEmail,
      payment_method_types: [paymentMethod],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "One Time Charge",
              description: note,
            },
            unit_amount: Math.round(Number(rentAmount) * 100),
          },
          quantity: 1,
        },
      ],
      success_url:
        process.env.BASE_SERVICE_URL +
        "/rent/rental?success=1" +
        "&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: process.env.BASE_SERVICE_URL + "/rent/rental?refresh=1",
      metadata: {
        customer_email: tenantEmail,
        tenantId,
        propertyId,
        propertyOwnerId,
        rentMonth,
        createdBy,
        rentAmount,
        note: note, // description of charge
        customEventType: StripeOnetimePaymentEnumValue,
      },
      payment_intent_data: {
        transfer_data: {
          // transfer payment to correct owner
          destination: stripeOwnerAccountId,
        },
      },
    });

    console.debug(Constants.StripeOneTimePaymentMsgSuccess);

    if (session?.url) {
      // send email notification here
      const { subject, text } = generateOnetimePaymentChargeNotification(
        rentAmount,
        session.url,
      );

      const response = await fetch(
        `${process.env.SITE_URL}/.netlify/functions/0001_SendCustomEmail`,
        {
          method: "POST",
          headers: {
            "x-api-key": IntegrationKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: tenantEmail,
            subject,
            text,
          }),
        },
      );

      if (!response.ok) {
        console.debug(Constants.FailedToSendEmailNotification);
        const body = await response.text();
        console.debug("Email fn status:", response.status);
        console.debug("Email fn body:", body);

        return {
          statusCode: 500,
          headers: {
            ...populateCorsHeaders(),
            "Content-Type": "application/json",
          },
          body: Constants.FailedToSendEmailNotification,
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: 200, message: "Ok" }),
    };
  } catch (err) {
    console.debug(Constants.FailedToCreateOnetimePaymentSession, err);
    return {
      statusCode: 500,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
