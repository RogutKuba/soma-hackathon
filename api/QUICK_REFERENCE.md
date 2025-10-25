# 3-Way Invoice Matching - Quick Reference

**TL;DR**: Automate invoice validation by matching PO → BOL → Invoice

---

## Core Concept

```
Purchase Order (PO)     What we agreed to pay
        ↓
Bill of Lading (BOL)    Proof of delivery
        ↓
Invoice                 What carrier bills
        ↓
3-Way Match             Compare all 3
        ↓
Approve or Dispute      Automated decision
```

---

## 6 Simple Tables

| Table | Purpose |
|-------|---------|
| `purchase_orders` | Expected costs from agreement |
| `bills_of_lading` | Delivery proof with POD |
| `invoices` | Carrier charges |
| `matching_results` | 3-way comparison |
| `flags` | Discrepancies found |
| `files` | PDF storage |

---

## Core Flow (6 Steps)

```
1. Create PO          → POST /api/purchase-orders
2. Receive BOL        → POST /api/bills-of-lading
3. Upload Invoice     → POST /api/invoices/upload
4. Parse with AI      → POST /api/invoices/parse/:id
5. Run 3-Way Match    → POST /api/invoices/match/:id
6. Approve/Dispute    → POST /api/invoices/:id/approve
```

---

## Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/purchase-orders` | POST | Create PO |
| `/api/bills-of-lading` | POST | Create BOL |
| `/api/invoices/upload` | POST | Upload invoice PDF |
| `/api/invoices/parse/:id` | POST | Extract data with AI |
| `/api/invoices/match/:id` | POST | Run 3-way match |
| `/api/invoices/:id/comparison` | GET | View side-by-side |
| `/api/invoices/:id/approve` | POST | Approve invoice |
| `/api/invoices/:id/dispute` | POST | Dispute with carrier |

---

## Flag Types

### Amount Mismatches
- `AMOUNT_MISMATCH_PO_INVOICE` - Invoice differs from PO
- `AMOUNT_MISMATCH_BOL_INVOICE` - Invoice differs from BOL
- `AMOUNT_MISMATCH_PO_BOL` - PO and BOL differ

### Charge Mismatches
- `UNEXPECTED_CHARGE` - Extra charge on invoice
- `MISSING_CHARGE` - Expected charge missing
- `CHARGE_VARIANCE` - Charge amount differs

### Document Issues
- `NO_PO_FOUND` - Can't find PO
- `NO_BOL_FOUND` - Can't find BOL
- `MISSING_POD` - No proof of delivery
- `CARRIER_MISMATCH` - Different carriers
- `ROUTE_MISMATCH` - Origin/destination differs
- `DUPLICATE_INVOICE` - Already processed

**Severity Levels**:
- `high` - Blocks approval (e.g., NO_PO_FOUND, MISSING_POD)
- `med` - Warns (e.g., UNEXPECTED_CHARGE)
- `low` - Logs (e.g., minor variance)

---

## Invoice Status Flow

```
pending → matched → flagged/approved → disputed/rejected
```

---

## Example: Perfect Match ✅

```
PO-12345:
  Linehaul: $1,000
  Fuel: $145
  Total: $1,145

BOL-784:
  PO: PO-12345
  Delivered ✓
  POD Signed ✓

INV-789:
  PO: PO-12345
  BOL: BOL-784
  Linehaul: $1,000
  Fuel: $145
  Total: $1,145

Result: ✅ Perfect match - auto approve
```

---

## Example: Minor Variance ⚠️

```
PO-12345:
  Linehaul: $1,000
  Fuel: $145
  Total: $1,145

BOL-784:
  Delivered ✓

INV-789:
  Linehaul: $1,000
  Fuel: $145
  Lumper Fee: $10  ← EXTRA
  Total: $1,155

Flags:
  - UNEXPECTED_CHARGE (med): "Lumper Fee $10"
  - AMOUNT_MISMATCH_PO_INVOICE (med): "+$10 (0.9%)"

Result: ⚠️ Review and approve/dispute
```

---

## Example: Major Variance ❌

