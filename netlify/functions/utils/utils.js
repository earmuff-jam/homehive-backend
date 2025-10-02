// default allowed uris for header access
const allowOriginUris = process?.env?.ALLOW_SITE_URIS?.split(",").map((uri) =>
  uri.trim(),
);

/**
 * populateCorsHeaders ...
 *
 * function used to populate default cors headers.
 *
 * @returns Object - default headers required
 */
export const populateCorsHeaders = () => {
  return {
    "Access-Control-Allow-Origin": [...allowOriginUris],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};
