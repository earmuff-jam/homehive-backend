/**
 * File : 0010_send_automatic_reminders.js
 *
 * This file is used to send automatic reminders via email
 * using Automatic Payment Reminder System (ARPS). Uses admin
 * rights and privilidges.
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
const IntegrationKey = process.env.INTEGRATION_KEY;

export const handler = async (event) => {
  // ARPS validation occurs differently
  const { adminKey, integrationKey } = JSON.parse(event?.body || "{}");

  if (
    !isDevEnv &&
    (adminKey !== AdminAuthorizedKey || integrationKey !== IntegrationKey)
  ) {
    console.debug(Constants.MethodNotAuthorized);
    return { statusCode: 401, body: Constants.MethodNotAuthorized };
  }

  try {
    const today = dayjs();
    const emailPromises = [];
    const reminders = ARPSReminderSettings.RentReminderDays;

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

      // prevent ARPS if tenant is in proration period
      if (dayjs(startDate).isAfter(dayjs())) {
        console.debug(Constants.ARPSTenantProrationPeriodMsg);
        break;
      }

      const upcommingDueDate = dayjs().date(dayjs(startDate).date());
      const diffDays = upcommingDueDate.diff(today, "day");

      // doubles down as validation
      const propertyDetails = await fetchPropertyDetails(propertyId, email);

      // allows to send lease renewal message to client
      if (tenant?.isAutoRenewPolicySet) {
        console.debug(Constants.ARPSTenantAutoRenewPolicyDetected);

        const autoRenewOn = tenant?.autoRenewDays;
        const reminders = ARPSReminderSettings.AutoRenewLeaseReminderDays;
        const updatedReminders = [...reminders, autoRenewOn];
        const shouldSendAutoRenewReminder = updatedReminders.includes(diffDays);

        if (shouldSendAutoRenewReminder) {
          console.debug(Constants.ARPSAutoRenewReminderInit);
          await processEmailService({
            ...propertyDetails,
            ...tenant,
          }).catch((err) => console.debug(Constants.EmailFailedResponse, err));
        }
      }

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
        const rentReminderData = generateRentReminder(
          diffDays,
          upcommingDueDate,
          tenant,
          propertyDetails,
        );
        subject = rentReminderData?.subject;
        text = rentReminderData?.text;
      } else if (diffDays < 0) {
        // -ve diff days means its past due; send overdue reminder emails
        console.debug(Constants.ARPSRentOverDueDetected);
        const rentOverdueReminderData = generateRentOverdueReminder(
          diffDays,
          upcommingDueDate,
          tenant,
          propertyDetails,
        );
        subject = rentOverdueReminderData?.subject;
        text = rentOverdueReminderData?.text;
      }

      if (subject && text) {
        console.debug(Constants.ARPSEmailServiceRequiredFieldsFound);
        emailPromises.push(
          fetch(
            `${process.env.SITE_URL}/.netlify/functions/0001_send_email_fn`,
            {
              method: "POST",
              headers: {
                ...populateCorsHeaders(),
                "x-api-key": IntegrationKey,
                "Content-Type": "application/json",
              },
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
        console.debug(`Email ${index} failed`, result.reason);
      }
    });

    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: `Processed ${totalTenants} tenants, sent ${emailPromises.length} reminders.\n`,
    };
  } catch (error) {
    console.debug("Error sending reminders:", error);
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
// by checking if this current month has been paid off
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
      Constants.StripePaymentIntentStatusCompleted,
    ].includes(rentData.status)
  ) {
    return true;
  }
  return false;
};

// processEmailService ...
// defines a function that is used to process data to the email service
const processEmailService = async (data) => {
  const generatedMsg = generateMessageBody(data);

  const response = await fetch(
    `${process.env.SITE_URL}/.netlify/functions/0001_send_email_fn`,
    {
      method: "POST",
      headers: {
        ...populateCorsHeaders(),
        "x-api-key": IntegrationKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: data?.email,
        subject: "Notice of Expiration and Lease Renewal",
        text: generatedMsg,
      }),
    },
  );

  if (!response.ok) {
    console.debug(
      "unable to send email notification from stripe webhook handler.",
    );
    // eat the exception
    return;
  }
};

// generateMessageBody ...
// defines a function that is used to generate message body text based on the data.
const generateMessageBody = (data) => {
  const unit = data?.term.endsWith("y") ? "year" : "month";
  const leaseEndDate = dayjs(data?.startDate)
    .add(parseInt(data?.term), unit)
    .format("MM-DD-YYYY");

  const responseDeadline = leaseEndDate.add(1, "M").format("MM-DD-YYYY");

  const draftMessage = `
To the current tenants residing at property ${data?.address},

This letter is to inform you that your present rental residence at ${data?.address} is, as you may be aware, 
subject to a lease that is set to expire on ${data?.endDate}.

Please review the following renewal options, as stipulated in your existing lease agreement.

● Semi-Annual Lease:

If you choose to switch to a semi-annual lease, please be advised that the monthly rent will
increase by ${data?.rentIncrement}. This option provides flexibility but comes with a higher
monthly cost.

● One-Year Lease Renewal:

Opting for a one-year lease renewal will result in change of rent to ${Number(data?.rent) + Number(data.rentIncrement)}. 
This fixed-term option offers stability and predictability for the upcoming year.

Please carefully consider the above-mentioned terms and inform us of your decision by ${responseDeadline}. Please contact  
the landlord at ${data?.emergencyContactNumber} or via email ${data?.ownerEmail} for any further queries.

Please be advised that all other terms of your original rental agreement remain in effect.

We value your tenancy and look forward to continuing our positive landlord-tenant
relationship.

Regards,
ARPS Admin on behalf of ${data?.ownerEmail}

This is an auto-generated email. Please do not reply to this email.

`;

  return draftMessage;
};

// generateRentReminder ...
// defines a function that is used to generate message body text for rent reminders
const generateRentReminder = (
  diffDays,
  upcommingDueDate,
  tenant,
  propertyDetails,
) => {
  const propertyRent =
    Number(propertyDetails?.rent || 0) +
    Number(propertyDetails?.additionalRent || 0);

  const subject = `Rent Reminder: Due in ${diffDays} day(s)`;
  const text = `
Hi ${tenant?.email}, 

This email serves as a reminder to let you know that your rent of $${propertyRent.toFixed(2)} is due on ${upcommingDueDate.format("MMMM D, YYYY")}.

Please ensure payments are made as soon as possible.

As directed in our contract, a one time initial late fee of $${Number(tenant?.initialLateFee || 0).toFixed(2)} will be automatically 
applied and daily late fee of $${Number(tenant?.dailyLateFee || 0).toFixed(2)} will be applied every day thereafter if the payment failed to reach us
within the allocated timeframe.

Thank you,
ARPS Admin on behalf of ${propertyDetails?.ownerEmail}

This is an auto-generated email. Please do not reply to this email.

`;

  return {
    subject: subject,
    text: text,
  };
};

// generateRentOverdueReminder ...
// defines a function that is used to generate message body text for rent overdue reminders
const generateRentOverdueReminder = (
  diffDays,
  upcommingDueDate,
  tenant,
  propertyDetails,
) => {
  const propertyRent =
    Number(propertyDetails?.rent || 0) +
    Number(propertyDetails?.additionalRent || 0);

  const subject = `Rent Reminder: Overdue for ${Math.abs(diffDays)} day(s)`;
  const text = `
Hi ${tenant?.email}, 

This email serves as a reminder to let you know that your rent of $${propertyRent.toFixed(2)} was due on ${upcommingDueDate.format("MMMM D, YYYY")}. 

Please ensure payments are made as soon as possible.

As directed in our contract, a one time initial late fee of $${Number(tenant?.initialLateFee || 0).toFixed(2)} will be automatically 
applied and daily late fee of $${Number(tenant?.dailyLateFee || 0).toFixed(2)} will be applied every day thereafter.

Thank you,
ARPS Admin on behalf of ${propertyDetails?.ownerEmail}

This is an auto-generated email. Please do not reply to this email.

`;

  return {
    subject: subject,
    text: text,
  };
};
