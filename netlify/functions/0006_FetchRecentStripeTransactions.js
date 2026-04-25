/**
 * File : 0006_FetchRecentStripeTransactions.js
 *
 * This file is used to display recent stripe transactions made by the
 * selected user
 *
 * Must have feature flags enabled for this feature.
 */
import { Constants } from "./utils/constants";
import { populateCorsHeaders, validateRequest } from "./utils/utils";

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
