import { Elysia, t } from 'elysia';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { mistral } from '@/lib/mistral';
import { UploadService } from '@/service/upload/upload.service';
import { type FileEntity } from '@/db/schema/files.db';

const model = google('gemini-2.5-flash');

// Schema for extracted PO data
const purchaseOrderSchema = z.object({
  po_number: z.string().describe('Purchase order number'),
  customer_name: z.string().describe('Customer/shipper name'),
  carrier_name: z.string().describe('Carrier/trucking company name'),
  origin: z.string().describe('Pickup/origin location'),
  destination: z.string().describe('Delivery/destination location'),
  pickup_date: z.string().describe('Pickup date in ISO format (YYYY-MM-DD)'),
  delivery_date: z
    .string()
    .describe('Delivery date in ISO format (YYYY-MM-DD)'),
  expected_charges: z
    .array(
      z.object({
        description: z
          .string()
          .describe('Charge description (e.g., "Linehaul", "Fuel Surcharge")'),
        amount: z.number().describe('Charge amount in dollars'),
      })
    )
    .describe('List of expected charges from the PO'),
  total_amount: z.number().describe('Total amount of all charges'),
});

export type ExtractedPOData = z.infer<typeof purchaseOrderSchema>;

export type OCRResult = {
  data: ExtractedPOData;
  file: FileEntity;
};

// Schema for extracted BOL data
const billOfLadingSchema = z.object({
  bol_number: z.string().describe('Bill of lading number'),
  po_number: z.string().describe('Purchase order number reference'),
  carrier_name: z.string().describe('Carrier/trucking company name'),
  origin: z.string().describe('Pickup/origin location'),
  destination: z.string().describe('Delivery/destination location'),
  pickup_date: z.string().describe('Pickup date in ISO format (YYYY-MM-DD)'),
  delivery_date: z
    .string()
    .describe('Delivery date in ISO format (YYYY-MM-DD)'),
  weight_lbs: z.number().optional().describe('Weight in pounds'),
  item_description: z
    .string()
    .optional()
    .describe('Description of items being shipped'),
  actual_charges: z
    .array(
      z.object({
        description: z.string().describe('Charge description'),
        amount: z.number().describe('Charge amount in dollars'),
      })
    )
    .optional()
    .describe('List of actual charges from the BOL'),
});

export type ExtractedBOLData = z.infer<typeof billOfLadingSchema>;

export type BOLOCRResult = {
  data: ExtractedBOLData;
  file: FileEntity;
};

// Schema for extracted invoice data
const invoiceSchema = z.object({
  invoice_number: z.string().describe('Invoice number'),
  carrier_name: z.string().describe('Carrier/trucking company name'),
  invoice_date: z.string().describe('Invoice date in ISO format (YYYY-MM-DD)'),
  po_number: z
    .string()
    .optional()
    .describe('Purchase order number reference (if present)'),
  bol_number: z
    .string()
    .optional()
    .describe('Bill of lading number reference (if present)'),
  charges: z
    .array(
      z.object({
        description: z
          .string()
          .describe('Charge description (e.g., "Linehaul", "Fuel Surcharge")'),
        amount: z.number().describe('Charge amount in dollars'),
      })
    )
    .describe('List of charges from the invoice'),
  total_amount: z.number().describe('Total invoice amount'),
  payment_terms: z
    .string()
    .optional()
    .describe('Payment terms (e.g., "NET 30")'),
  due_date: z
    .string()
    .optional()
    .describe('Payment due date in ISO format (YYYY-MM-DD)'),
});

export type ExtractedInvoiceData = z.infer<typeof invoiceSchema>;

export type InvoiceOCRResult = {
  data: ExtractedInvoiceData;
  file: FileEntity;
};

