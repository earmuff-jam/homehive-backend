/**
 * File : 0029_SendPreparedEsignDocument.js
 *
 * This file is used to allow the users to send a document for electronic
 * signature
 *
 * Must have feature flags enabled
 */
import dayjs from "dayjs";

import { Constants } from "./utils/constants";
import {
  EsignTokenPriceMap,
  initializeFirebase,
  populateCorsHeaders,
  validateRequest,
} from "./utils/utils";
import { SignatureRequestApi } from "@dropbox/sign";
import Busboy from "busboy";
import fs from "fs";
import path from "path";

const client = new SignatureRequestApi();
client.username = process.env.ESIGN_API_KEY;

const isDevEnv = process.env.DEV_ENV === "true";
const IntegrationKey = process.env.INTEGRATION_KEY;

export const handler = async (event) => {
  const isValidRequest = validateRequest(event.headers["x-api-key"]);

  if (!isValidRequest) {
    console.debug(Constants.MethodNotAuthorized);
    return {
      statusCode: 401,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: Constants.MethodNotAuthorized }),
    };
  }

  if (event.httpMethod !== "POST") {
    console.debug(Constants.MethodNotAllowed);
    return {
      statusCode: 405,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: Constants.MethodNotAllowed }),
    };
  }

  let tempFilePath = null;

  try {
    console.debug(Constants.ProcessingEsignRequest);

    let fields = {};
    let pdfBuffer = null;
    let filename = "document.pdf";

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : event.body;

    const busboy = Busboy({
      headers: {
        "content-type": event.headers["content-type"],
      },
    });

    await new Promise((resolve, reject) => {
      busboy.on("file", (_, file, info) => {
        const chunks = [];

        if (info && info.filename) {
          filename = info.filename;
        } else if (typeof info === "string") {
          filename = info;
        }

        file.on("data", (data) => {
          chunks.push(data);
        });

        file.on("end", () => {
          pdfBuffer = Buffer.concat(chunks);
          console.debug(
            `Processing file ${filename} with size ${pdfBuffer.length}`,
          );
        });

        file.on("error", (err) => {
          console.debug("File stream error:", err);
          reject(err);
        });
      });

      busboy.on("field", (name, value) => {
        fields[name] = value;
      });

      busboy.on("finish", resolve);
      busboy.on("error", reject);

      busboy.end(body);
    });

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.debug(Constants.FailedToReceievePdf);
      throw new Error(Constants.FailedToReceievePdf);
    }

    tempFilePath = path.join("/tmp", `esign-${Date.now()}.pdf`);
    await fs.promises.writeFile(tempFilePath, pdfBuffer);

    let formFieldsPerDocument = null;
    let signers = null;

    if (fields.formFieldsPerDocument) {
      try {
        formFieldsPerDocument = JSON.parse(fields.formFieldsPerDocument);
      } catch (err) {
        console.debug(Constants.FailedToProcessDocument, err);
      }
    }

    if (fields.signers) {
      try {
        signers = JSON.parse(fields.signers);
      } catch (err) {
        console.debug(Constants.FailedToProcessDocument, err);
      }
    }

    const fileStream = fs.createReadStream(tempFilePath);

    const requestData = {
      title: fields.title,
      subject: fields.subject,
      message: fields.message,
      testMode: true,
      signers: signers,
      files: [fileStream],
    };

    // removes testMode if not in dev env
    if (!isDevEnv) delete requestData.testMode;

    // verifies valid tokens
    const hasValidTokens = validateETTSToken(fields?.stripeCustomerEmail);
    if (!hasValidTokens) {
      console.debug(Constants.StripeInvalidTokensForETSSSession);
      return {
        statusCode: 401,
        headers: populateCorsHeaders(),
        body: JSON.stringify({
          error: Constants.StripeInvalidTokensForETSSSession,
        }),
      };
    }

    if (formFieldsPerDocument && formFieldsPerDocument.length > 0) {
      requestData.formFieldsPerDocument = formFieldsPerDocument;
    }

    const response = await client.signatureRequestSend(requestData);
    console.debug(Constants.EsignSentSuccessfully);

    // used to consume the token for ETSS
    const data = {
      consumedTokens: 1,
      userId: fields?.userId,
      stripeCustomerEmail: fields?.stripeCustomerEmail,
      method: "stripe",
      status: "complete", // the status of the purchase
      createdBy: fields?.userId, // the person who paid for the charge
      note: "Consumed ETSS token",
      createdOn: dayjs().toISOString(),
      updatedBy: fields?.userId,
      updatedOn: dayjs().toISOString(),
    };

    const tokenConsumedResponse = await consumeETSSToken(data);
    console.debug(Constants.ETSSTokenConsumedSuccessfully);

    return {
      statusCode: 200,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: 200,
        message: "Signature request sent",
        consumedTokens: tokenConsumedResponse?.consumedTokens,
        signatureRequestId: response?.signatureRequest?.signatureRequestId,
      }),
    };
  } catch (err) {
    console.debug(Constants.FailedToProcessDocument, err);

    return {
      statusCode: 500,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: err.message,
        details: err.body ? JSON.stringify(err.body) : undefined,
      }),
    };
  } finally {
    if (tempFilePath) {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (err) {
        console.debug(Constants.FailedToProcessDocument, err);
      }
    }
  }
};

