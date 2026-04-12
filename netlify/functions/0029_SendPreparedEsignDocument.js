/**
 * File : 0029_SendPreparedEsignDocument.js
 *
 * This file is used to allow the users to send a document for electronic
 * signature
 *
 * Must have feature flags enabled
 */
import { Constants } from "./utils/constants";
import { populateCorsHeaders, validateRequest } from "./utils/utils";
import { SignatureRequestApi } from "@dropbox/sign";
import Busboy from "busboy";
import fs from "fs";
import path from "path";

const client = new SignatureRequestApi();
client.username = process.env.ESIGN_API_KEY;

const isDevEnv = process.env.DEV_ENV === "true";

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

    if (formFieldsPerDocument && formFieldsPerDocument.length > 0) {
      requestData.formFieldsPerDocument = formFieldsPerDocument;
      console.debug(
        "FINAL REQUEST FORM FIELDS:",
        JSON.stringify(requestData.formFieldsPerDocument, null, 2),
      );
    }

    const response = await client.signatureRequestSend(requestData);
    console.debug(Constants.EsignSentSuccessfully);

    return {
      statusCode: 200,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: 200,
        message: "Signature request sent",
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
