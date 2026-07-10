/**
 * File : 0032_ArchiveMaintenaceRecordImages.js
 *
 * This file is used to perform cleanup for all existing images associated to
 * a selected UUID. When the UUID is passed in and the time limit of 90 days
 * is reached from the last time the item was updated, the images are automatically
 * put up for cleanup.
 *
 * Must have feature flags enabled
 */
import dayjs from "dayjs";

import { Constants } from "./utils/constants";
import {
  ARPSReminderSettings,
  initializeFirebase,
  initializeFirebaseStorage,
  populateCorsHeaders,
} from "./utils/utils";

let db;
let storageBucket;
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
    debugger;
    const today = dayjs();
    const emailPromises = [];
    const archivedMaintenanceIDs = [];
    const autoCleanupDays = ARPSReminderSettings.AutoImageCleanupDays;

    db = initializeFirebase(isDevEnv);
    storageBucket = initializeFirebaseStorage(); // run after firebase init

    const maintenanceRecordsSnapshots =
      await fetchMaintenanceRecordSnapshots(autoCleanupDays);
    const maintenanceRecordSize = maintenanceRecordsSnapshots.size;

    console.debug(
      `Processing ${maintenanceRecordSize} at ${today} for image cleanup`,
    );

    for (const maintenanceRecordDocs of maintenanceRecordsSnapshots.docs) {
      const maintenanceRecord = maintenanceRecordDocs?.data();
      const { id, propertyId, tenantEmail } = maintenanceRecord;

      if (!propertyId || !tenantEmail) {
        console.debug(Constants.ARPSMissingRequiredFields);
        continue; // eat the exception; does not send notification
      }

      debugger;
      // remove images from cloud storage with associated maintenanceID
      await removeAssociatedImages(propertyId, id);
      archivedMaintenanceIDs.push(id);

      const { subject, text } = generateEmailNotificationMessage(
        tenantEmail,
        autoCleanupDays,
      );

      emailPromises.push(
        fetch(
          `${process.env.SITE_URL}/.netlify/functions/0001_SendCustomEmail`,
          {
            method: "POST",
            headers: {
              ...populateCorsHeaders(),
              "x-api-key": IntegrationKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: tenantEmail,
              subject,
              text,
            }),
          },
        ),
      );
    }

    await updateArchivedMaintenanceRecords(archivedMaintenanceIDs);

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
      body: `Processed ${maintenanceRecordSize} maintenance records, sent ${emailPromises.length} reminders.\n`,
    };
  } catch (error) {
    console.debug(
      "Error performing cleanup for maintenance records. Details: ",
      error,
    );
    return {
      statusCode: 500,
      headers: populateCorsHeaders(),
      body: `Error: ${error.message}`,
    };
  }
};

// updateArchivedMaintenanceRecords ...
// defines a function that updates the maintenance record after the images are Archived
const updateArchivedMaintenanceRecords = async (
  archivedMaintenanceIDs = [],
) => {
  if (archivedMaintenanceIDs?.length <= 0) {
    console.debug(Constants.ARPSArchiedMaintenanceRecordsNotFound);
    return;
  }

  console.debug(Constants.ARPSArchiedMaintenanceRecordsFound);
  for (const maintenanceRecordID of archivedMaintenanceIDs) {
    try {
      const updatedMaintenanceDocs = {
        isImagesArchived: true,
        updatedBy: Constants.ARPSAdminSystemUpdator,
        updatedOn: dayjs().toISOString(),
      };

      await db
        .collection("maintenance")
        .doc(maintenanceRecordID)
        .set(updatedMaintenanceDocs, { merge: true });

      console.debug(Constants.ARPSArchivedMaintenanceRecordImages);
    } catch (err) {
      console.debug("Unable to archieve maintenance record. Details: ", err);
    }
  }
};

// removeAssociatedImages ...
// defines a function that removes files with associated id from cloud storage
const removeAssociatedImages = async (propertyID, maintenanceID) => {
  await storageBucket.deleteFiles({
    prefix: `properties/${propertyID}/maintenance/${maintenanceID}/`,
  });

  console.debug(`Removed images for maintenance record ${maintenanceID}`);
};

// fetchMaintenanceRecordSnapshots ...
// defines a function that fetches completed maintenance items that
// have crossed the valid cleanup mark for images
const fetchMaintenanceRecordSnapshots = async (autoCleanupDays) => {
  const data = await db
    .collection("maintenance")
    .where("status", "==", "Completed")
    .where(
      "updatedOn",
      "<=",
      dayjs().subtract(autoCleanupDays, "day").toISOString(),
    )
    .get();
  return data;
};

// generateEmailNotificationMessage ...
// defines a function that generates email notification when a maintenance image
// is removed from the system.
const generateEmailNotificationMessage = (tenantEmail, autoCleanupDays) => {
  const subject =
    "ARPS REMINDER: Performed cleanup for archived maintenance record";

  const text = `
Hi ${tenantEmail},

This email serves as a reminder to let you know that images attached to an archived maintenance notification
will be cleaned up as it reached the ${autoCleanupDays} mark.

Thank you,
ARPS Admin.

This is an auto-generated email. Please do not reply to this email.

`;

  return { subject: subject, text: text };
};
