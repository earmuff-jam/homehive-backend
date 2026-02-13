/**
 * File : 0002_generate_pdf_fn.js
 * Netlify Function to generate a PDF and return it as a response.
 */
import dayjs from "dayjs";

import { Constants } from "./utils/constants";
import {
  DefaultInvoiceStatusOptions,
  populateCorsHeaders,
  validateRequest,
} from "./utils/utils";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const handler = async (event) => {
  const isValidRequest = validateRequest(event.headers["x-api-key"]);
  if (!isValidRequest) {
    console.debug(Constants.MethodNotAuthorized);
    return {
      statusCode: 401,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }
  if (event.httpMethod !== "POST" && event.httpMethod !== "OPTIONS") {
    return {
      statusCode: 405,
      headers: populateCorsHeaders(),
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: populateCorsHeaders(),
      body: "OK",
    };
  }

  try {
    const payload = JSON.parse(event.body);

    if (!payload || !payload.title) {
      return {
        statusCode: 400,
        headers: populateCorsHeaders(),
        body: JSON.stringify({
          error: "Missing required fields in request body",
        }),
      };
    }

    // ---- Create PDF ----
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]); // Width x Height

    const { width } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // start from top
    let y = 750;

    // --- Title (centered) ---
    const title = payload.title || "Invoice";
    const titleWidth = boldFont.widthOfTextAtSize(title, 24);
    page.drawText(title, {
      x: (width - titleWidth) / 2,
      y,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // --- Caption (centered below title) ---
    const caption = payload.caption || "";
    const captionWidth = font.widthOfTextAtSize(caption, 14);
    page.drawText(caption, {
      x: (width - captionWidth) / 2,
      y,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // --- Created on date (right-aligned) ---
    const createdOn = dayjs(payload?.updatedOn) || dayjs();
    const createdText = `Created on ${createdOn.format("DD-MM-YYYY")}`;
    const createdWidth = font.widthOfTextAtSize(createdText, 12);
    page.drawText(createdText, {
      x: width - createdWidth - 50, // 50px margin
      y,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    // --- Billing period (left-aligned, italicized) ---
    const startDate = dayjs(payload?.startDate) || dayjs();
    const endDate = dayjs(payload?.endDate) || dayjs();
    const periodText = `Period: ${startDate.format("DD-MM-YYYY")} to ${endDate.format("DD-MM-YYYY")}`;
    page.drawText(periodText, {
      x: 50, // left margin
      y,
      size: 8,
      font: italicFont,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Items
    // --- Items Table Header ---
    page.drawText("Category", { x: 50, y, size: 9, font: boldFont });
    page.drawText("Description", { x: 120, y, size: 9, font: boldFont });
    page.drawText("Qty", { x: 300, y, size: 9, font: boldFont });
    page.drawText("Cost", { x: 350, y, size: 9, font: boldFont });
    page.drawText("Payment Received", { x: 400, y, size: 9, font: boldFont });
    page.drawText("Balance Due", { x: 500, y, size: 9, font: boldFont });
    y -= 20;

    // --- Items ---
    let draftSubtotal = 0;
    if (Array.isArray(payload.lineItems)) {
      payload.lineItems.forEach((item) => {
        const { category, description, quantity, price, payment } = item;

        const draftPaymentDue = Number(price) - Number(payment) || 0;
        const paymentDue = draftPaymentDue.toFixed(2);
        draftSubtotal += draftPaymentDue;
        page.drawText(`${category.label}`, {
          x: 50,
          y,
          size: 8,
          font,
        });
        page.drawText(`${description}`, { x: 120, y, size: 8, font });
        page.drawText(`${quantity}`, { x: 300, y, size: 8, font });
        page.drawText(`${price}`, { x: 350, y, size: 8, font });
        page.drawText(`${payment}`, { x: 435, y, size: 8, font });
        page.drawText(`${paymentDue}`, { x: 520, y, size: 8, font });

        y -= 20;
      });
    }

    // Add some extra height after line items are displayed through
    y -= 10;

    // Subtotal
    const subtotal = draftSubtotal.toFixed(2);
    page.drawText("Subtotal", { x: 120, y, size: 9, font: boldFont });
    page.drawText(`$${subtotal}`, {
      x: 520, // left margin
      y,
      size: 8,
      font: boldFont,
    });
    y -= 30;

    // Tax
    const taxRate = Number(payload.taxRate) / 100;
    const taxAmount = draftSubtotal * taxRate;
    page.drawText("Tax", { x: 120, y, size: 9, font: boldFont });
    page.drawText(`${payload.taxRate}%`, {
      x: 435, // left margin
      y,
      size: 8,
      font: boldFont,
    });
    y -= 30;

    // Total
    const draftTotal = draftSubtotal + taxAmount;
    const total = draftTotal.toFixed(2);
    page.drawText("Total", { x: 120, y, size: 9, font: boldFont });
    page.drawText(`$${total}`, {
      x: 520, // left margin
      y,
      size: 8,
      font: boldFont,
    });
    y -= 30;

    // invoice status
    const draftInvoiceStatus =
      DefaultInvoiceStatusOptions.find(
        (option) => option.label === payload.invoiceStatus.label,
      ) || DefaultInvoiceStatusOptions[5];

    drawTextBox({
      page,
      text: `${draftInvoiceStatus.label.toUpperCase()}`,
      x: 250,
      y: y + 30, // push invoice status up
      width: 120,
      height: 30,
      font: font,
      fontSize: 32,
      textColor: draftInvoiceStatus.textColor,
      borderColor: draftInvoiceStatus.borderColor,
    });

    // Save PDF to bytes
    const pdfBytes = await pdfDoc.save();

    return {
      statusCode: 200,
      headers: {
        ...populateCorsHeaders(),
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=document.pdf",
      },
      body: Buffer.from(pdfBytes).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: populateCorsHeaders(),
      body: JSON.stringify({
        error: "Failed to generate PDF.",
        errorDetails: error?.message ?? error,
      }),
    };
  }
};

// drawTextBox ...
// draws the text box for invoice status
const drawTextBox = ({
  page,
  text,
  x,
  y,
  width,
  height,
  font,
  fontSize = 10,
  textColor = rgb(0, 0, 0),
  borderColor = rgb(0.9, 0.9, 0.9),
}) => {
  // Draw box
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: borderColor,
    borderWidth: 4,
  });

  // Calculate centered text position
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textX = x + (width - textWidth) / 2;
  const textY = y + (height - fontSize) / 2 + 5; // small vertical tweak

  // Draw text
  page.drawText(text, {
    x: textX,
    y: textY,
    size: fontSize,
    font,
    color: textColor,
  });
};