// validateETTSToken ...
// defines a function that validates the ETTS token before
// sending the electronic signature.
const validateETTSToken = async (stripeCustomerEmail) => {
  try {
    console.debug(Constants.StripeETSSValidateTokenInit);
    const db = initializeFirebase(isDevEnv);
    const snapshot = await db
      .collection("etssPayments")
      .where("stripeCustomerEmail", "==", stripeCustomerEmail)
      .where("status", "==", "complete")
      .get();

    const etssPayments = [];
    snapshot.forEach((doc) => {
      etssPayments.push({ id: doc.id, ...doc.data() });
    });

    const validTokens = etssPayments.reduce(
      (acc, el) =>
        acc + (Number(el?.tokens) || 0) - (Number(el?.consumedTokens) || 0),
      0,
    );

    console.debug(
      "Found valid tokens. Preparing electronic documents for signature. Total valid tokens before Esign: ",
      validTokens,
    );

    return true;
  } catch (err) {
    console.debug(Constants.FailedToProcessDocument, err);
    return false;
  }
};

// consumeETSSToken ...
// defines a function that consumes the token so that the Esign documents can be
// transported across the a/o
const consumeETSSToken = async (data) => {
  try {
    console.debug(Constants.StripeETSSConsumeTokenInit);
    const db = initializeFirebase(isDevEnv);

    const docRef = await db.collection("etssPayments").add({
      consumedTokens: data?.consumedTokens ?? 1, // default to 1 if not provided
      userId: data?.userId,
      stripeCustomerEmail: data?.stripeCustomerEmail,
      method: "stripe",
      status: "complete",
      type: "consume",
      source: "esign-send",
      note: "Consumed ETSS token",
      createdBy: data?.userId,
      createdOn: dayjs().toISOString(),
      updatedBy: data?.userId,
      updatedOn: dayjs().toISOString(),
    });

    console.debug(
      `${Constants.ETSSTokenConsumedSuccessfully} | docId: ${docRef.id}`,
    );

    processEmailService({
      ...data,
      consumedTokens: data?.consumedTokens ?? 1,
    }).catch((err) => console.debug(Constants.EmailFailedResponse, err));

    return {
      success: true,
      consumedTokens: data?.consumedTokens ?? 1,
      docId: docRef.id,
    };
  } catch (err) {
    console.debug(Constants.FailedToProcessDocument, err);

    return {
      success: false,
      error: err.message,
    };
  }
};

// processEmailService ...
// defines a function that is used to process data to the email service
const processEmailService = async (data) => {
  const generatedMsg = generateMessageBody(
    data?.consumedTokens,
    EsignTokenPriceMap.BASIC, // basic token to ack 1 token per activity
  );

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
        to: data?.stripeCustomerEmail,
        subject: "Notification of consumed tokens",
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
// defines a function that is used to generate message body text for ETSS handler
// used to populate email notification. tokenCost is basic token from EsignTokenPriceMap
// since we do not have ability to consume multiple tokens at this time.
const generateMessageBody = (tokens, tokenCost) => {
  const draftMessage = `
Dear customer,

Attached is your notification of token consumption.

  Payment Date: ${dayjs().format("DD-MM-YYYY")}
  Token: ${tokens}
  Token Cost: $${tokenCost}

  Thank you,

This is an auto-generated email. Please do not reply to this email.
  `;

  return draftMessage;
};
