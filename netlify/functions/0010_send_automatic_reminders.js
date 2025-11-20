/**
 * File : 0010_send_automatic_reminders.js
 *
 * This file is used to send automatic reminders via email
 * using Automatic Payment Reminder System (ARPS). Uses admin
 * rights and privilidges. Requires .env variables to properly
 * processed in the system.
 *
 * Must have feature flags enabled for this feature.
 */
import dayjs from "dayjs";

import { populateCorsHeaders } from "./utils/utils";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let db;
const isLocalDevTestEnv = process.env.DEV_ENV === "true";
const AdminAuthorizedKey = process.env.ADMIN_KEY;

const standardReminderSettings = {
  GENERAL: [7, 3, 1, 0],
};

/**
 * handler fn ...
 *
 * used to send ARPS (Automatic Payment Reminder System) alert messages if
 * tenant has not paid the upcomming month's rent. Follows default reminder settings.
 *
 * @param {Object} event - the event payload to be processed.
 */
export const handler = async (event) => {
  if (
    !isLocalDevTestEnv &&
    event.queryStringParameters?.key !== AdminAuthorizedKey
  ) {
    console.error("problem fetching required token");
    return { statusCode: 401, body: "Unauthorized" };
  }

  try {
    const today = dayjs();
    const emailPromises = [];
    const reminders = standardReminderSettings.GENERAL;

    initializeFirebase();

    // Fetch all active tenants
    const tenantSnapshots = await db
      .collection("tenants")
      .where("isActive", "==", true)
      .get();

    for (const tenantDocs of tenantSnapshots.docs) {
      const tenant = tenantDocs.data();
      const { propertyId, start_date, email } = tenant;

      const upcommingDueDate = dayjs().date(dayjs(start_date).date());
      const diffDays = upcommingDueDate.diff(today, "day");

      // doubles down as validation
      const propertyDetails = await fetchPropertyDetails(propertyId, email);

      const propertyRent =
        Number(propertyDetails?.rent || 0) +
        Number(propertyDetails?.additional_rent || 0);

      const rentRecordExists = await rentRecordExistsFn(
        propertyId,
        upcommingDueDate.format("MMMM"),
      );

      if (rentRecordExists) {
        // do nth; rent is paid
        continue;
      }

      let subject, text;
      if (reminders.includes(diffDays)) {
        // rent is due; send payment reminder emails
        subject = `Rent Reminder: Due in ${diffDays} day(s)`;
        text = `Hi ${email}, your rent of $${propertyRent.toFixed(2)} is due on ${upcommingDueDate.format("MMMM D, YYYY")}.`;
      } else if (diffDays < 0) {
        // -ve diff days means its past due; send overdue reminder emails
        subject = `Rent Reminder: Overdue by ${Math.abs(diffDays)} day(s)`;
        text = `Hi ${email}, your rent of $${propertyRent.toFixed(2)} was due on ${upcommingDueDate.format("MMMM D, YYYY")}. Please pay as soon as possible. As directed in our contract, a one time initial late fee of $${Number(tenant?.initial_late_fee || 0).toFixed(2)} will be automatically applied and daily late fee of $${Number(tenant?.daily_late_fee || 0).toFixed(2)} will be applied every day thereafter.`;
      }

      if (subject && text) {
        emailPromises.push(
          fetch(
            `${process.env.SITE_URL}/.netlify/functions/0001_send_email_fn`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: email,
                subject,
                text,
              }),
            },
          ),
        );
      }
    }

    // Wait for all emails to be sent
    const results = await Promise.allSettled(emailPromises);

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`Email ${index} sent successfully`, result.value);
      } else {
        console.error(`Email ${index} failed`, result.reason);
      }
    });

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: `Processed ${tenantSnapshots.size} tenants, sent ${emailPromises.length} reminders.\n`,
    };
  } catch (error) {
    console.error("Error sending reminders:", error);
    return {
      statusCode: 500,
      headers: populateCorsHeaders(),
      body: `Error: ${error.message}`,
    };
  }
};

/**
 * initializeFirebase ...
 *
 * utility function used to init the db based on the user
 * feature flags. Uses service account in conjunction.
 */
const initializeFirebase = () => {
  if (!admin.apps.length) {
    if (isLocalDevTestEnv) {
      console.log("Running in DEV_ENV");
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

  db = admin.firestore();
};

/**
 * fetchPropertyDetails ...
 *
 * used to return property details for matching properties
 * and where tenants are still active. re-enforce validation.
 * Tenant must be a rentee within the selected property.
 *
 * @param {string} propertyId - the unique id of the property
 * @param {string} activeTenantEmail - the tenant email that is currently renting
 * @returns {Promise<Object>} propertyData - the data matching the selected params
 *
 */
const fetchPropertyDetails = async (propertyId, activeTenantEmail) => {
  const propertySnapshot = await db
    .collection("properties")
    .where("isDeleted", "==", false)
    .where("id", "==", propertyId)
    .where("rentees", "array-contains", activeTenantEmail)
    .limit(1)
    .get();

  const propertyDoc = propertySnapshot.docs[0];
  if (!propertyDoc) {
    console.error(
      "problem retrieving selected property. unable to send automatic emails with required property details",
    );
    throw new Error("unable to find selected property");
  }
  return propertyDoc.data();
};

/**
 * rentRecordExistsFn ...
 *
 * return boolean if rent record exists
 *
 * @param {string} propertyId - the unique id of the property
 * @returns {Promise<boolean>} true / false - true if rent is paid
 *
 */
const rentRecordExistsFn = async (propertyId, nextMonthStr) => {
  const rentSnapshot = await db
    .collection("rents")
    .where("propertyId", "==", propertyId)
    .where("rentMonth", "==", nextMonthStr)
    .get();

  if (rentSnapshot.empty) return false;

  const rentData = rentSnapshot.docs[0].data();
  if (rentData && ["paid", "manual"].includes(rentData.status)) {
    return true;
  }
  return false;
};
