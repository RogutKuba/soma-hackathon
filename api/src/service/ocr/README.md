# OCR Service

## Overview

The OCR service extracts structured data from purchase order PDFs using Mistral's Document AI OCR API. It combines Mistral's powerful OCR capabilities with AI-powered parsing to return structured, type-safe data ready for form auto-fill.

## Architecture

```
PDF Upload
    ↓
Upload to Mistral Cloud
    ↓
Get Signed URL
    ↓
Mistral OCR Processing (mistral-ocr-latest)
    ↓
Markdown-formatted text extraction
    ↓
AI Parsing (Gemini 2.5 Flash)
    ↓
Structured JSON output
    ↓
Upload to R2 & Save to Database
    ↓
Cleanup (delete from Mistral cloud)
    ↓
Return: Extracted Data + File Entity
```

## Features

- **High Accuracy OCR**: Powered by Mistral's `mistral-ocr-latest` model
- **Structure Preservation**: Maintains document hierarchy, tables, and formatting
- **Markdown Output**: OCR results in markdown format for easy parsing
- **AI-Powered Parsing**: Gemini extracts structured data from OCR text
- **Automatic File Upload**: Files saved to R2 and database automatically
- **Auto Cleanup**: Temporary files automatically deleted from Mistral cloud
- **Type Safety**: Fully typed with Zod schemas

## Supported Formats

- PDF documents (`.pdf`)
- Multi-page documents
- Documents with tables and complex layouts
- Mixed content (text, tables, headers)

## API Endpoint

### `POST /ocr/purchase-order`

Extracts structured purchase order data from a PDF.

**Request:**
```typescript
Content-Type: multipart/form-data

{
  file: File (application/pdf)
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    po_number: string;
    customer_name: string;
    carrier_name: string;
    origin: string;
    destination: string;
    pickup_date: string;        // ISO format (YYYY-MM-DD)
    delivery_date: string;       // ISO format (YYYY-MM-DD)
    expected_charges: Array<{
      description: string;
      amount: number;
    }>;
    total_amount: number;
  },
  file: {
    id: string;                 // File ID (e.g., "f_abc123")
    filename: string;            // Original filename
    mime_type: string;           // "application/pdf"
    size_bytes: number;          // File size
    storage_path: string;        // R2 storage path
    file_type: "po_pdf";         // File type
    created_at: string;          // ISO timestamp
  }
}
```

## Service Methods

### OCRService Class

All methods are static and can be called directly:

```typescript
import { OCRService } from '@/service/ocr/ocr.service';

// Extract PO data from PDF
const data = await OCRService.extractPurchaseOrder(pdfFile);
console.log(data.po_number);
console.log(data.customer_name);
```

### Private Methods

#### `performMistralOCR(file: File): Promise<string>`

Performs OCR on a PDF using Mistral's API.

**Steps:**
1. Converts file to buffer
2. Uploads to Mistral cloud with `purpose: 'ocr'`
3. Gets signed URL for the uploaded file
4. Processes with Mistral OCR API
5. Extracts markdown-formatted text
6. Deletes file from Mistral cloud
7. Returns text content

**Mistral API Calls:**
- `mistral.files.upload()` - Upload PDF
- `mistral.files.getSignedUrl()` - Get temporary access URL
- `mistral.ocr.process()` - Perform OCR
- `mistral.files.delete()` - Cleanup

#### `parsePOText(text: string): Promise<ExtractedPOData>`

Parses OCR text using AI to extract structured data.

**Features:**
- Uses Gemini 2.0 Flash Experimental model
- Zod schema validation
- Handles markdown-formatted tables
- Converts dates to ISO format
- Extracts all charges and calculates totals

## Type Definitions

### ExtractedPOData

```typescript
type ExtractedPOData = {
  po_number: string;
  customer_name: string;
  carrier_name: string;
  origin: string;
  destination: string;
  pickup_date: string;          // ISO format (YYYY-MM-DD)
  delivery_date: string;         // ISO format (YYYY-MM-DD)
  expected_charges: Array<{
    description: string;         // e.g., "Linehaul", "Fuel Surcharge"
    amount: number;
  }>;
  total_amount: number;
};
```

