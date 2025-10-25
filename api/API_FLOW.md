# 3-Way Invoice Matching - API Flow

**Simple 3-way matching: Purchase Order → Bill of Lading → Invoice**

---

## System Overview

### The Problem

In freight logistics, you need to verify 3 documents match before paying an invoice:
1. **Purchase Order (PO)**: What you agreed to pay the carrier
2. **Bill of Lading (BOL)**: Proof the shipment was delivered
3. **Invoice**: What the carrier is actually charging

Manually comparing these is tedious and error-prone. This system automates it.

### The Solution

1. Upload carrier invoice PDF
2. AI extracts PO#, BOL#, and charges
3. System matches all 3 documents
4. Flags any discrepancies
5. Shows side-by-side comparison
6. One-click approve or dispute

---

## Core Flow

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: CREATE PURCHASE ORDER                          │
└─────────────────────────────────────────────────────────┘
   POST /api/purchase-orders

   Body:
   {
     "po_number": "PO-12345",
     "customer_name": "ACME Corp",
     "carrier_name": "Swift Trucking",
     "origin": "Chicago, IL",
     "destination": "Detroit, MI",
     "expected_charges": [
       { "description": "Linehaul", "amount": 1000.00 },
       { "description": "Fuel Surcharge", "amount": 145.00 }
     ],
     "total_amount": 1145.00
   }

   Result: PO created, status = "pending"

┌─────────────────────────────────────────────────────────┐
│ STEP 2: RECEIVE BILL OF LADING                         │
└─────────────────────────────────────────────────────────┘
   POST /api/bills-of-lading

   Body:
   {
     "bol_number": "BOL-784",
     "po_number": "PO-12345",
     "carrier_name": "Swift Trucking",
     "delivery_date": "2025-10-16T14:30:00Z",
     "pod_signed": true
   }

   Result: BOL created, linked to PO, status = "delivered"

┌─────────────────────────────────────────────────────────┐
│ STEP 3: UPLOAD INVOICE                                 │
└─────────────────────────────────────────────────────────┘
   POST /api/invoices/upload

   Content-Type: multipart/form-data
   Body: file=invoice.pdf

   Result: Invoice PDF stored, ready for parsing

┌─────────────────────────────────────────────────────────┐
│ STEP 4: PARSE INVOICE WITH AI                          │
└─────────────────────────────────────────────────────────┘
   POST /api/invoices/parse/:invoiceId

   AI extracts:
   {
     "invoice_number": "INV-789",
     "carrier_name": "Swift Trucking",
     "po_number": "PO-12345",
     "bol_number": "BOL-784",
     "charges": [
       { "description": "Linehaul", "amount": 1000.00 },
       { "description": "Fuel Surcharge", "amount": 145.00 },
       { "description": "Detention", "amount": 89.00 }
     ],
     "total_amount": 1234.00
   }

   Result: Structured invoice data created

┌─────────────────────────────────────────────────────────┐
│ STEP 5: RUN 3-WAY MATCH                                │
└─────────────────────────────────────────────────────────┘
   POST /api/invoices/match/:invoiceId

   Matching logic:

   1. Find PO by po_number
   2. Find BOL by bol_number
   3. Compare all 3 documents:

      PO Total:      $1,145.00
      BOL Total:     (not listed)
      Invoice Total: $1,234.00

      Variance: +$89.00 (7.8%)

   4. Compare charges line by line:

      Charge         PO        BOL      Invoice   Status
      ─────────────────────────────────────────────────
      Linehaul       $1,000    -        $1,000    ✓
      Fuel           $145      -        $145      ✓
      Detention      -         -        $89       ❌ EXTRA

   5. Check other fields:
      - Carrier: "Swift Trucking" ✓
      - Route: Chicago → Detroit ✓
      - POD: ✓

   6. Generate flags:
      - UNEXPECTED_CHARGE (med): "Detention $89"
      - AMOUNT_MISMATCH_PO_INVOICE (med): "+$89 (7.8%)"

   Result:
   {
     "match_status": "minor_variance",
     "confidence_score": 0.85,
     "flags": [
       {
         "code": "UNEXPECTED_CHARGE",
         "severity": "med",
         "explanation": "Charge 'Detention $89' not in PO or BOL"
       },
       {
         "code": "AMOUNT_MISMATCH_PO_INVOICE",
         "severity": "med",
         "explanation": "Invoice $1,234 vs PO $1,145 (+$89, 7.8%)"
       }
     ],
     "comparison": {
       "po_total": 1145.00,
       "invoice_total": 1234.00,
       "variance": 89.00,
       "variance_pct": 7.8
     }
   }

