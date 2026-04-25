/**
 * File : 0004_FetchStripeAccountStatus.js
 * This file is used to verify a users account status in stripe
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
    const account = await stripe.accounts.retrieve(accountId, {
      expand: ["external_accounts"],
    });

    const status = {
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    };

    const bank = account.external_accounts?.data?.find(
      (acc) => acc.object === "bank_account",
    );

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        status: status,
        bankAccount: bank
          ? {
              stripeAccountHolderLastFour: bank.last4,
              bank_name: bank.bank_name,
              currency: bank.currency,
              stripeAccountType: bank?.account_holder_type,
              stripeAccountHolderName: bank.account_holder_name,
              stripeRoutingNumber: bank.routing_number,
              stripeBankAccountName: bank?.bank_name,
              stripeBankAccountCountry: bank?.country,
              stripeBankAccountCurrencyMode: bank?.currency,
            }
          : null,
      }),
    };
  } catch (error) {
    console.debug("failed to link stripe account. details ", error);
    return {
      statusCode: 400,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: error.message }),
    };
  }
};