### OCRResult

```typescript
type OCRResult = {
  data: ExtractedPOData;
  file: {
    id: string;                 // File ID
    filename: string;            // Original filename
    mime_type: string;           // MIME type
    size_bytes: number;          // File size in bytes
    storage_path: string;        // R2 storage path
    file_type: "po_pdf";         // File type
    created_at: string;          // ISO timestamp
  };
};
```

## Example Usage

### Basic Usage

```typescript
// In your route handler
const file = request.file;
const result = await OCRService.extractPurchaseOrder(file);

// Use extracted data
console.log(`PO Number: ${result.data.po_number}`);
console.log(`From: ${result.data.origin}`);
console.log(`To: ${result.data.destination}`);
console.log(`Total: $${result.data.total_amount}`);

// File is already saved to R2 and database
console.log(`File ID: ${result.file.id}`);
console.log(`Stored at: ${result.file.storage_path}`);
```

### Frontend Integration

```typescript
// Upload PDF for OCR
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch('/ocr/purchase-order', {
  method: 'POST',
  body: formData,
});

const { success, data, file } = await response.json();

if (success) {
  // Auto-fill form with extracted data
  setFormValues(data);

  // Store file ID for later use (when creating PO)
  setFileId(file.id);

  // Show file info to user
  console.log(`Uploaded: ${file.filename} (${file.size_bytes} bytes)`);
}
```

## Error Handling

The service throws descriptive errors for various failure cases:

```typescript
try {
  const data = await OCRService.extractPurchaseOrder(file);
} catch (error) {
  // Handle OCR errors
  if (error.message.includes('Mistral')) {
    console.error('OCR processing failed:', error);
  }
  // Handle parsing errors
  if (error.message.includes('schema')) {
    console.error('Data extraction failed:', error);
  }
}
```

## Performance Considerations

- **OCR Processing**: Typically 2-5 seconds for standard documents
- **AI Parsing**: Additional 1-2 seconds for structured extraction
- **Total Time**: Usually 3-7 seconds end-to-end
- **File Size Limit**: Supports standard PDF sizes (check Mistral API limits)

## Mistral OCR Features

### What Mistral OCR Provides

- Text extraction with document structure preservation
- Formatting like headers, paragraphs, lists, and tables
- Markdown output for easy parsing
- Complex layout handling (multi-column, mixed content)
- High accuracy on various document types
- Support for multiple formats (PDF, images, PPTX, DOCX)

### OCR Response Format

Mistral OCR returns:
- **text**: Markdown-formatted extracted content
- **images**: Bounding boxes for images (if `includeImageBase64: true`)
- **metadata**: Document structure information

## Configuration

### Environment Variables

Required in `.env`:
```bash
MISTRAL_API_KEY=your_mistral_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
```

### Models Used

- **OCR**: `mistral-ocr-latest` (Mistral's latest OCR model)
- **Parsing**: `gemini-2.0-flash-exp` (Google Gemini for structured extraction)

## Best Practices

1. **File Validation**: Validate PDF format before processing
2. **Error Handling**: Implement retry logic for transient failures
3. **Rate Limiting**: Consider rate limits for both Mistral and Google APIs
4. **Caching**: Cache OCR results if the same PDF might be processed multiple times
5. **Monitoring**: Track OCR success rates and processing times

## Limitations

- Mistral API rate limits apply
- Document quality affects OCR accuracy
- Complex layouts may require manual review
- AI parsing accuracy depends on document standardization

## Related Services

- **Purchase Order Service** (`/po`) - Creates POs from extracted data
- **Upload Service** (`/upload`) - Stores PDFs in R2
- **Mistral Client** (`@/lib/mistral`) - Mistral API client

## Resources

- [Mistral OCR Documentation](https://docs.mistral.ai/capabilities/document-ai/)
- [Mistral API Reference](https://docs.mistral.ai/api/)
- [Google Gemini Documentation](https://ai.google.dev/docs)