```
PO-12345:
  Total: $1,145

INV-789:
  Base charges: $1,145
  Detention: $89  ← MAJOR EXTRA
  Total: $1,234

Flags:
  - UNEXPECTED_CHARGE (high): "Detention $89"
  - AMOUNT_MISMATCH_PO_INVOICE (high): "+$89 (7.8%)"

Result: ❌ Dispute with carrier
```

---

## AI Parsing Schema

```typescript
import { z } from 'zod';

const invoiceSchema = z.object({
  invoice_number: z.string(),
  carrier_name: z.string(),
  po_number: z.string().optional(),
  bol_number: z.string().optional(),
  invoice_date: z.string(),
  charges: z.array(z.object({
    description: z.string(),
    amount: z.number()
  })),
  total_amount: z.number(),
  payment_terms: z.string().optional()
});

// Use with Mistral AI
const result = await mistral.generateObject({
  prompt: `Extract invoice data from: ${pdfText}`,
  schema: invoiceSchema
});
```

---

## Database Schema (Simplified)

### purchase_orders
```typescript
{
  id: "po_abc123",
  po_number: "PO-12345",
  carrier_name: "Swift Trucking",
  expected_charges: [...],
  total_amount: 1145.00,
  status: "pending"
}
```

### bills_of_lading
```typescript
{
  id: "bol_xyz789",
  bol_number: "BOL-784",
  po_number: "PO-12345",
  po_id: "po_abc123",
  carrier_name: "Swift Trucking",
  pod_signed_at: "2025-10-16T14:30:00Z",
  status: "delivered"
}
```

### invoices
```typescript
{
  id: "inv_def456",
  invoice_number: "INV-789",
  carrier_name: "Swift Trucking",
  po_number: "PO-12345",
  bol_number: "BOL-784",
  charges: [...],
  total_amount: 1234.00,
  status: "flagged"
}
```

### matching_results
```typescript
{
  id: "match_123",
  po_id: "po_abc123",
  bol_id: "bol_xyz789",
  invoice_id: "inv_def456",
  match_status: "minor_variance",
  confidence_score: 0.85,
  comparison: {
    po_total: 1145.00,
    invoice_total: 1234.00,
    variance: 89.00,
    variance_pct: 7.8
  }
}
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Framework | Elysia |
| Database | PostgreSQL |
| ORM | Drizzle |
| AI | Mistral API |
| Jobs | Daytona |
| Frontend | React + Next.js |

---

## File Structure

```
api/
├── src/
│   ├── lib/
│   │   ├── env.ts              # Config
│   │   ├── mistral.ts          # AI client
│   │   └── daytona.ts          # Jobs client
│   ├── service/
│   │   ├── po/                 # Purchase orders
│   │   ├── bol/                # Bills of lading
│   │   ├── invoice/            # Invoice handling
│   │   └── matching/           # 3-way matching
│   ├── db/
│   │   └── schema/
│   │       ├── po.db.ts
│   │       ├── bol.db.ts
│   │       ├── invoice.db.ts
│   │       └── flag.db.ts
│   └── index.ts
├── DATABASE_SCHEMA.md          # Full schema docs
├── API_FLOW.md                 # API flow details
└── QUICK_REFERENCE.md          # This file
```

---

## Environment Variables

```env
# AI
MISTRAL_API_KEY=your_key_here

# Daytona (optional)
DAYTONA_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://...

# Environment
NODE_ENV=development
```

---

## Demo Script (3 minutes)

**Opening (30s)**:
> "3-way invoice matching: validate carrier invoices against POs and BOLs automatically."

**Perfect Match (60s)**:
> "Upload invoice → AI extracts PO and BOL numbers → System matches all 3 → Perfect match → Auto-approve."

**Flagged Invoice (60s)**:
> "This invoice has an unexpected $89 detention charge. System flags it, shows side-by-side comparison, and I can dispute with one click."

**Resolution (30s)**:
> "Every match runs in Daytona with full audit trail. Questions?"

---

## Next Steps

1. ✅ Simplified database schema (6 tables)
2. ⏳ Implement API endpoints
3. ⏳ Build AI parsing service
4. ⏳ Create 3-way matching logic
5. ⏳ Build dashboard UI
6. ⏳ Add dispute workflows

---

For full details:
- **DATABASE_SCHEMA.md** - Complete schema with examples
- **API_FLOW.md** - Detailed API flow and endpoints
