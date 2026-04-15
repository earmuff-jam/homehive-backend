// /**
//  * File : 0016_create_esign_template.js
//  * This file is used to create a new esign template for a selected user.
//  * Must have feature flags enabled for this feature.
//  */
// import dayjs from "dayjs";

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
//     const body = JSON.parse(event.body);

//     const { userId, fileName, fileType, fileData } = body;

//     if (!userId || !fileName || !fileType || !fileData) {
//       console.debug(Constants.InvalidRequest);
//       return {
//         statusCode: 400,
//         headers: populateCorsHeaders(),
//         body: JSON.stringify({ error: Constants.InvalidRequest }),
//       };
//     }

//     const response = await fetch(EsignTemplatesUrl, {
//       method: "POST",
//       headers: {
//         Authorization: AdminKey,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         name: fileName,
//         description: fileName,
//         document: fileData.replace(/^data:.*;base64,/, ""),
//         settings: {
//           allow_editing_before_sending: true,
//           attach_pdf_on_finish: true,
//           allow_download: true,
//         },
//       }),
//     });

//     if (!response.ok) {
//       const errorMessage = await response.text();
//       console.debug("failed to create esign template ", errorMessage);

//       return {
//         statusCode: response.status,
//         headers: populateCorsHeaders(),
//         body: errorMessage,
//       };
//     }

//     const result = await response.json();

//     return {
//       statusCode: 200,
//       headers: populateCorsHeaders(),
//       body: JSON.stringify({
//         ...result,
//         createdBy: userId,
//         createdAt: dayjs().toISOString(),
//         updatedBy: userId,
//         updatedAt: dayjs().toISOString(),
//       }),
//     };
//   } catch (err) {
//     console.debug("Unable to create esign template. Error: ", err);
//     return {
//       statusCode: 500,
//       headers: populateCorsHeaders(),
//       body: JSON.stringify({
//         error: err.message,
//       }),
//     };
//   }
// };
