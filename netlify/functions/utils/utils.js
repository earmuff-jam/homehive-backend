import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const EsignBaseUrl = "https://api.firma.dev/";
const EsignWorkspaceUri = "functions/v1/signing-request-api/workspaces";

export const EsignWorkspaceUrl = EsignBaseUrl + EsignWorkspaceUri;

/**
 * initializeFirebase ...
 *
 * utility function used to init the db as an admin. Uses service account in conjunction.
 *
 * @returns Object - firebase db with admin priv
 */
export const initializeFirebase = (isDevEnv = false) => {
  if (!admin.apps.length) {
    if (isDevEnv) {
      console.log("Running in developmental instance. ");
      const serviceAccountPath = path.resolve("./dev/account.json");
      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, "utf8"),
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env["FIREBASE_ADMIN_PROJECT_ID"],
          clientEmail: process.env["FIREBASE_ADMIN_CLIENT_EMAIL"],
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(
            /\\n/gm,
            "\n",
          ).replace(/\\\\n/gm, "\n"),
        }),
      });
    }
  }

  return admin.firestore();
};

/**
 * populateCorsHeaders ...
 *
 * function used to populate default cors headers.
 *
 * @returns Object - default headers required
 */
export const populateCorsHeaders = () => {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};
