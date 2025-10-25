# Database Schema

**3-Way Invoice Matching** - 6 tables for PO → BOL → Invoice matching

---

## Tables

### 1. `purchase_orders`
Expected costs agreed upon with customer.

**Key Fields**:
- `po_number` - Unique PO number (e.g., "PO-12345")
- `expected_charges` - JSON array of charges
- `total_amount` - Total expected cost
- `status` - pending | bol_received | invoiced | matched | disputed

### 2. `bills_of_lading`
Proof that shipment was delivered.

**Key Fields**:
- `bol_number` - Unique BOL number (e.g., "BOL-784")
- `po_id` - Links to purchase order
- `pod_file_id` - Proof of delivery file
- `pod_signed_at` - When POD was signed
- `status` - pending | delivered | invoiced | matched

### 3. `invoices`
Carrier invoice - what they're actually charging.

**Key Fields**:
- `invoice_number` - Unique invoice number (e.g., "INV-789")
- `po_number`, `bol_number` - References from invoice
- `po_id`, `bol_id` - Links to matched documents
- `charges` - JSON array of line items
- `match_type` - exact | fuzzy | manual
- `status` - pending | matched | flagged | approved | disputed | rejected

### 4. `flags`
Discrepancies found during 3-way matching.

**Key Fields**:
- `entity_type` - purchase_order | bill_of_lading | invoice
- `entity_id` - ID of flagged entity
- `code` - Type of flag (e.g., AMOUNT_MISMATCH_PO_INVOICE)
- `severity` - low | med | high
- `context` - JSON with variance details

**Flag Types**:
- Amount mismatches (3 types)
- Charge mismatches (3 types)
- Document mismatches (3 types)
- Missing documents (3 types)
- Duplicates (1 type)

### 5. `matching_results`
Store the result of 3-way matching.

**Key Fields**:
- `po_id`, `bol_id`, `invoice_id` - The 3 documents
- `match_status` - perfect_match | minor_variance | major_variance | no_match
- `confidence_score` - 0-1 match confidence
- `comparison` - JSON with detailed comparison
- `daytona_job_id` - Job tracking for audit

### 6. `files`
File storage for PDFs and PODs.

**Key Fields**:
- `filename` - Original filename
- `storage_path` - Path in storage
- `file_type` - invoice_pdf | pod | po_pdf | bol_pdf | other
- `size_bytes` - File size

---

## Relationships

```
purchase_orders (1) ←→ (0..1) bills_of_lading
                                    ↓ (0..1)
                              invoices
                                    ↓ (1)
                            matching_results
                                    ↓ (N)
                                  flags

files ←→ (invoices, bills_of_lading)
```

---

## Usage

```typescript
import { db, purchaseOrdersTable, invoicesTable } from '@/db/client';
import { eq } from 'drizzle-orm';

// Query example
const pos = await db.query.purchaseOrdersTable.findMany({
  where: eq(purchaseOrdersTable.status, 'pending'),
});

// Insert example
await db.insert(invoicesTable).values({
  id: 'inv_abc123',
  invoice_number: 'INV-789',
  carrier_name: 'Swift Trucking',
  charges: [
    { description: 'Linehaul', amount: 1000 },
    { description: 'Fuel', amount: 145 }
  ],
  total_amount: 1145,
  status: 'pending',
});
```

---

## ID Prefixes

- `po_*` - Purchase Orders
- `bol_*` - Bills of Lading
- `inv_*` - Invoices
- `flag_*` - Flags
- `match_*` - Matching Results
- `file_*` - Files

---

## Migration

Generate migration:
```bash
bun drizzle-kit generate:pg
```

Push to database:
```bash
bun drizzle-kit push:pg
```

---

For full documentation, see:
- `api/DATABASE_SCHEMA.md` - Complete schema documentation
- `api/API_FLOW.md` - API flow and endpoints
