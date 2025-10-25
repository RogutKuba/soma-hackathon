# Bill of Lading (BOL) Service

## Overview

The Bill of Lading (BOL) service handles the complete lifecycle of bills of lading, from creation to proof of delivery (POD) attachment. Bills of lading are documents that confirm shipment of goods and can be linked to purchase orders for matching and verification.

## Features

- **CRUD Operations**: Create, read, update BOLs
- **PO Linking**: Link BOLs to purchase orders for tracking
- **POD Management**: Attach proof of delivery documents
- **Status Tracking**: Track shipment status through lifecycle
- **Filtering**: Query BOLs by status, carrier, PO, etc.

## Types & Interfaces

### Database Entity

```typescript
type BOLEntity = {
  id: `bol_${string}`;                    // Generated ID with 'bol_' prefix
  bol_number: string;                     // Unique BOL number
  po_number: string;                      // Associated PO number
  po_id: `po_${string}` | null;          // Link to PO (optional)
  carrier_name: string;                   // Carrier/trucking company name
  origin: string;                         // Pickup location
  destination: string;                    // Delivery location
  pickup_date: string;                    // ISO timestamp
  delivery_date: string;                  // ISO timestamp
  weight_lbs: number | null;             // Shipment weight in pounds
  item_description: string | null;        // Description of items shipped
  actual_charges: Array<{                 // Actual charges from BOL
    description: string;
    amount: number;
  }> | null;
  pod_file_id: `file_${string}` | null;  // Proof of delivery file
  pod_signed_at: string | null;           // POD signature timestamp
  status: 'pending' | 'delivered' | 'invoiced' | 'matched';
  created_at: string;                     // ISO timestamp
  updated_at: string;                     // ISO timestamp
};
```

### Create BOL Request

```typescript
type CreateBOLRequest = {
  bol_number: string;
  po_number: string;
  po_id?: string;                         // Optional PO ID for immediate linking
  carrier_name: string;
  origin: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  weight_lbs?: number;
  item_description?: string;
  actual_charges?: Array<{
    description: string;
    amount: number;
  }>;
  pod_file_id?: string;                   // Optional POD file at creation
  pod_signed_at?: string;                 // Optional POD signature time
};
```

## API Endpoints

### `POST /bol`

Creates a new bill of lading.

**Request:**
```typescript
{
  bol_number: string;
  po_number: string;
  po_id?: string;
  carrier_name: string;
  origin: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  weight_lbs?: number;
  item_description?: string;
  actual_charges?: Array<{
    description: string;
    amount: number;
  }>;
  pod_file_id?: string;
  pod_signed_at?: string;
}
```

**Response:**
```typescript
{
  success: true,
  bill_of_lading: {
    id: "bol_abc123",
    bol_number: "BOL-2024-001",
    po_number: "PO-2024-001",
    po_id: "po_xyz789",
    carrier_name: "FastTrack Logistics",
    origin: "Los Angeles, CA",
    destination: "New York, NY",
    pickup_date: "2024-01-15T00:00:00.000Z",
    delivery_date: "2024-01-20T00:00:00.000Z",
    weight_lbs: 5000,
    item_description: "Electronics and components",
    actual_charges: [
      { description: "Linehaul", amount: 1500.00 },
      { description: "Fuel Surcharge", amount: 200.00 }
    ],
    pod_file_id: null,
    pod_signed_at: null,
    status: "pending",
    created_at: "2024-10-25T12:00:00.000Z",
    updated_at: "2024-10-25T12:00:00.000Z"
  }
}
```

---

### `GET /bol/:id`

Retrieves a bill of lading by ID.

**Response:**
```typescript
{
  success: true,
  bill_of_lading: { /* BOL object */ }
}
```

---

### `GET /bol/number/:bol_number`

Retrieves a bill of lading by BOL number.

**Response:**
```typescript
{
  success: true,
  bill_of_lading: { /* BOL object */ }
}
```

---

### `GET /bol/po/:po_id`

Retrieves all bills of lading for a specific purchase order by PO ID.

**Response:**
```typescript
{
  success: true,
  bills_of_lading: [ /* Array of BOL objects */ ],
  count: 3
}
```

---

### `GET /bol/po/number/:po_number`

Retrieves all bills of lading for a specific purchase order by PO number.

**Response:**
```typescript
{
  success: true,
  bills_of_lading: [ /* Array of BOL objects */ ],
  count: 3
}
```

---

### `GET /bol`

Retrieves all bills of lading with optional filtering.

**Query Parameters:**
- `status?: 'pending' | 'delivered' | 'invoiced' | 'matched'`
- `carrier_name?: string`

**Example:**
```
GET /bol?status=delivered&carrier_name=FastTrack%20Logistics
```

**Response:**
```typescript
{
  success: true,
  bills_of_lading: [ /* Array of BOL objects */ ],
  count: 10
}
```

---

### `PATCH /bol/:id/status`

Updates the status of a bill of lading.

**Request:**
```typescript
{
  status: 'pending' | 'delivered' | 'invoiced' | 'matched'
}
```

