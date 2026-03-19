/**
 * File : 0028_ARPSLeaseExtensionEmail.js
 *
 * This file is used to send automatic reminders via email
 * using Automatic Payment Reminder System (ARPS). Uses admin
 * rights and privilidges. Requires .env variables to properly
 * processed in the system. System does not validate tenants, hence
 * errors are logged and process is skipped but NO ERROR is caught
 * after db is initialized.
 *
 * Must have feature flags enabled for this feature.
 */
import dayjs from "dayjs";

import { Constants } from "./utils/constants";
import {
  ARPSReminderSettings,
  initializeFirebase,
  populateCorsHeaders,
} from "./utils/utils";

let db;
const isDevEnv = process.env.DEV_ENV === "true";
const AdminAuthorizedKey = process.env.ADMIN_KEY;

export const handler = async (event) => {
  // ARPS validation occurs differently
  if (!isDevEnv && event.queryStringParameters?.key !== AdminAuthorizedKey) {
    console.error(Constants.MethodNotAuthorized);
    return { statusCode: 401, body: Constants.MethodNotAuthorized };
  }

  try {
    const today = dayjs();
    const emailPromises = [];
    const reminders = ARPSReminderSettings.GENERAL;

    db = initializeFirebase(isDevEnv);

    // Fetch all active tenants
    const tenantSnapshots = await db
      .collection("tenants")
      .where("isActive", "==", true)
      .get();

    const totalTenants = tenantSnapshots.size;
    console.debug(
      `Processing ${totalTenants} at ${dayjs()} for email notification via ARPS handler`,
    );

    for (const tenantDocs of tenantSnapshots.docs) {
      const tenant = tenantDocs.data();
      const { propertyId, startDate, email } = tenant;

      if (!propertyId || !startDate || !email) {
        console.debug(Constants.ARPSMissingRequiredFields);
        break; // eat the exception; does not send notification
      }

      // prevents ARPS message if no rent is due
      if (dayjs(startDate).isAfter(dayjs())) {
        console.debug(Constants.ARPSTenantRentNotDue);
        break;
      }

      if (tenant?.isAutoRenewPolicySet) {
        console.debug(Constants.ARPSAutoRenewPolicyFound);
        // TODO :: do things 
      }

      const upcommingDueDate = dayjs().date(dayjs(startDate).date());
      const diffDays = upcommingDueDate.diff(today, "day");

      // doubles down as validation
      const propertyDetails = await fetchPropertyDetails(propertyId, email);

      const propertyRent =
        Number(propertyDetails?.rent || 0) +
        Number(propertyDetails?.additionalRent || 0);

      const rentRecordExists = await rentRecordExistsFn(
        propertyId,
        upcommingDueDate.format("MMMM"),
      );

      if (rentRecordExists) {
        console.debug(Constants.ARPSRentRecordExists);
        continue;
      }

      let subject, text;
      if (reminders.includes(diffDays)) {
        // send reminder on specific days
        console.debug(Constants.ARPSRentDueDetected);

        subject = `Rent Reminder: Due in ${diffDays} day(s)`;
        text = `Hi ${email}, your rent of $${propertyRent.toFixed(2)} is due on ${upcommingDueDate.format("MMMM D, YYYY")}.`;
      } else if (diffDays < 0) {
        // -ve diff days means its past due; send overdue reminder emails
        console.debug(Constants.ARPSRentOverDueDetected);

        subject = `Rent Reminder: Overdue by ${Math.abs(diffDays)} day(s)`;
        text = `
Hi ${email}, 

  Your rent of $${propertyRent.toFixed(2)} was due on ${upcommingDueDate.format("MMMM D, YYYY")}. 
  
  Please ensure payments are made as soon as possible. 
  As directed in our contract, a one time initial late fee of $${Number(tenant?.initialLateFee || 0).toFixed(2)} will be automatically applied and daily late fee of $${Number(tenant?.dailyLateFee || 0).toFixed(2)} will be applied every day thereafter.
  
  This is an auto-generated email. Please do not reply to this email.
  
Thank you,
ARPS Admin Team
Earmuffjam LLC

  `;
      }

      if (subject && text) {
        console.debug(Constants.ARPSEmailServiceRequiredFieldsFound);
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
        console.debug(`Email ${index} sent successfully`, result.value);
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

// fetchPropertyDetails ...
// defines a custom handler function for specific ARPS requests only
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
    console.debug(Constants.ARPSEmailServiceInvalidPropertyFound);
    throw new Error(Constants.ARPSEmailServiceInvalidPropertyFound);
  }
  return propertyDoc.data();
};

// rentRecordExistsFn ...
// defines a function to verify if an existing rent record exists
const rentRecordExistsFn = async (propertyId, nextMonthStr) => {
  const rentSnapshot = await db
    .collection("rents")
    .where("propertyId", "==", propertyId)
    .where("rentMonth", "==", nextMonthStr)
    .orderBy("createdOn", "desc")
    .get();

  if (rentSnapshot.empty) return false;

  const rentData = rentSnapshot.docs[0].data();
  if (
    rentData &&
    [
      Constants.StripePaymentStatusCompleted,
      Constants.StripePaymentStatusManualStatus,
    ].includes(rentData.status)
  ) {
    return true;
  }
  return false;
};
