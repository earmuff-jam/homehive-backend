// /**
//  * File : 0017_remove_esign_template.js
//  * This file is used to remove esign template when the user
//  * chooses to do such.
//  * Must have feature flags enabled for this feature.
//  */
// import { Constants } from "./utils/constants";
// import {
//   EsignTemplatesUrl,
//   populateCorsHeaders,
//   validateRequest,
// } from "./utils/utils";

// export const handler = async (event) => {
//   const isValidRequest = validateRequest(event.headers["x-api-key"]);
//   if (!isValidRequest) {
//     console.debug(Constants.MethodNotAuthorized);
//     return {
//       statusCode: 401,
//       headers: populateCorsHeaders(),
//       body: JSON.stringify({ error: Constants.MethodNotAuthorized }),
//     };
//   }

//   if (event.httpMethod !== "POST") {
//     console.debug(Constants.MethodNotAllowed);
//     return {
//       statusCode: 405,
//       headers: populateCorsHeaders(),
//       body: JSON.stringify({ error: Constants.MethodNotAllowed }),
//     };
//   }

//   try {
//     const AdminKey = process.env.ESIGN_ADMIN_KEY;
//     const { id } = JSON.parse(event.body);

//     if (!id) {
//       console.debug(Constants.InvalidRequest);
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ error: Constants.InvalidRequest }),
//       };
//     }

//     const response = await fetch(`${EsignTemplatesUrl}/${id}`, {
//       method: "DELETE",
//       headers: {
//         Authorization: AdminKey,
//         "Content-Type": "application/json",
//       },
//     });

//     if (!response.ok) {
//       console.debug(Constants.InvalidRequest);
//       return {
//         statusCode: 500,
//         headers: populateCorsHeaders(),
//         body: JSON.stringify({ error: Constants.InvalidRequest }),
//       };
//     }

//     return {
//       statusCode: 200,
//       headers: populateCorsHeaders(),
//       body: JSON.stringify({ message: "Template removed" }),
//     };
//   } catch (err) {
//     console.debug("failed to remove esign template. details ", err);
//     return {
//       statusCode: 500,
//       headers: populateCorsHeaders(),
//       body: JSON.stringify({ error: err.message }),
//     };
//   }
// };
