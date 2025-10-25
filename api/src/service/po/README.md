# Purchase Order Service

## Overview

The Purchase Order (PO) service handles the complete lifecycle of purchase orders, from OCR extraction to creation and management. This service works in conjunction with the OCR and Upload services to provide a seamless experience for processing shipping purchase orders.

### Technology Stack

- **OCR**: Mistral OCR (`mistral-ocr-latest`) for document text extraction
- **AI Parsing**: Google Gemini 2.0 Flash for structured data extraction
- **Storage**: Cloudflare R2 for PDF storage
- **Database**: PostgreSQL with Drizzle ORM

## Flow

### 1. OCR & Auto-fill Flow

```
┌─────────────────┐
│  User uploads   │
│  PDF on form    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  POST /ocr/     │
│  purchase-order │  ← OCR Service extracts data
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Returns        │
│  structured     │  ← Frontend receives extracted data
│  JSON data      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Form auto-     │
│  fills with     │  ← User reviews/edits data
│  extracted data │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User confirms  │
│  & submits      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  POST /po       │  ← Creates PO in database
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Optional: File │
│  uploads to R2  │  ← If PDF included, stored in R2
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PO created     │
│  successfully   │
└─────────────────┘
```

## Types & Interfaces

### Database Entity

```typescript
type POEntity = {
  id: `po_${string}`;                    // Generated ID with 'po_' prefix
  po_number: string;                     // Unique PO number
  customer_name: string;                 // Customer/shipper name
  carrier_name: string;                  // Carrier/trucking company name
  origin: string;                        // Pickup location
  destination: string;                   // Delivery location
  pickup_date: string;                   // ISO timestamp
  delivery_date: string;                 // ISO timestamp
  expected_charges: Array<{              // List of charges from PO
    description: string;
    amount: number;
  }>;
  total_amount: number;                  // Total of all charges
  status: 'pending' | 'bol_received' | 'invoiced' | 'matched' | 'disputed';
  created_at: string;                    // ISO timestamp
  updated_at: string;                    // ISO timestamp
};
```

### OCR Extracted Data

```typescript
type ExtractedPOData = {
  po_number: string;
  customer_name: string;
  carrier_name: string;
  origin: string;
  destination: string;
  pickup_date: string;                   // ISO format (YYYY-MM-DD)
  delivery_date: string;                 // ISO format (YYYY-MM-DD)
  expected_charges: Array<{
    description: string;                 // e.g., "Linehaul", "Fuel Surcharge"
    amount: number;
  }>;
  total_amount: number;
};
```

### Create PO Request

```typescript
type CreatePORequest = {
  po_number: string;
  customer_name: string;
  carrier_name: string;
  origin: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  expected_charges: Array<{
    description: string;
    amount: number;
  }>;
  total_amount: number;
  file?: File;                           // Optional: PDF file to upload
};
```

## API Endpoints

### OCR Endpoint (Step 1)

#### `POST /ocr/purchase-order`

Extracts structured data from a purchase order PDF for form auto-fill using Mistral OCR.

**Processing Steps:**
1. Upload PDF to Mistral cloud
2. OCR processing with `mistral-ocr-latest` model
3. Extract markdown-formatted text
4. Parse text with AI to extract structured data
5. Clean up temporary file from Mistral cloud

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
    po_number: "PO-2024-001",
    customer_name: "Acme Corp",
    carrier_name: "FastTrack Logistics",
    origin: "Los Angeles, CA",
    destination: "New York, NY",
    pickup_date: "2024-01-15",
    delivery_date: "2024-01-20",
    expected_charges: [
      { description: "Linehaul", amount: 1500.00 },
      { description: "Fuel Surcharge", amount: 200.00 }
    ],
    total_amount: 1700.00
  },
  file: {
    id: "f_xyz789",
    filename: "po-2024-001.pdf",
    mime_type: "application/pdf",
    size_bytes: 45678,
    storage_path: "po_pdf/f_xyz789/po-2024-001.pdf",
    file_type: "po_pdf",
    created_at: "2024-10-25T12:00:00.000Z"
  }
}
```

---

### Purchase Order Endpoints (Step 2+)

#### `POST /po`

Creates a new purchase order with optional file upload.

**Request:**
```typescript
Content-Type: multipart/form-data

