# 3-Way Invoice Matching - Database Schema

**Simple 3-way matching: Purchase Order → Bill of Lading → Invoice**

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concept](#core-concept)
3. [Database Tables](#database-tables)
4. [Entity Relationships](#entity-relationships)
5. [Matching Flow](#matching-flow)
6. [Data Types](#data-types)

---

## Overview

This system performs **3-way matching** for freight invoices:
1. **Purchase Order (PO)**: What you agreed to pay
2. **Bill of Lading (BOL)**: What was actually shipped
3. **Invoice**: What the carrier is charging

The system compares all three documents and flags any discrepancies.

---

## Core Concept

```
┌──────────────────┐
│ Purchase Order   │  ← What we agreed to pay
│   $1,000         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Bill of Lading   │  ← What was shipped
│   $1,000         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Carrier Invoice  │  ← What carrier is charging
│   $1,089         │  ❌ MISMATCH: +$89
└──────────────────┘
```

**Match Result**: `AMOUNT_MISMATCH` flag - investigate $89 difference

---

## Database Tables

### 1. `purchase_orders`

Expected costs agreed upon with customer.

```typescript
import { pgTable, text, real, timestamp } from 'drizzle-orm/pg-core';

export const purchaseOrdersTable = pgTable('purchase_orders', {
  id: text('id').primaryKey(),

  // PO details
  po_number: text('po_number').unique().notNull(),
  customer_name: text('customer_name').notNull(),
  carrier_name: text('carrier_name').notNull(),

  // Route
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  pickup_date: timestamp('pickup_date', { mode: 'string' }).notNull(),
  delivery_date: timestamp('delivery_date', { mode: 'string' }).notNull(),

  // Expected charges (from PO)
  expected_charges: text('expected_charges').$type<Array<{
    description: string;
    amount: number;
  }>>().notNull(),
  total_amount: real('total_amount').notNull(),

  // Status
  status: text('status')
    .$type<'pending' | 'bol_received' | 'invoiced' | 'matched' | 'disputed'>()
    .notNull()
    .default('pending'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
```

**Example**:
```json
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
```

---

### 2. `bills_of_lading`

Proof that shipment was delivered.

```typescript
export const billsOfLadingTable = pgTable('bills_of_lading', {
  id: text('id').primaryKey(),

  // BOL details
  bol_number: text('bol_number').unique().notNull(),

  // Link to PO
  po_number: text('po_number').notNull(),
  po_id: text('po_id').references(() => purchaseOrdersTable.id),

  // Shipment details
  carrier_name: text('carrier_name').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  pickup_date: timestamp('pickup_date', { mode: 'string' }).notNull(),
  delivery_date: timestamp('delivery_date', { mode: 'string' }).notNull(),

  // Weight and items
  weight_lbs: real('weight_lbs'),
  item_description: text('item_description'),

  // Actual charges (from BOL, if listed)
  actual_charges: text('actual_charges').$type<Array<{
    description: string;
    amount: number;
  }>>(),

  // POD
  pod_file_id: text('pod_file_id').references(() => filesTable.id),
  pod_signed_at: timestamp('pod_signed_at', { mode: 'string' }),

  // Status
  status: text('status')
    .$type<'pending' | 'delivered' | 'invoiced' | 'matched'>()
    .notNull()
    .default('pending'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export type BillOfLading = typeof billsOfLadingTable.$inferSelect;
```

**Example**:
```json
{
  "bol_number": "BOL-784",
  "po_number": "PO-12345",
  "carrier_name": "Swift Trucking",
  "origin": "Chicago, IL",
  "destination": "Detroit, MI",
  "delivery_date": "2025-10-16T14:30:00Z",
  "weight_lbs": 2500,
  "pod_signed_at": "2025-10-16T14:30:00Z"
}
```

---

### 3. `invoices`

Carrier invoice - what they're actually charging.

```typescript
export const invoicesTable = pgTable('invoices', {
  id: text('id').primaryKey(),

  // Invoice details
  invoice_number: text('invoice_number').unique().notNull(),
  carrier_name: text('carrier_name').notNull(),
  invoice_date: timestamp('invoice_date', { mode: 'string' }).notNull(),

  // References to PO and BOL
  po_number: text('po_number'), // As stated on invoice
  bol_number: text('bol_number'), // As stated on invoice
  po_id: text('po_id').references(() => purchaseOrdersTable.id),
  bol_id: text('bol_id').references(() => billsOfLadingTable.id),

  // Invoice charges
  charges: text('charges').$type<Array<{
    description: string;
    amount: number;
  }>>().notNull(),
  total_amount: real('total_amount').notNull(),

  // Payment terms
  payment_terms: text('payment_terms'), // e.g., "NET 30"
  due_date: timestamp('due_date', { mode: 'string' }),

  // Uploaded file
  invoice_file_id: text('invoice_file_id').references(() => filesTable.id),

  // Matching
  match_type: text('match_type').$type<'exact' | 'fuzzy' | 'manual' | null>(),
  match_confidence: real('match_confidence').default(0),

  // Status
  status: text('status')
    .$type<'pending' | 'matched' | 'flagged' | 'approved' | 'disputed' | 'rejected'>()
    .notNull()
    .default('pending'),

  // Approval
  approved_at: timestamp('approved_at', { mode: 'string' }),
  approved_by: text('approved_by'),
  approval_notes: text('approval_notes'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export type Invoice = typeof invoicesTable.$inferSelect;
```

**Example**:
```json
{
  "invoice_number": "INV-789",
  "carrier_name": "Swift Trucking",
  "po_number": "PO-12345",
  "bol_number": "BOL-784",
  "charges": [
    { "description": "Linehaul", "amount": 1000.00 },
    { "description": "Fuel Surcharge", "amount": 145.00 },
    { "description": "Detention", "amount": 89.00 }  // ← EXTRA!
  ],
  "total_amount": 1234.00
}
```

---

### 4. `flags`

Discrepancies found during 3-way matching.

```typescript
export type FlagCode =
  // Amount mismatches
  | 'AMOUNT_MISMATCH_PO_BOL'        // PO vs BOL amounts differ
  | 'AMOUNT_MISMATCH_PO_INVOICE'    // PO vs Invoice amounts differ
  | 'AMOUNT_MISMATCH_BOL_INVOICE'   // BOL vs Invoice amounts differ

  // Charge mismatches
  | 'UNEXPECTED_CHARGE'              // Charge on invoice not in PO/BOL
  | 'MISSING_CHARGE'                 // Charge in PO not on invoice
  | 'CHARGE_VARIANCE'                // Same charge, different amount

  // Document mismatches
  | 'CARRIER_MISMATCH'               // Different carriers listed
  | 'ROUTE_MISMATCH'                 // Origin/destination differs
  | 'DATE_MISMATCH'                  // Dates don't align

  // Missing documents
  | 'NO_PO_FOUND'                    // Can't find matching PO
  | 'NO_BOL_FOUND'                   // Can't find matching BOL
  | 'MISSING_POD'                    // No proof of delivery

  // Duplicates
  | 'DUPLICATE_INVOICE';             // Invoice already processed

export const flagsTable = pgTable('flags', {
  id: text('id').primaryKey(),

  // What entity is flagged
  entity_type: text('entity_type')
    .$type<'purchase_order' | 'bill_of_lading' | 'invoice'>()
    .notNull(),
  entity_id: text('entity_id').notNull(),

  // Flag details
  code: text('code').$type<FlagCode>().notNull(),
  severity: text('severity').$type<'low' | 'med' | 'high'>().notNull(),
  explanation: text('explanation').notNull(),

  // Context (for display)
  context: text('context').$type<{
    po_amount?: number;
    bol_amount?: number;
    invoice_amount?: number;
    variance?: number;
    variance_pct?: number;
    charge?: string;
    expected?: string;
    actual?: string;
  }>(),

  // Resolution
  resolved_at: timestamp('resolved_at', { mode: 'string' }),
  resolution_action: text('resolution_action')
    .$type<'approved' | 'disputed' | 'rejected'>(),
  resolution_notes: text('resolution_notes'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export type Flag = typeof flagsTable.$inferSelect;
```

**Example Flag**:
```json
{
  "entity_type": "invoice",
  "entity_id": "inv_xyz",
  "code": "UNEXPECTED_CHARGE",
  "severity": "med",
  "explanation": "Charge 'Detention $89.00' appears on invoice but not in PO or BOL",
  "context": {
    "charge": "Detention",
    "invoice_amount": 89.00,
    "po_amount": null,
    "bol_amount": null
  }
}
```

---

### 5. `matching_results`

Store the result of 3-way matching.

```typescript
export const matchingResultsTable = pgTable('matching_results', {
  id: text('id').primaryKey(),

  // The 3 documents
  po_id: text('po_id').references(() => purchaseOrdersTable.id).notNull(),
  bol_id: text('bol_id').references(() => billsOfLadingTable.id),
  invoice_id: text('invoice_id').references(() => invoicesTable.id).notNull(),

  // Match quality
  match_status: text('match_status')
    .$type<'perfect_match' | 'minor_variance' | 'major_variance' | 'no_match'>()
    .notNull(),
  confidence_score: real('confidence_score').notNull(), // 0-1

  // Comparison
  comparison: text('comparison').$type<{
    po_total: number;
    bol_total?: number;
    invoice_total: number;
    variance: number;
    variance_pct: number;

    charge_comparison: Array<{
      description: string;
      po_amount: number | null;
      bol_amount: number | null;
      invoice_amount: number | null;
      status: 'match' | 'variance' | 'missing' | 'extra';
    }>;
  }>(),

  // Flags found
  flags_count: real('flags_count').default(0),
  high_severity_flags: real('high_severity_flags').default(0),

  // Job tracking
  daytona_job_id: text('daytona_job_id'),
  daytona_logs_url: text('daytona_logs_url'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export type MatchingResult = typeof matchingResultsTable.$inferSelect;
```

---

### 6. `files`

File storage for PDFs and PODs.

```typescript
export const filesTable = pgTable('files', {
  id: text('id').primaryKey(),

  filename: text('filename').notNull(),
  mime_type: text('mime_type').notNull(),
  size_bytes: real('size_bytes').notNull(),
  storage_path: text('storage_path').notNull(),

  file_type: text('file_type')
    .$type<'invoice_pdf' | 'pod' | 'po_pdf' | 'bol_pdf' | 'other'>(),

  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export type File = typeof filesTable.$inferSelect;
```

---

## Entity Relationships

```
┌─────────────────────┐
│  purchase_orders    │
│   (what we expect)  │
└──────────┬──────────┘
           │ 1
           │
           │ 0..1
┌──────────▼──────────┐         ┌──────────┐
│  bills_of_lading    │◄────────┤  files   │
│  (what was shipped) │   POD   └──────────┘
└──────────┬──────────┘              ▲
           │ 1                       │
           │                         │
           │ 0..1                    │
┌──────────▼──────────┐              │
│     invoices        │──────────────┘
│ (what carrier bills)│   invoice PDF
└──────────┬──────────┘
           │
           │ 1
           │
           │ N
┌──────────▼──────────┐
│  matching_results   │
│   (3-way match)     │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│       flags         │
│   (discrepancies)   │
└─────────────────────┘
```

---

## Matching Flow

### Step-by-Step Process

```
1. CREATE PURCHASE ORDER
   ↓
   Status: pending
   Expected: $1,145

2. RECEIVE BOL
   ↓
   Status: bol_received
   Link to PO by po_number
   Verify delivery

3. UPLOAD INVOICE
   ↓
   Status: pending
   Extract: PO#, BOL#, charges

4. RUN 3-WAY MATCH
   ↓
   Compare: PO ↔ BOL ↔ Invoice

   Checks:
   ✓ PO total = BOL total?
   ✓ BOL total = Invoice total?
   ✓ All charges match?
   ✓ Carrier matches?
   ✓ Route matches?
   ✓ POD exists?

5. FLAG DISCREPANCIES
   ↓
   If variances found:
   - Create flags
   - Status: flagged

   If perfect match:
   - No flags
   - Status: matched

6. HUMAN REVIEW
   ↓
   Review flags
   Options:
   - Approve (accept variance)
   - Dispute (email carrier)
   - Reject (don't pay)
```

---

## Example Scenarios

### ✅ Perfect Match

```
PO-12345: $1,145
├─ Linehaul: $1,000
└─ Fuel: $145

BOL-784: (references PO-12345)
├─ Delivered: ✓
└─ POD: ✓

INV-789: $1,145
├─ PO: PO-12345
├─ BOL: BOL-784
├─ Linehaul: $1,000
└─ Fuel: $145

Result: ✅ Perfect match, approve
```

---

### ⚠️ Minor Variance

```
PO-12345: $1,145
├─ Linehaul: $1,000
└─ Fuel: $145

BOL-784: (references PO-12345)
└─ Delivered: ✓

INV-789: $1,155
├─ Linehaul: $1,000
├─ Fuel: $145
└─ Lumper Fee: $10  ← EXTRA

Flags:
- UNEXPECTED_CHARGE (med): "Lumper Fee $10 not in PO"
- AMOUNT_MISMATCH_PO_INVOICE (med): "$10 over expected (0.9%)"

Result: ⚠️ Minor variance, review
```

---

### ❌ Major Variance

```
PO-12345: $1,145
├─ Linehaul: $1,000
└─ Fuel: $145

BOL-784: (references PO-12345)
└─ Delivered: ✓

INV-789: $1,234
├─ Linehaul: $1,000
├─ Fuel: $145
└─ Detention: $89  ← MAJOR EXTRA

Flags:
- UNEXPECTED_CHARGE (high): "Detention $89 not in PO or BOL"
- AMOUNT_MISMATCH_PO_INVOICE (high): "$89 over expected (7.8%)"

Result: ❌ Major variance, dispute
```

---

## Data Types

### ID Generation

```typescript
import { nanoid } from 'nanoid';

export type Id<T extends string> = `${T}_${string}`;

export function generateId<T extends string>(prefix: T): Id<T> {
  return `${prefix}_${nanoid(16)}` as Id<T>;
}

// Examples
const poId = generateId('po');      // "po_a1b2c3d4e5f6g7h8"
const bolId = generateId('bol');    // "bol_x9y8z7w6v5u4t3s2"
const invId = generateId('inv');    // "inv_m1n2o3p4q5r6s7t8"
```

### Timestamps

ISO 8601 strings:
```typescript
"2025-10-25T14:30:00.000Z"
```

### Money

Use `real` type (or `DECIMAL(10,2)` in production):
```typescript
real('total_amount').notNull()
```

---

## Summary

**6 Simple Tables**:
1. `purchase_orders` - What we expect to pay
2. `bills_of_lading` - Proof of delivery
3. `invoices` - What carrier bills
4. `matching_results` - 3-way comparison
5. `flags` - Discrepancies found
6. `files` - PDF storage

**Core Flow**:
```
PO → BOL → Invoice → Match → Flag → Approve/Dispute
```

**Key Insight**:
Every invoice must match **both** the PO (agreement) and BOL (delivery) to be approved automatically.