┌─────────────────────────────────────────────────────────┐
│ STEP 6: REVIEW AND DECIDE                              │
└─────────────────────────────────────────────────────────┘
   GET /api/invoices/:id/comparison

   Shows side-by-side:

   ┌───────────────────────────────────────────────┐
   │ 3-Way Comparison                              │
   ├───────────────────────────────────────────────┤
   │                                               │
   │ PO-12345        BOL-784        INV-789        │
   │ ─────────────   ────────────   ──────────     │
   │ Linehaul $1000  Delivered ✓    Linehaul $1000│
   │ Fuel $145       POD Signed     Fuel $145      │
   │                                Detention $89  │
   │ ─────────────                  ──────────     │
   │ Total: $1,145                  Total: $1,234  │
   │                                               │
   │ Variance: +$89.00 (7.8%)                      │
   │                                               │
   │ Flags:                                        │
   │ ⚠️ UNEXPECTED_CHARGE: Detention $89           │
   │ ⚠️ AMOUNT_MISMATCH: 7.8% over PO              │
   │                                               │
   │ Actions:                                      │
   │ [ Approve Anyway ]  [ Dispute ]  [ Reject ]   │
   └───────────────────────────────────────────────┘

   Options:

   1. APPROVE:
      POST /api/invoices/:id/approve
      → Mark invoice as approved
      → Move to payment processing

   2. DISPUTE:
      POST /api/invoices/:id/dispute
      → Generate dispute email to carrier
      → Include comparison table
      → Request explanation for detention charge

   3. REJECT:
      POST /api/invoices/:id/reject
      → Mark invoice as rejected
      → Don't pay