{
  po_number: string,
  customer_name: string,
  carrier_name: string,
  origin: string,
  destination: string,
  pickup_date: string,
  delivery_date: string,
  expected_charges: Array<{
    description: string,
    amount: number
  }>,
  total_amount: number,
  file?: File  // Optional PDF
}
```

**Response:**
```typescript
{
  success: true,
  purchase_order: {
    id: "po_abc123",
    po_number: "PO-2024-001",
    customer_name: "Acme Corp",
    carrier_name: "FastTrack Logistics",
    origin: "Los Angeles, CA",
    destination: "New York, NY",
    pickup_date: "2024-01-15T00:00:00.000Z",
    delivery_date: "2024-01-20T00:00:00.000Z",
    expected_charges: [...],
    total_amount: 1700.00,
    status: "pending",
    created_at: "2024-10-25T12:00:00.000Z",
    updated_at: "2024-10-25T12:00:00.000Z",
    file_id: "f_xyz789"  // Only if file was uploaded
  }
}
```

---

#### `GET /po/:id`

Retrieves a purchase order by ID.

**Response:**
```typescript
{
  success: true,
  purchase_order: { /* PO object */ }
}
```

---

#### `GET /po/number/:po_number`

Retrieves a purchase order by PO number.

**Response:**
```typescript
{
  success: true,
  purchase_order: { /* PO object */ }
}
```

---

#### `GET /po`

Retrieves all purchase orders with optional filtering.

**Query Parameters:**
- `status?: 'pending' | 'bol_received' | 'invoiced' | 'matched' | 'disputed'`
- `customer_name?: string`
- `carrier_name?: string`

**Response:**
```typescript
{
  success: true,
  purchase_orders: [ /* Array of PO objects */ ],
  count: 10
}
```

---

#### `PATCH /po/:id/status`

Updates the status of a purchase order.

**Request:**
```typescript
{
  status: 'pending' | 'bol_received' | 'invoiced' | 'matched' | 'disputed'
}
```

**Response:**
```typescript
{
  success: true,
  purchase_order: { /* Updated PO object */ }
}
```

## Status Lifecycle

Purchase orders follow this status lifecycle:

```
pending
  ↓
bol_received (when BOL is uploaded/matched)
  ↓
invoiced (when invoice is received)
  ↓
matched (when all documents match)
  ↓
disputed (if discrepancies are found)
```

## Usage Examples

### Frontend Flow Example

```typescript
// Step 1: Upload PDF for OCR
const formData = new FormData();
formData.append('file', pdfFile);

const ocrResponse = await fetch('/ocr/purchase-order', {
  method: 'POST',
  body: formData,
});

const { data: extractedData, file: uploadedFile } = await ocrResponse.json();

// Step 2: Pre-fill form with extracted data
setFormValues({
  po_number: extractedData.po_number,
  customer_name: extractedData.customer_name,
  carrier_name: extractedData.carrier_name,
  origin: extractedData.origin,
  destination: extractedData.destination,
  pickup_date: extractedData.pickup_date,
  delivery_date: extractedData.delivery_date,
  expected_charges: extractedData.expected_charges,
  total_amount: extractedData.total_amount,
});

// Store file ID (file is already uploaded to R2)
setFileId(uploadedFile.id);

// Step 3: User reviews/edits, then submits
// Note: No need to upload file again, just pass the file_id
const createFormData = new FormData();
Object.keys(formValues).forEach(key => {
  if (key === 'expected_charges') {
    createFormData.append(key, JSON.stringify(formValues[key]));
  } else {
    createFormData.append(key, formValues[key]);
  }
});

// Optional: include the file if you want to upload a different one
// Otherwise, the file is already saved from OCR step
if (pdfFile) {
  createFormData.append('file', pdfFile);
}

const createResponse = await fetch('/po', {
  method: 'POST',
  body: createFormData,
});

const { purchase_order } = await createResponse.json();
console.log('Created PO:', purchase_order);
console.log('Associated File ID:', uploadedFile.id);
```

## Service Methods

### POService Class

All methods are static and can be called directly:

```typescript
import { POService } from '@/service/po/po.service';

// Create a PO
const po = await POService.createPO({
  po_number: 'PO-001',
  customer_name: 'Acme Corp',
  // ... other fields
});

// Get PO by ID
const po = await POService.getPOById('po_abc123');

// Get PO by number
const po = await POService.getPOByNumber('PO-001');

// Get all POs with filters
const pos = await POService.getAllPOs({
  status: 'pending',
  carrier_name: 'FastTrack Logistics',
});

// Update status
const updated = await POService.updatePOStatus('po_abc123', 'bol_received');
```

## Error Handling

All methods throw errors with descriptive messages:

```typescript
try {
  const po = await POService.getPOById('invalid_id');
} catch (error) {
  console.error(error.message); // "Purchase order with ID invalid_id not found"
}
```

## File Storage

When a file is uploaded with a PO:
- File is stored in R2 bucket at: `po_pdf/{po_id}/{filename}`
- File metadata is saved to `files` table
- File ID is returned in the response as `file_id`

## Related Services

- **OCR Service** (`/ocr`) - Extracts data from PDFs
- **Upload Service** (`/upload`) - Handles file uploads to R2
- **Files Table** - Tracks all uploaded files

## Database Schema

See `/src/db/schema/purchase-orders.db.ts` for the full database schema definition.
