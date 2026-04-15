// /**
//  * File : 0020_fetch_goodsign_webhook.js
//  *
//  * This file is used to fetch data from good sign when the event loop
//  * is completed in good sign for Esign purposes. This functionality is
//  * used by esign to support XX event after an activity in esign has been completed.
//  * Eg, if a document got signed, or is ready to be signed, then the webhook
//  * should be called by esign to mark the esign complete in the db.
//  *
//  * Must have feature flags enabled for this feature.
//  */
// import dayjs from "dayjs";

// import { Constants } from "./utils/constants";
// import { initializeFirebase } from "./utils/utils";

// const isDevEnv = process.env.DEV_ENV === "true";

// export const handler = async (event) => {
//   try {
//     const payload = JSON.parse(event.body);
//     if (!payload) {
//       console.debug(Constants.EsignMissingPayloadFromWebhookMessage);
//       return;
//     }

//     const { doc } = payload;
//     if (doc) {
//       console.debug(Constants.EsignWebhookReceivedMessage);
//       updateEsignDetails(doc);
//     }

//     return null;
//   } catch (err) {
//     console.debug(Constants.EsignWebhookErrorMessage, err);
//     return null;
//   }
// };

// // updateEsignDetails ...
// // defines a function that updates esign details
// const updateEsignDetails = async (esignDetails) => {
//   if (!esignDetails.uuid || !esignDetails.name || !esignDetails.status) {
//     console.debug(Constants.MissingRequiredFields);
//     throw new Error(Constants.MissingRequiredFields);
//   }

//   const db = initializeFirebase(isDevEnv);
//   const updatedDocumentRef = doc(db, "createdDocuments", esignDetails.uuid);
//   const updatedSigingRequestDetails = {
//     signingRequestId: esignDetails.uuid,
//     signingRequestStatus: esignDetails.status,
//     updatedOn: dayjs(),
//   };

//   console.debug(Constants.ARPSUpdatedEsignRequest);
//   await setDoc(
//     updatedDocumentRef,
//     { updatedSigingRequestDetails },
//     { merge: true },
//   );

//   console.debug("Successfully processed webhook message");
//   return;
// };
