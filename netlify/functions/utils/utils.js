import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const EsignBaseUrl = "https://api.firma.dev/functions/v1/signing-request-api";
const GoodSignBaseUrl = "https://goodsign.io/api";

const EsignWorkspaceUri = "/workspaces";
const EsignTemplatesUri = "/templates";
const GoodSignTemplateToEsignUri = "/usetemplate";

const DefaultReminderDays = 3;

export const EsignWorkspaceUrl = EsignBaseUrl + EsignWorkspaceUri;
export const EsignTemplatesUrl = EsignBaseUrl + EsignTemplatesUri;

export const GoodSignTemplatesUrl = GoodSignBaseUrl + EsignTemplatesUri;
export const GoodSignTemplateToEsignUrl =
  GoodSignBaseUrl + GoodSignTemplateToEsignUri;
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

/**
 * populateApiFields ...
 *
 * used to populate api fields for residential lease for goodsign api
 *
 * @returns Object - default api fields
 */
export const populateApiFields = (fields) => {
  const fetchValue = (key, valueType, isTenantSigner = false) => {
    if (fields[key] === undefined) return null;
    switch (valueType) {
      case "string":
        return {
          key,
          value: String(fields[key]),
          info_current_value: "text",
          info_current_contact: "",
          info_current_type: "label",
          info_current_subtype: "",
        };
      case "boolean":
        return {
          key,
          value: Boolean(fields[key]) ? "\u2713" : "",
          info_current_value: Boolean(fields[key]) ? "\u2713" : "",
          info_current_contact: "propertyowner@temp.template",
          info_current_type: "input",
          info_current_subtype: "checkbox",
        };

      case "dateTime":
        return {
          key,
          value: String(fields[key]),
          info_current_value: "dd\/mm\/yyyy",
          info_current_contact: isTenantSigner
            ? "tenant@temp.template"
            : "propertyowner@temp.template",
          info_current_type: "input",
          info_current_subtype: "datesigned",
        };
      default:
        return "N/A";
    }
  };

  const draft = Object.fromEntries(
    Object.entries({
      county: fetchValue("county", "string"),
      startDate: fetchValue("startDate", "string"),
      endDate: fetchValue("endDate", "string"),
      address: fetchValue("address", "string"),
      isAutoRenew: fetchValue("isAutoRenew", "boolean"),
      autoRenewDays: fetchValue("autoRenewDays", "string"),
      isMonthLastDate: fetchValue("isMonthLastDate", "string"),
      rent: fetchValue("rent", "string"),
      isFirstDayRent: fetchValue("isFirstDayRent", "boolean"),
      rentDueDate: fetchValue("rentDueDate", "string"), // like 4 days after the lease is signed
      isPayToLandlord: fetchValue("isPayToLandlord", "boolean"),
      isPayToListingBroker: fetchValue("isPayToListingBroker", "boolean"),
      isPayToPropertyManager: fetchValue("isPayToPropertyManager", "boolean"),
      isCashiersCheck: fetchValue("isCashiersCheck", "boolean"),
      isElectronicPayment: fetchValue("isElectronicPayment", "boolean"),
      isMoneyOrder: fetchValue("isMoneyOrder", "boolean"),
      isPersonalCheck: fetchValue("isPersonalCheck", "boolean"),
      isOtherMeans: fetchValue("isOtherMeans", "boolean"),
      owner: fetchValue("owner", "string"),
      tenant: fetchValue("tenant", "string"),
      address: fetchValue("address", "string"),
      proratedRent: fetchValue("proratedRent", "string"),
      proratedRentDueDate: fetchValue("proratedRentDueDate", "string"),
      isCashiersCheck: fetchValue("isCashiersCheck", "boolean"),
      isElectronicPayment: fetchValue("isElectronicPayment", "boolean"),
      isMoneyOrder: fetchValue("isMoneyOrder", "boolean"),
      isPersonalCheck: fetchValue("isPersonalCheck", "boolean"),
      isOtherMeans: fetchValue("isOtherMeans", "boolean"),
      owner: fetchValue("owner", "string"),
      paymentID: fetchValue("paymentID", "string"),
      isCashiersCheck: fetchValue("isCashiersCheck", "boolean"),
      isElectronicPayment: fetchValue("isElectronicPayment", "boolean"),
      isMoneyOrder: fetchValue("isMoneyOrder", "boolean"),
      isPersonalCheck: fetchValue("isPersonalCheck", "boolean"),
      isOtherMeans: fetchValue("isOtherMeans", "boolean"),
      isCashiersCheck: fetchValue("isCashiersCheck", "boolean"),
      isElectronicPayment: fetchValue("isElectronicPayment", "boolean"),
      isMoneyOrder: fetchValue("isMoneyOrder", "boolean"),
      isPersonalCheck: fetchValue("isPersonalCheck", "boolean"),
      isOtherMeans: fetchValue("isOtherMeans", "boolean"),
      isExtraChargeNotAdded: fetchValue("isExtraChargeNotAdded", "boolean"),
      isMonthlyPaymentsRequired: fetchValue(
        "isMonthlyPaymentsRequired",
        "boolean",
      ),
      address: fetchValue("address", "string"),
      rentPaymentDeadline: fetchValue("rentPaymentDeadline", "string"),
      initialLateFee: fetchValue("initialLateFee", "string"),
      dailyLateFee: fetchValue("dailyLateFee", "string"),
      isInitialLateFee: fetchValue("isInitialLateFee", "boolean"),
      returnedPaymentFee: fetchValue("returnedPaymentFee", "string"),
      initialAnimalViolationFee: fetchValue(
        "initialAnimalViolationFee",
        "string",
      ),
      dailyAnimalViolationFee: fetchValue("dailyAnimalViolationFee", "string"),
      address: fetchValue("address", "string"),
      securityDeposit: fetchValue("securityDeposit", "string"),
      isCashiersCheck: fetchValue("isCashiersCheck", "boolean"),
      isElectronicPayment: fetchValue("isElectronicPayment", "boolean"),
      isMoneyOrder: fetchValue("isMoneyOrder", "boolean"),
      isPersonalCheck: fetchValue("isPersonalCheck", "boolean"),
      isOtherMeans: fetchValue("isOtherMeans", "boolean"),
      address: fetchValue("address", "string"),
      ownerCoveredUtilities: fetchValue("ownerCoveredUtilities", "string"),
      address: fetchValue("address", "string"),
      isHoa: fetchValue("isHoa", "boolean"),
      isNotHOA: fetchValue("isNotHOA", "boolean"),
      hoaDetails: fetchValue("hoaDetails", "boolean"),
      guestsPermittedStayDays: fetchValue("guestsPermittedStayDays", "string"),
      allowedVehicleCounts: fetchValue("allowedVehicleCounts", "string"),
      address: fetchValue("address", "string"),
      tripCharge: fetchValue("tripCharge", "string"),
      allowKeyboxSince: fetchValue("allowKeyboxSince", "string"),
      removeKeyboxFee: fetchValue("removeKeyboxFee", "string"),
      address: fetchValue("address", "string"),
      inventoryCompleteWithin: fetchValue("inventoryCompleteWithin", "string"),
      address: fetchValue("address", "string"),
      isTenantCleaningYard: fetchValue("isTenantCleaningYard", "boolean"),
      address: fetchValue("address", "string"),
      isSmokingNotAllowed: fetchValue("isSmokingNotAllowed", "boolean"),
      emergencyContactNumber: fetchValue("emergencyContactNumber", "string"),
      address: fetchValue("address", "string"),
      address: fetchValue("address", "string"),
      address: fetchValue("address", "string"),
      address: fetchValue("address", "string"),
      specialProvisions: fetchValue("specialProvisions", "string"),
      address: fetchValue("address", "string"),
      rentalFloodDisclosure: fetchValue("rentalFloodDisclosure", "boolean"),
      tenant: fetchValue("tenant", "string"),
      owner: fetchValue("owner", "string"),
      tenantEmail: fetchValue("tenantEmail", "string"),
      ownerEmail: fetchValue("ownerEmail", "string"),
      address: fetchValue("address", "string"),
      city: fetchValue("city", "string"),
      state: fetchValue("state", "string"),
      zipCode: fetchValue("zipCode", "string"),
      brokerName: fetchValue("brokerName", "string"),
      isBrokerManaged: fetchValue("isBrokerManaged", "boolean"),
      isNotBrokerManaged: fetchValue("isNotBrokerManaged", "boolean"),
      isOwnerManaged: fetchValue("isOwnerManaged", "boolean"),
      isManagerManaged: fetchValue("isManagerManaged", "boolean"),
      managerName: fetchValue("managerName", "string"),
      managerAddress: fetchValue("managerAddress", "string"),
      managerPhone: fetchValue("managerPhone", "string"),
      datesigned1: fetchValue("dateSigned1", "dateTime"),
      datesigned2: fetchValue("dateSigned2", "dateTime", true),
    }).filter(([_, v]) => v !== null),
  );

  return draft;
};

/**
 * populateSignerFields...
 *
 * used to populate the signer fields for the signing parties
 */
export const populateSignerFields = (key, name, email) => {
  return Object.assign(
    {},
    {
      key,
      name,
      email,
      reminder_days: DefaultReminderDays,
    },
  );
};