export abstract class OCRService {
  /**
   * Performs OCR on PDF using Mistral OCR API
   */
  private static async performMistralOCR(file: File): Promise<string> {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload PDF to Mistral cloud
    const uploadedFile = await mistral.files.upload({
      file: {
        fileName: file.name,
        content: buffer,
      },
      purpose: 'ocr',
    });

    // Get signed URL for the uploaded file
    const signedUrl = await mistral.files.getSignedUrl({
      fileId: uploadedFile.id,
    });

    // Perform OCR with Mistral
    const ocrResponse = await mistral.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: signedUrl.url,
      },
      includeImageBase64: false,
    });

    // Delete the file from Mistral cloud after processing
    await mistral.files.delete({ fileId: uploadedFile.id });

    // Extract text content from OCR response
    // The OCR response contains markdown-formatted text
    const textContent = ocrResponse.pages
      .map((page) => page.markdown)
      .join('\n\n');

    return textContent;
  }

  /**
   * Parses purchase order text using AI to extract structured data
   */
  private static async parsePOText(text: string): Promise<ExtractedPOData> {
    const result = await generateObject({
      model,
      schema: purchaseOrderSchema,
      prompt: `Extract purchase order information from the following OCR text (in markdown format).

Parse all relevant fields including:
- PO number
- Customer/shipper name
- Carrier/trucking company name
- Origin and destination addresses
- Pickup and delivery dates (convert to ISO format YYYY-MM-DD)
- All charges listed (linehaul, fuel surcharge, accessorials, etc.)
- Total amount

The text may contain tables and structured data in markdown format.

Text:
${text}

Extract the data accurately and structure it according to the schema.`,
    });

    return result.object as ExtractedPOData;
  }

  /**
   * Parses bill of lading text using AI to extract structured data
   */
  private static async parseBOLText(text: string): Promise<ExtractedBOLData> {
    const result = await generateObject({
      model,
      schema: billOfLadingSchema,
      prompt: `Extract bill of lading information from the following OCR text (in markdown format).

Parse all relevant fields including:
- BOL number
- PO number (if referenced)
- Carrier/trucking company name
- Origin and destination addresses
- Pickup and delivery dates (convert to ISO format YYYY-MM-DD)
- Weight in pounds (if available)
- Item description (what's being shipped)
- All actual charges listed (if any)

The text may contain tables and structured data in markdown format.

Text:
${text}

Extract the data accurately and structure it according to the schema.`,
    });

    return result.object as ExtractedBOLData;
  }

  /**
   * Main OCR method: extracts and parses purchase order from PDF
   * Also uploads the file to R2 and saves metadata to database
   */
  static async extractPurchaseOrder(file: File): Promise<OCRResult> {
    // Perform OCR with Mistral
    const text = await this.performMistralOCR(file);

    console.log('text', text);

    // Parse text with AI to get structured data
    const extractedData = await this.parsePOText(text);

    // Upload file to R2 and save to database
    const savedFile = await UploadService.uploadFile(file, 'po_pdf');

    return {
      data: extractedData,
      file: savedFile,
    };
  }

  /**
   * Main OCR method: extracts and parses bill of lading from PDF
   * Also uploads the file to R2 and saves metadata to database
   */
  static async extractBillOfLading(file: File): Promise<BOLOCRResult> {
    // Perform OCR with Mistral
    const text = await this.performMistralOCR(file);

    console.log('BOL text', text);

    // Parse text with AI to get structured data
    const extractedData = await this.parseBOLText(text);

    // Upload file to R2 and save to database
    const savedFile = await UploadService.uploadFile(file, 'bol_pdf');

    return {
      data: extractedData,
      file: savedFile,
    };
  }

  /**
   * Parses invoice text using AI to extract structured data
   */
  private static async parseInvoiceText(
    text: string
  ): Promise<ExtractedInvoiceData> {
    const result = await generateObject({
      model,
      schema: invoiceSchema,
      prompt: `Extract invoice information from the following OCR text (in markdown format).

Parse all relevant fields including:
- Invoice number
- Carrier/trucking company name
- Invoice date (convert to ISO format YYYY-MM-DD)
- PO number (if referenced)
- BOL number (if referenced)
- All charges listed (linehaul, fuel surcharge, accessorials, etc.)
- Total amount
- Payment terms (if available)
- Due date (convert to ISO format YYYY-MM-DD if available)

The text may contain tables and structured data in markdown format.

Text:
${text}

Extract the data accurately and structure it according to the schema.`,
    });

    return result.object as ExtractedInvoiceData;
  }

  /**
   * Main OCR method: extracts and parses invoice from PDF
   * Also uploads the file to R2 and saves metadata to database
   */
  static async extractInvoice(file: File): Promise<InvoiceOCRResult> {
    // Perform OCR with Mistral
    const text = await this.performMistralOCR(file);

    console.log('Invoice text', text);

    // Parse text with AI to get structured data
    const extractedData = await this.parseInvoiceText(text);

    // Upload file to R2 and save to database
    const savedFile = await UploadService.uploadFile(file, 'invoice_pdf');

    return {
      data: extractedData,
      file: savedFile,
    };
  }
}

// Elysia routes for OCR
export const ocrRoutes = new Elysia({ prefix: '/ocr' })
  .post(
    '/purchase-order',
    async ({ body }) => {
      const result = await OCRService.extractPurchaseOrder(body.file);
      return {
        success: true,
        data: result.data,
        file: result.file,
      };
    },
    {
      body: t.Object({
        file: t.File({
          type: 'application/pdf',
        }),
      }),
    }
  )
  .post(
    '/bill-of-lading',
    async ({ body }) => {
      const result = await OCRService.extractBillOfLading(body.file);
      return {
        success: true,
        data: result.data,
        file: result.file,
      };
    },
    {
      body: t.Object({
        file: t.File({
          type: 'application/pdf',
        }),
      }),
    }
  )
  .post(
    '/invoice',
    async ({ body }) => {
      const result = await OCRService.extractInvoice(body.file);
      return {
        success: true,
        data: result.data,
        file: result.file,
      };
    },
    {
      body: t.Object({
        file: t.File({
          type: 'application/pdf',
        }),
      }),
    }
  );
