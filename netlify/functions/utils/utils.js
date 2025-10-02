// default allowed uris for header access
const allowOriginUris = process.env.ALLOW_SITE_URIS.split(",").map((uri) =>
  uri.trim(),
);

/**
 * populateCorsHeaders ...
 *
 * function used to populate default cors headers. checks if the allowed
 * origin list contains the passed in origin. Here, origin is the resource from where the api got invoked
 *
 * @param {string} origin
 * @returns Object - default headers with allowed origin
 */
export const populateCorsHeaders = (origin = "") => {
  const isAllowed = allowOriginUris.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};