**Response:**
```typescript
{
  success: true,
  bill_of_lading: { /* Updated BOL object */ }
}
```

---

### `PATCH /bol/:id/pod`

Attaches proof of delivery (POD) to a bill of lading. Automatically sets status to 'delivered'.

**Request:**
```typescript
{
  pod_file_id: string;
  signed_at?: string;  // Defaults to current timestamp if not provided
}
```

**Response:**
```typescript
{
  success: true,
  bill_of_lading: {
    /* BOL object with POD attached and status = 'delivered' */
  }
}
```

---

### `PATCH /bol/:id/link-po`

Links a bill of lading to a purchase order.

**Request:**
```typescript
{
  po_id: string;
}
```

**Response:**
```typescript
{
  success: true,
  bill_of_lading: { /* BOL object with po_id set */ }
}
```

## Status Lifecycle

Bills of lading follow this status lifecycle:

```
pending
  ↓
delivered (when POD is attached)
  ↓
invoiced (when invoice is received)
  ↓
matched (when BOL matches PO and invoice)
```

## Service Methods

### BOLService Class

All methods are static and can be called directly:

```typescript
import { BOLService } from '@/service/bol/bol.service';

// Create a BOL
const bol = await BOLService.createBOL({
  bol_number: 'BOL-001',
  po_number: 'PO-001',
  carrier_name: 'FastTrack Logistics',
  // ... other fields
});

// Get BOL by ID
const bol = await BOLService.getBOLById('bol_abc123');

// Get BOL by number
const bol = await BOLService.getBOLByNumber('BOL-001');

// Get all BOLs for a PO
const bols = await BOLService.getBOLsByPOId('po_xyz789');
const bolsByNumber = await BOLService.getBOLsByPONumber('PO-001');

// Get all BOLs with filters
const bols = await BOLService.getAllBOLs({
  status: 'delivered',
  carrier_name: 'FastTrack Logistics',
});

// Update status
const updated = await BOLService.updateBOLStatus('bol_abc123', 'delivered');

// Attach POD
const withPod = await BOLService.attachPOD(
  'bol_abc123',
  'file_pod123',
  '2024-01-20T15:30:00.000Z'
);

// Link to PO
const linked = await BOLService.linkToPO('bol_abc123', 'po_xyz789');
```

## Common Workflows

### 1. Create BOL and Link to PO

```typescript
// Option A: Link at creation
const bol = await BOLService.createBOL({
  bol_number: 'BOL-001',
  po_number: 'PO-001',
  po_id: 'po_xyz789',  // Link immediately
  // ... other fields
});

// Option B: Link after creation
const bol = await BOLService.createBOL({
  bol_number: 'BOL-001',
  po_number: 'PO-001',
  // ... other fields
});

await BOLService.linkToPO(bol.id, 'po_xyz789');
```

### 2. Process Delivery with POD

```typescript
// Upload POD file
const podFile = await UploadService.uploadFile(file, 'pod');

// Attach POD to BOL (automatically sets status to 'delivered')
const bol = await BOLService.attachPOD(
  bolId,
  podFile.id,
  new Date().toISOString()
);
```

### 3. Match BOL with PO

```typescript
// Get BOLs for a PO
const bols = await BOLService.getBOLsByPOId(poId);

// Get PO for comparison
const po = await POService.getPOById(poId);

// Compare charges and match
for (const bol of bols) {
  if (chargesMatch(po.expected_charges, bol.actual_charges)) {
    await BOLService.updateBOLStatus(bol.id, 'matched');
  }
}
```

## Error Handling

All methods throw descriptive errors for various failure cases:

```typescript
try {
  const bol = await BOLService.getBOLById('invalid_id');
} catch (error) {
  console.error(error.message); // "Bill of lading with ID invalid_id not found"
}
```

## Integration with Other Services

### Purchase Order Service
- BOLs link to POs via `po_id` and `po_number`
- Use `getBOLsByPOId()` or `getBOLsByPONumber()` to find related BOLs
- Match expected charges (PO) with actual charges (BOL)

### Upload Service
- POD files stored via Upload Service
- `pod_file_id` references the uploaded file
- File type should be `'pod'`

### Matching Service
- Compare BOL actual charges with PO expected charges
- Verify delivery dates, origin, destination
- Flag discrepancies for review

## Best Practices

1. **Always link to PO**: Set `po_id` when creating BOL or use `linkToPO()`
2. **Upload POD immediately**: Attach POD as soon as delivery is confirmed
3. **Track actual charges**: Record actual charges for accurate matching
4. **Use unique BOL numbers**: Ensure BOL numbers are unique across system
5. **Validate before matching**: Check all fields match before setting status to 'matched'

## Database Schema

See `/src/db/schema/bills-of-lading.db.ts` for the full database schema definition.

## Related Services

- **Purchase Order Service** (`/purchase-orders`) - Links BOLs to POs
- **Upload Service** (`/upload`) - Handles POD file uploads
- **Matching Service** - Compares BOLs, POs, and invoices
