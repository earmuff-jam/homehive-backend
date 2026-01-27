/**
 * File : 0001_send_email_fn.js
 * Netlify Function to send emails using MailerSend (no templates).
 */
import { Constants } from "./utils/constants";
import { populateCorsHeaders, validateRequest } from "./utils/utils";
import { EmailParams, MailerSend, Recipient, Sender } from "mailersend";

const sentFrom = new Sender(process.env.MAILERSEND_FROM_EMAIL);

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

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

  if (("POST" || "OPTIONS") !== event.httpMethod) {
    console.debug(Constants.MethodNotAllowed);
    return {
      statusCode: 405,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: Constants.MethodNotAllowed }),
    };
  }

  // for prefetch
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: "OK",
    };
  }

  try {
    const { to, subject, text, html } = JSON.parse(event.body);

    if (!to || !subject || !text) {
      console.debug(Constants.MissingRequiredFields);
      return {
        statusCode: 400,
        headers: populateCorsHeaders(),
        body: JSON.stringify({
          error: Constants.MissingRequiredFields,
        }),
      };
    }

    const recipients = [new Recipient(to)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject);

    if (text) emailParams.setText(text);
    if (html) emailParams.setHtml(html);

    await mailerSend.email.send(emailParams);
    console.debug(Constants.EmailSuccessResponse);
    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ message: Constants.EmailSuccessResponse }),
    };
  } catch (error) {
    console.debug("failed to send email. details ", error);
    return {
      statusCode: 500,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        error: "failed to send email",
        errorDetails: error,
      }),
    };
  }
};
