// /**
//  * File : 0014_CreateEsignWorkspace.js
//  * This file is used to create workspace for each user.
//  * Must have feature flags enabled for this feature.
//  */
// import { Constants } from "./utils/constants";
// import {
//   EsignWorkspaceUrl,
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

//   if (("POST" || "OPTIONS") !== event.httpMethod) {
//     console.debug(Constants.MethodNotAllowed);
//     return {
//       statusCode: 405,
//       headers: populateCorsHeaders(),
//       body: JSON.stringify({ error: Constants.MethodNotAllowed }),
//     };
//   }

//   try {
//     const AdminKey = process.env.ESIGN_ADMIN_KEY;
//     const { workspaceId } = JSON.parse(event.body);

//     const response = await fetch(EsignWorkspaceUrl, {
//       method: "POST",
//       headers: {
//         Authorization: AdminKey,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         name: workspaceId,
//       }),
//     });

//     if (!response.ok) {
//       console.debug(Constants.InvalidRequest);
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ error: Constants.InvalidRequest }),
//       };
//     }

//     const workspace = await response.json();
//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         message: "Workspace created successfully",
//         workspaceId: workspace.id,
//         name: workspace.name,
//         createdAt: workspace.created_date,
//       }),
//     };
//   } catch (err) {
//     console.debug("failed to create esign workspace. details ", err);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ error: err.message }),
//     };
//   }
// };
