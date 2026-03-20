import { Constants } from "./constants";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { rgb } from "pdf-lib";

const isDevEnv = process.env.DEV_ENV === "true";
const IntegrationApiKey = process.env.INTEGRATION_KEY;

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

// Role ...
// defines the role used by web ui
export const Role = {
  User: "USER",
  Admin: "ADMIN",
  Owner: "OWNER",
  Tenant: "TENANT",
};

// ARPSReminderSettings ...
// defines the configuration settings for ARPS
export const ARPSReminderSettings = {
  GENERAL: [7, 3, 1, 0],
};

// StripeOnetimePaymentEnumValue ...
export const StripeOnetimePaymentEnumValue = "onetime.payment";

// StripeWebhookEnumValues ...
// defines the configuration keys for stripe webhook handler
export const StripeWebhookEnumValues = {
  CustomerSubscriptionUpdated: "customer.subscription.updated",
  CustomerSubscriptionCreated: "customer.subscription.created",
  PaymentIntentCreated: "payment_intent.created",
  PaymentIntentProcessing: "payment_intent.processing",
  PaymentIntentSucceeded: "payment_intent.succeeded",
  CheckoutSessionCompleted: "checkout.session.completed",
  CheckoutSessionAsyncPaymentSucceeded:
    "checkout.session.async_payment_succeeded",
  CheckoutSessionAsyncPaymentFailed: "checkout.session.async_payment_failed",
  InvoicePaymentSucceeded: "invoice.payment_succeeded",
  InvoicePaymentFailed: "invoice.payment_failed",
  ChargeFailed: "charge.failed",
  ChargePending: "charge.pending",
  ChargeSucceeded: "charge.succeeded",
  ChargeUpdated: "charge.updated",
};

