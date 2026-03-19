// Constants ...
// defines function that is used for global constants
export const Constants = {
  // Environment message
  IsDevEnv: "In development environment instance",

  // Raspy AI related message
  RaspyUserIntentDetected:
    "Attempting to retrieve intent for requested message",
  RaspyPropertyOverviewIntentDetected:
    "Found message with intent related to property overview.",
  RaspyOtherIntentDetected: "Found message with intent noted as other.",
  RaspyErrorMessage: "Unable to fetch requested information from Raspy. ",

  // ARPS releted messages
  ARPSMissingRequiredFields: "Missing fields for selected tenant. Skipping",
  ARPSRentRecordExists: "Found a matching rent record. Skipping",
  ARPSEmailServiceInvalidPropertyFound: "Invalid property details detected.",
  ARPSEmailServiceRequiredFieldsFound:
    "Found required fields to process email. Starting email service.",
  ARPSRentDueDetected:
    "Found rent due for selected tenant. Registering email service",
  ARPSRentOverDueDetected:
    "Found overdue rent for selected tenant. Registering email service",
  ARPSAutoRenewPolicyFound:
    "Found auto renew policy set up for selected tenant.",
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
  ARPSUpdatedEsignRequest: "Updated esign request",

  // Esign related messages
  EsignParsingDataErrorMessage: "Error during parsing of signing request",
  EsignWebhookReceivedMessage: "Received payload from Esign provider ",
  EsignWebhookErrorMessage:
    "Error during webhook response from Esign provider ",
  EsignMissingPayloadFromWebhookMessage:
    "Invalid webhook request. Missing payload from provided request",
  EsignCreateSigingRequestMessage: "Esign signing request created",
  PaymentRecievedYetToProcess:
    "Payment recieved, but has not been completed yet from stripe",

  // Stripe Payment Status Messages
  StripePaymentStatusCompleted: "paid",
  StripePaymentStatusManualStatus: "manual",
  StripePaymentIntentStatusCompleted: "succeeded",

  // Stripe Customer Link
  StripeCreateCustomerLinkMissingEmailMsg:
    "problem creating customer, missing email",
  StripeCreateCustomerLinkSuccessMsg:
    "Processing creating stripe customer link for provided email address",

  // Subscription Related Messages
  SubscriptionDetailsUpdatedSuccessMsg:
    "Successfully updated customer subscription details",
  SubscriptionCreatedSuccessMsg:
    "Successfully created new customer for subscription",
  SubscriptionUpdatedSuccessMsg:
    "Successfully updated customer billing for subscription",
  SubscriptionPaymentSuccessMsg:
    "Invoice payment completed successfully. Activating Subscription",
  SubscriptionCheckoutSuccessMsg:
    "Successfully completed checkout session for subscription",
  SubscriptionPaymentErrorMsg: "Payment failed for selected subscription.",
  SubscriptionNotificationSuccessMsg: "Unable to send email notification",
  SubscriptionNotificationFailureErrorMsg: "Unable to send email notification",
  SubscriptionFailureMessage: "Unable to update user subscription",

  // Common Error Messages
  MethodNotAllowed: "Method not allowed",
  InvalidRequest: "Invalid request detected",
  MethodNotAuthorized: "Method not authorized",
  MissingRequiredFields: "Missing required fields",
  MissingPaymentIntentFromStripe: "Invalid payment intent from stripe",
  MissingOrInvalidPaymentIntentFromStripe:
    "Missing payment intent or invalid payment intent status from stripe",
  UnknownErrorOccured: "An error occured while processing this request",
};
