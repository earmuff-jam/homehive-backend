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

  // Email Service related messages
  EmailSuccessResponse: "Successfully sent email",
  EmailFailedResponse: "Failed to send email.",

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
  ARPSTenantRentNotDue:
    "Tenant start date begins at a later date. No rent request to process. Skipping",
  ARPSMetadataFoundMessage: "Metadata detected. Registering email service",
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

  // Stripe payment services related messages
  StripeEventHandlerInit: "Starting event handler to process request",
  StripeEventHandlerComplete: "Completed event handler processing request",
  StripeEventHandlerErrorMsg:
    "Unable to process webhook signature request, error: ",
  StripePaymentIntentCreatedMsg:
    "Processing stripe payment services for payment intent with created stamp.",
  StripePaymentIntentProcessingMsg:
    "Processing stripe payment services for payment intent with processing stamp.",
  StripePaymentIntentSucceededMsg:
    "Processing stripe payment services for payment intent with successed stamp.",
  StripeCheckoutSessionCompleted:
    "Processing stripe payment services for checkout session intent with complete stamp.",
  StripeCheckoutSessionSubscriptionMode:
    "Detected subscription mode, registering as a subscription service",
  StripeCheckoutSessionRentPaymentMode:
    "Detected rental payments mode, registering as a rent payment service",
  StripeCheckoutSessionETSSPaymentMode:
    "Detected ETSS token purchase, registering as a ETSS token payment service",
  StripeCheckoutSessionAsyncPaymentSucceeded:
    "Processing stripe payment services for checkout async session intent with payments succeeded stamp.",
  StripeCheckoutSessionAsyncPaymentFailed:
    "Processing stripe payment services for checkout async session intent with payments failed stamp.",
  StripeChargeFailed:
    "Processing stripe payment services for charge intent with failed stamp.",
  StripeChargePending:
    "Processing stripe payment services for charge intent with pending stamp.",
  StripeChargeSucceeded:
    "Processing stripe payment services for charge intent with success stamp.",
  StripeChargeUpdated:
    "Processing stripe payment services for charge intent with update stamp.",
  StripeNoMatchingWebhookValue:
    "No matching webhook value found for event type:",
  StripeSelectedCollectionInit:
    "No Metadata detected. Using collection for rental payment services",
  StripeETSSCollectionInit:
    "ETSS token system detected. Using collection for etss payment services",
  StripeETSSConsumeTokenInit:
    "Consuming ETSS Token for electronic payment services",
  StripeUpdateSelectedCollection:
    "Metadata detected. Using collection for rent services",
  StripePaymentStatusError:
    "Unable to process stripe payment services without correct payment status",
  StripeFailedToCreateCheckoutSession:
    "Failed to create stripe checkout session.",
  StripeFailedToCreateETSSSession: "Failed to create stripe ETSS session.",
  StripeFailedToCreateAccount: "Failed to create stripe account",
  StripeFailedToProcessPaymentConfirmation:
    "Failed to process stripe payment confirmation",

  StripePaymentStatusCompleted: "paid",
  StripePaymentStatusManualStatus: "manual",
  StripePaymentIntentStatusCompleted: "succeeded",

  // Stripe Customer Link
  StripeCreateCustomerLinkMissingEmailMsg:
    "problem creating customer, missing email",
  StripeCreateCustomerLinkMissingStripeCustomerId:
    "problem creating customer, missing stripe customer id",
  StripeCreateCustomerLinkSuccessMsg:
    "Processing creating stripe customer link for provided email address",

  // Stripe One Time Payment Related Messages
  StripeCreateCustomerId:
    "Successfully created new customer id for one time payment",
  StripeOneTimePaymentMsgSuccess:
    "Successfully created new session for one time payment",

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
  SubscriptionFailureMessage: "Unable to update user subscription",
  FailedToSendEmailNotification: "Failed to send email notification ",
  FailedToCreateOnetimePaymentSession:
    "Failed to create one time payment session ",

  // Esign Form Related Messages
  ProcessingEsignRequest: "Starting processing handler for Esign request",
  CompletedScanMessage: "Completed full scan of pdf document.",
  FailedToProcessDocument: "Failed to process provided document.",
  FailedToReceievePdf: "Unable to fetch selected pdf",
  EsignSentSuccessfully: "Signature request was sent successfully",
  ETSSTokenConsumedSuccessfully: "One token was consumed successfully",

  // Common Messages
  SuccessResponse: "Success",
  MethodNotAllowed: "Method not allowed",
  FailedToProcessDataError: "Failed to process data",
  InvalidRequest: "Invalid request detected",
  MethodNotAuthorized: "Method not authorized",
  MissingRequiredFields: "Missing required fields",
  MissingPaymentIntentFromStripe: "Invalid payment intent from stripe",
  MissingOrInvalidPaymentIntentFromStripe:
    "Missing payment intent or invalid payment intent status from stripe",
  UnknownErrorOccured: "An error occured while processing this request",
};