// initializeFirebase ...
// defines a function that initializes firebase
export const initializeFirebase = (isDevEnv = false) => {
  if (!admin.apps.length) {
    if (isDevEnv) {
      console.debug("Running in developmental instance. ");
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

// populateCorsHeaders ...
// defines a function that populates cors headers for each functions
export const populateCorsHeaders = () => {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};

// validateRequest ...
// defines a function that is used to validate a request
export const validateRequest = (apiKey = "") => {
  if (isDevEnv) return true;
  if (!isDevEnv && apiKey === IntegrationApiKey) return true;
  return false;
};

// populateApiFields ...
// defines a function that populates api fields for esign template
export const populateApiFields = (fields, schemas = []) => {
  const fetchValue = (
    key,
    valueType,
    trimPrefixLength = 1,
    isTenantSigner = false,
  ) => {
    const trimmedKey = key.substring(trimPrefixLength);

    if (fields[trimmedKey] === undefined) return null;

    switch (valueType) {
      case "string":
        return {
          key,
          value: String(fields[trimmedKey]),
          info_current_value: "text",
          info_current_contact: "",
          info_current_type: "label",
          info_current_subtype: "",
        };

      case "boolean": {
        const checked = Boolean(fields[trimmedKey]);
        return {
          key,
          value: checked ? "\u2713" : "",
          info_current_value: checked ? "\u2713" : "",
          info_current_contact: "propertyowner@temp.template",
          info_current_type: "input",
          info_current_subtype: "checkbox",
        };
      }

      case "dateTime":
        return {
          key,
          value: String(fields[trimmedKey]),
          info_current_value: "dd/mm/yyyy",
          info_current_contact: isTenantSigner
            ? "tenant@temp.template"
            : "propertyowner@temp.template",
          info_current_type: "input",
          info_current_subtype: "datesigned",
        };

      default:
        return null;
    }
  };

  const draft = {};
  for (const [key, type, trim = 1, tenantSigner = false] of schemas) {
    const value = fetchValue(key, type, trim, tenantSigner);
    if (value !== null) {
      draft[key] = value;
    }
  }

  return draft;
};

// populateSignerFields ...
// defines a function that populates signer fields for esign template
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

// DefaultInvoiceStatusOptions ...
// defines the type for default invoice status options
export const DefaultInvoiceStatusOptions = [
  {
    id: 1,
    label: "Paid",
    textColor: rgb(0, 0, 0), // black
    borderColor: rgb(0.94, 0.27, 0.27),
  },
  {
    id: 2,
    label: "Draft",
    textColor: rgb(1, 1, 1),
    borderColor: rgb(0.94, 0.27, 0.27),
  },
  {
    id: 3,
    label: "Overdue",
    textColor: rgb(1, 1, 1),
    borderColor: rgb(0.94, 0.27, 0.27), // red
  },
  {
    id: 4,
    label: "Cancelled",
    textColor: rgb(1, 1, 1),
    borderColor: rgb(0.94, 0.27, 0.27),
  },
  {
    id: 5,
    label: "None",
    textColor: rgb(1, 1, 1),
    borderColor: rgb(1, 1, 1),
  },
];

// RentAppSubscriptionStatusEnumValues ...
// defines Enum values that represent Subscription Status
//
export const RentAppSubscriptionStatusEnumValues = {
  SubscriptionInit: "created", // initialized, payment not made
  SubscriptionActive: "active", // active, g2g
  SubscriptionPastDue: "past_due", // active, payment due
  SubscriptionPaymentUpdateIssued: "update_issued", // active payment, customer attempted to change payment
  SubscriptionPaymentComplete: "completed", // inactive, but payment made; happens for bank transfer
  SubscriptionCancelled: "cancelled", // customer no longer requires / wants subscription
};

// generateSubscriptionMessageNotification ...
// defines a function that generates subscription message notification
export const generateSubscriptionMessageNotification = (
  productName,
  productCost,
) => {
  if (!productName || !productCost) {
    console.debug(Constants.MissingRequiredFields);
    return {
      subject: "",
      text: "",
    };
  }

  const draftText = `
  Hi there,
  
  Attached is your notification of payment for Rent App with Earmuffjam LLC. 
  
  Please ensure that all information is valid and correct.

  Subscription Term: ${productName}
  Subscription Cost (per month): $${productCost}

  Please note that some transaction take couple of days to process fully.

  Thank you,
  
  This is an auto-generated email. Please do not reply to this email.
  `;

  return {
    subject: "Subscription Notification for Rent App",
    text: draftText,
  };
};

// generateOnetimePaymentChargeNotification ...
// defines a function that generates one time payment charge notification
export const generateOnetimePaymentChargeNotification = (cost, link) => {
  if (!cost || !link) {
    console.debug(Constants.MissingRequiredFields);
    return {
      subject: "",
      text: "",
    };
  }

  const draftText = `
  Hi there,
  
  Attached is your notification of one time charge for ${cost}. 
  
  Please ensure that all information is valid and correct.

  One time cost: $${cost}
  Payment Link: $${link}

  Please note that some transaction take couple of days to process fully.

  Thank you,
  Earmuffjam LLC

  This is an auto-generated email. Please do not reply to this email.
  `;

  return {
    subject: "One time payment request",
    text: draftText,
  };
};

// sanitizeApiFields ...
// defines a function that removes all null or undefined values from an object
export const sanitizeApiFields = (obj = {}) =>
  /* eslint-disable no-unused-vars */
  Object.fromEntries(Object.entries(obj).filter(([_, value]) => value != null));

// pickRandom ...
// defines a function that selects one item at random from a list
export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const DocumentOnePageSchema = [
  // ===== PAGE 1 =====
  ["1owner", "string"],
  ["1tenant", "string"],
  ["2address", "string"],
  ["2county", "string"],
  ["3startDate", "string"],
  ["3endDate", "string"],

  // ===== PAGE 2 =====
  ["page2address", "string", 5],
  ["page2city", "string", 5],
  ["page2state", "string", 5],

  ["4isAutoRenew", "boolean"],
  ["4autoRenewDays", "string"],
  ["4isMonthLastDate", "boolean"],

  // ===== SECTION 5A  =====
  ["5rent", "string"],
  ["5isFirstDayRent", "boolean"],
  ["5aisPayToLandlord", "boolean", 2],
  ["5aisPayToListingBroker", "boolean", 2],
  ["5aisPayToPropertyManager", "boolean", 2],
  ["5rentDueDate", "string"],
  ["5aisCashiersCheck", "boolean", 2],
  ["5aisElectronicPayment", "boolean", 2],
  ["5aisMoneyOrder", "boolean", 2],
  ["5aisPersonalCheck", "boolean", 2],
  ["5aisOtherMeans", "boolean", 2],

  // ===== SECTION 5B =====
  ["5proratedRent", "string"],
  ["5proratedRentDueDate", "string"],
  ["5bisCashiersCheck", "boolean", 2],
  ["5bisElectronicPayment", "boolean", 2],
  ["5bisMoneyOrder", "boolean", 2],
  ["5bisPersonalCheck", "boolean", 2],
  ["5bisOtherMeans", "boolean", 2],

  // ===== SECTION 5C =====
  ["5owner", "string"],
  ["5paymentID", "string"],

  // ===== SECTION 5D =====
  ["5disMonthlyPaymentsRequired", "boolean", 2],
  ["5disCashiersCheck", "boolean", 2],
  ["5disElectronicPayment", "boolean", 2],
  ["5disMoneyOrder", "boolean", 2],
  ["5disPersonalCheck", "boolean", 2],
  ["5disOtherMeans", "boolean", 2],

  ["5d2isCashiersCheck", "boolean", 3],
  ["5d2isElectronicPayment", "boolean", 3],
  ["5d2isMoneyOrder", "boolean", 3],
  ["5d2isPersonalCheck", "boolean", 3],
  ["5d2isOtherMeans", "boolean", 3],

  // ===== PAGE 3 =====
  ["page3address", "string", 5],
  ["page3city", "string", 5],
  ["page3state", "string", 5],
  ["6initialLateFee", "string"],
  ["6dailyLateFee", "string"],
  ["6isInitialLateFee", "boolean"],
  ["7returnedPaymentFee", "string"],
  ["9initialAnimalViolationFee", "string"],
  ["9dailyAnimalViolationFee", "string"],

  // ===== PAGE 4 =====
  ["page4address", "string", 5],
  ["page4city", "string", 5],
  ["page4state", "string", 5],
  ["10securityDeposit", "string", 2],
  ["10isCashiersCheck", "boolean", 2],
  ["10isElectronicPayment", "boolean", 2],
  ["10isMoneyOrder", "boolean", 2],
  ["10isPersonalCheck", "boolean", 2],
  ["10isOtherMeans", "boolean", 2],

  // ===== PAGE 5 =====
  ["page5address", "string", 5],
  ["page5city", "string", 5],
  ["page5state", "string", 5],
  ["11ownerCoveredUtilities", "string", 2],

  // ===== PAGE 6 =====
  ["page6address", "string", 5],
  ["page6city", "string", 5],
  ["page6state", "string", 5],
  ["12isHoa", "boolean", 2],
  ["12isNotHoa", "boolean", 2],
  ["12hoaDetails", "string", 2],
  ["12guestsPermittedStayDays", "string", 2],
  ["13allowedVehicleCounts", "string", 2],

  // ===== PAGE 7 =====
  ["page7address", "string", 5],
  ["page7city", "string", 5],
  ["page7state", "string", 5],

  ["14tripCharge", "string", 2],
  ["14allowKeyboxSince", "string", 2],
  ["14removeKeyboxFee", "string", 2],

  // ===== PAGE 8 =====
  ["page8address", "string", 5],
  ["page8city", "string", 5],
  ["page8state", "string", 5],
  ["15inventoryCompleteWithin", "string", 2],

  // ===== PAGE 9 =====
  ["page9address", "string", 5],
  ["page9city", "string", 5],
  ["page9state", "string", 5],
  ["17isTenantCleaningYard", "boolean", 2],

  // ===== PAGE 10 =====
  ["page10address", "string", 6],
  ["page10city", "string", 6],
  ["page10state", "string", 6],
  ["17isSmokingNotAllowed", "boolean", 2],
  ["18emergencyContactNumber", "string", 2],

  // ===== PAGE 11 =====
  ["page11address", "string", 6],
  ["page11city", "string", 6],
  ["page11state", "string", 6],

  // ===== PAGE 12 =====
  ["page12address", "string", 6],
  ["page12city", "string", 6],
  ["page12state", "string", 6],

  // ===== PAGE 13 =====
  ["page13address", "string", 6],
  ["page13city", "string", 6],
  ["page13state", "string", 6],
  ["26specialProvisions", "string", 2],

  // ===== PAGE 14 =====
  ["page14address", "string", 6],
  ["page14city", "string", 6],
  ["page14state", "string", 6],

  // ===== PAGE 15 =====
  ["page15address", "string", 6],
  ["page15city", "string", 6],
  ["page15state", "string", 6],
  ["31rentalFloodDisclosure", "boolean", 2],
  ["32tenant", "string", 2],
  ["32owner", "string", 2],
  ["32tenantEmail", "string", 2],
  ["32ownerEmail", "string", 2],

  // ===== PAGE 16 =====
  ["page16address", "string", 6],
  ["page16city", "string", 6],
  ["page16state", "string", 6],

  // ===== PAGE 17 =====
  ["page17address", "string", 6],
  ["page17city", "string", 6],
  ["page17state", "string", 6],
  ["34brokerName", "string", 2],
  ["34isBrokerManaged", "boolean", 2],
  ["34isNotBrokerManaged", "boolean", 2],
  ["34isOwnerManaged", "boolean", 2],
  ["34isManagerManaged", "boolean", 2],
  ["34managerName", "string", 2],
  ["34managerAddress", "string", 2],
  ["34managerPhone", "string", 2],

  ["dateSigned1", "dateTime", 0],
  ["dateSigned2", "dateTime", 0, true],
];

export const DocumentTwoPageSchema = [
  ["rfd-currentDate", "string", 4],
  ["rfd-address", "string", 4],
  ["rfd-city", "string", 4],
  ["rfd-state", "string", 4],
  ["rfd-ownerNotAwareFloodplain", "boolean", 4],
  ["rfd-ownerNotAwareWaterDamage", "boolean", 4],
  ["rfd-owner", "string", 4],
  ["rfd-dateSigned1", "dateTime", 0],
  ["rfd-tenant", "string", 4],
  ["rfd-dateSigned2", "dateTime", 0, true],
];

export const DocumentThreePageSchema = [
  ["ext-address", "string", 4],
  ["ext-city", "string", 4],
  ["ext-state", "string", 4],
  ["ext-owner", "string", 4],
  ["ext-dateOfExtension", "string", 4],
  ["ext-newExpirationDate", "string", 4],
  ["ext-isRentChanged", "boolean", 4],
  ["ext-rentChangeAmt", "string", 4],
  ["ext-isNotRentChanged", "boolean", 4],
  ["ext-expirationDate", "string", 4],
  ["ext-isTenantNotVacating", "boolean", 4],
  ["ext-BisRentChanged", "boolean", 5],
  ["ext-BrentChangeAmt", "string", 5],
  ["ext-BnewExpirationDate", "string", 5],
  ["ext-BendDate", "string", 5],
  ["ext-BisRentNotChanged", "boolean", 5],
  ["ext-BisTenantVacating", "boolean", 5],
  ["ext-dateSigned1", "dateTime", 4],
  ["ext-tenant", "string", 4],
  ["ext-dateSigned2", "dateTime", 4, true],
];