```

---

## API Endpoints

### Purchase Orders

#### `POST /api/purchase-orders`

Create a new purchase order.

**Request**:
```json
{
  "po_number": "PO-12345",
  "customer_name": "ACME Corp",
  "carrier_name": "Swift Trucking",
  "origin": "Chicago, IL",
  "destination": "Detroit, MI",
  "pickup_date": "2025-10-15",
  "delivery_date": "2025-10-16",
  "expected_charges": [
    { "description": "Linehaul", "amount": 1000.00 },
    { "description": "Fuel Surcharge", "amount": 145.00 }
  ],
  "total_amount": 1145.00
}
```

**Response**:
```json
{
  "id": "po_abc123",
  "po_number": "PO-12345",
  "status": "pending",
  "total_amount": 1145.00,
  "created_at": "2025-10-25T10:00:00Z"
}
```

---

#### `GET /api/purchase-orders`

List all purchase orders.

**Query Params**:
- `status`: pending | bol_received | invoiced | matched | disputed
- `customer_name`: filter by customer
- `carrier_name`: filter by carrier

**Response**:
```json
{
  "purchase_orders": [
    {
      "id": "po_abc123",
      "po_number": "PO-12345",
      "customer_name": "ACME Corp",
      "carrier_name": "Swift Trucking",
      "total_amount": 1145.00,
      "status": "bol_received",
      "created_at": "2025-10-25T10:00:00Z"
    }
  ]
}
```

---

#### `GET /api/purchase-orders/:id`

Get detailed PO information.

**Response**:
```json
{
  "id": "po_abc123",
  "po_number": "PO-12345",
  "customer_name": "ACME Corp",
  "carrier_name": "Swift Trucking",
  "origin": "Chicago, IL",
  "destination": "Detroit, MI",
  "expected_charges": [
    { "description": "Linehaul", "amount": 1000.00 },
    { "description": "Fuel Surcharge", "amount": 145.00 }
  ],
  "total_amount": 1145.00,
  "status": "bol_received",
  "bol": {
    "bol_number": "BOL-784",
    "delivery_date": "2025-10-16T14:30:00Z",
    "pod_signed": true
  },
  "invoice": null
}
```

---

### Bills of Lading

#### `POST /api/bills-of-lading`

Create or sync a BOL.

**Request**:
```json
{
  "bol_number": "BOL-784",
  "po_number": "PO-12345",
  "carrier_name": "Swift Trucking",
  "origin": "Chicago, IL",
  "destination": "Detroit, MI",
  "pickup_date": "2025-10-15T08:00:00Z",
  "delivery_date": "2025-10-16T14:30:00Z",
  "pod_signed_at": "2025-10-16T14:30:00Z"
}
```

**Response**:
```json
{
  "id": "bol_xyz789",
  "bol_number": "BOL-784",
  "po_id": "po_abc123",
  "status": "delivered",
  "created_at": "2025-10-16T14:30:00Z"
}
```

---

#### `POST /api/bills-of-lading/:id/upload-pod`

Upload proof of delivery.

**Request**:
```
Content-Type: multipart/form-data
file: pod.pdf
```

**Response**:
```json
{
  "bol_id": "bol_xyz789",
  "pod_file_id": "file_pod123",
  "pod_signed_at": "2025-10-16T14:30:00Z"
}
```

---

### Invoices

#### `POST /api/invoices/upload`

Upload invoice PDF.

**Request**:
```
Content-Type: multipart/form-data
file: invoice.pdf
```

**Response**:
```json
{
  "id": "inv_def456",
  "filename": "invoice.pdf",
  "status": "pending",
  "created_at": "2025-10-17T09:00:00Z"
}
```

---

#### `POST /api/invoices/parse/:id`

Parse invoice with AI.

**Response**:
```json
{
  "id": "inv_def456",
  "invoice_number": "INV-789",
  "carrier_name": "Swift Trucking",
  "po_number": "PO-12345",
  "bol_number": "BOL-784",
  "charges": [
    { "description": "Linehaul", "amount": 1000.00 },
    { "description": "Fuel Surcharge", "amount": 145.00 },
    { "description": "Detention", "amount": 89.00 }
  ],
  "total_amount": 1234.00,
  "status": "pending"
}
```

---

#### `POST /api/invoices/match/:id`

Run 3-way match.

**Response**:
```json
{
  "invoice_id": "inv_def456",
  "match_status": "minor_variance",
  "confidence_score": 0.85,
  "po_id": "po_abc123",
  "bol_id": "bol_xyz789",
  "comparison": {
    "po_total": 1145.00,
    "bol_total": null,
    "invoice_total": 1234.00,
    "variance": 89.00,
    "variance_pct": 7.8,
    "charge_comparison": [
      {
        "description": "Linehaul",
        "po_amount": 1000.00,
        "bol_amount": null,
        "invoice_amount": 1000.00,
        "status": "match"
      },
      {
        "description": "Fuel Surcharge",
        "po_amount": 145.00,
        "bol_amount": null,
        "invoice_amount": 145.00,
        "status": "match"
      },
      {
        "description": "Detention",
        "po_amount": null,
        "bol_amount": null,
        "invoice_amount": 89.00,
        "status": "extra"
      }
    ]
  },
  "flags": [
    {
      "code": "UNEXPECTED_CHARGE",
      "severity": "med",
      "explanation": "Charge 'Detention $89.00' appears on invoice but not in PO or BOL"
    },
    {
      "code": "AMOUNT_MISMATCH_PO_INVOICE",
      "severity": "med",
      "explanation": "Invoice $1,234.00 vs PO $1,145.00 (+$89.00, 7.8%)"
    }
  ],
  "daytona_job_id": "job_123",
  "daytona_logs_url": "https://app.daytona.io/jobs/job_123/logs"
}
```

---

#### `GET /api/invoices/:id/comparison`

Get 3-way comparison view.

**Response**:
```json
{
  "purchase_order": {
    "po_number": "PO-12345",
    "total_amount": 1145.00,
    "charges": [
      { "description": "Linehaul", "amount": 1000.00 },
      { "description": "Fuel Surcharge", "amount": 145.00 }
    ]
  },
  "bill_of_lading": {
    "bol_number": "BOL-784",
    "delivery_date": "2025-10-16T14:30:00Z",
    "pod_signed": true
  },
  "invoice": {
    "invoice_number": "INV-789",
    "total_amount": 1234.00,
    "charges": [
      { "description": "Linehaul", "amount": 1000.00 },
      { "description": "Fuel Surcharge", "amount": 145.00 },
      { "description": "Detention", "amount": 89.00 }
    ]
  },
  "comparison": {
    "variance": 89.00,
    "variance_pct": 7.8,
    "matches": 2,
    "mismatches": 1
  },
  "flags": [...]
}
```

---

#### `POST /api/invoices/:id/approve`

Approve invoice.

**Request**:
```json
{
  "notes": "Detention charge verified with driver logs"
}
```

**Response**:
```json
{
  "invoice_id": "inv_def456",
  "status": "approved",
  "approved_at": "2025-10-17T10:30:00Z"
}
```

---

#### `POST /api/invoices/:id/dispute`

Dispute invoice with carrier.

**Request**:
```json
{
  "reason": "Detention charge not authorized",
  "custom_message": "Please provide documentation for detention charge."
}
```

**Response**:
```json
{
  "invoice_id": "inv_def456",
  "status": "disputed",
  "email_preview": "Dear Swift Trucking,\n\nWe've reviewed invoice INV-789 for PO-12345 and identified discrepancies:\n\n...",
  "disputed_at": "2025-10-17T10:35:00Z"
}
```

---

## Demo Scenarios

### ✅ Scenario 1: Perfect Match

**Setup**:
- PO: $1,145 (Linehaul + Fuel)
- BOL: Delivered, POD signed
- Invoice: $1,145 (Linehaul + Fuel)

**Result**: Perfect match, auto-approve

---

### ⚠️ Scenario 2: Minor Variance

**Setup**:
- PO: $1,145
- BOL: Delivered, POD signed
- Invoice: $1,155 (includes $10 lumper fee)

**Flags**: `UNEXPECTED_CHARGE` (med), `AMOUNT_MISMATCH` (med, 0.9%)

**Result**: Minor variance, review and approve

---

### ❌ Scenario 3: Major Variance

**Setup**:
- PO: $1,145
- BOL: Delivered, POD signed
- Invoice: $1,234 (includes $89 detention)

**Flags**: `UNEXPECTED_CHARGE` (high), `AMOUNT_MISMATCH` (high, 7.8%)

**Result**: Major variance, dispute

---

### 🚫 Scenario 4: Missing POD

**Setup**:
- PO: $1,145
- BOL: No POD
- Invoice: $1,145

**Flags**: `MISSING_POD` (high)

**Result**: Cannot approve without POD

---

### 🔍 Scenario 5: No Matching PO

**Setup**:
- Invoice references PO-99999 (doesn't exist)

**Flags**: `NO_PO_FOUND` (high)

**Result**: Manual investigation required

---

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Mistral (via API)
- **Jobs**: Daytona (matching logic)

---

## Next Steps

1. Implement database schema
2. Create API endpoints
3. Build AI parsing service
4. Implement 3-way matching logic
5. Create dashboard UI
6. Add dispute email templates
