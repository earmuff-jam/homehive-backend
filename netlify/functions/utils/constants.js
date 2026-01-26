// Constants ...
// defines function that is used for global constants
export const Constants = {
  ARPSMissingRequiredFields: "Missing fields for selected tenant. Skipping",
  ARPSRentRecordExists: "Found a matching rent record. Skipping",
  ARPSEmailServiceInvalidPropertyFound: "Invalid property details detected.",
  ARPSEmailServiceRequiredFieldsFound:
    "Found required fields to process email. Starting email service.",
  ARPSRentDueDetected:
    "Found rent due for selected tenant. Registering email service",
  ARPSRentOverDueDetected:
    "Found overdue rent for selected tenant. Registering email service",
  ARPSTenantRentNotDue:
    "Tenant start date begins at a later date. No rent request to process. Skipping",
  ARPSMetadataFoundMessage: "Metadata detected. Registering email service",
  ARPSRentalPaymentsDbDuringUpdateStripePayment:
    "Initializing database for default rental payments service",
  ARPSRentsDbDuringUpdateStripePayment:
    "Metadata detected. Using default collection for storage services",
  ARPSWebhookHandlerFailed:
    "Failed to update database with details from webhook handler",
  ARPSCreateSigningRequestInitializedMessage:
    "Attempting to create signing request",
  EsignCreateSigingRequestMessage: "Esign signing request created",
  EsignParsingDataErrorMessage: "Error during parsing of signing request",
  MethodNotAllowed: "Method not allowed",
  MethodNotAuthorized: "Method not authorized",
  MissingRequiredFields: "Missing required fields",
  MissingPaymentIntentFromStripe: "Invalid payment intent from stripe",
  MissingOrInvalidPaymentIntentFromStripe:
    "Missing payment intent or invalid payment intent status from stripe",
  PaymentRecievedYetToProcess:
    "Payment recieved, but has not been completed yet from stripe",
  StripePaymentStatusCompleted: "paid",
  StripePaymentStatusManualStatus: "manual",
  StripePaymentIntentStatusCompleted: "succeeded",
  InvalidRequest: "Invalid request detected.",
  UnknownErrorOccured: "An error occured while processing this request",
};
