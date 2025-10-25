# 3-Way Matching System - How It Works

## Overview

The 3-way matching system is the core of FreightFlow's invoice validation. It automatically compares three critical documents to ensure billing accuracy before payment approval:

1. **Purchase Order (PO)** - What was ordered and agreed upon
2. **Bill of Lading (BOL)** - What was actually shipped and delivered
3. **Invoice** - What is being billed

**Key Concept:** The **PO Number** is the primary identifier that links all three documents together. Both the BOL and Invoice reference the same PO number, making it the central hub for matching.

The system runs in the background using **Inngest** for reliable, asynchronous processing.

---

## The Matching Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    INVOICE UPLOADED                         │
│                  (Trigger Event)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Inngest Queue       │
          │  (Background Job)    │
          └──────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PHASE 1: Link Documents    │
        │ • Get Invoice              │
        │ • Read invoice.po_number   │
        │ • Find PO by po_number     │
        │ • Find BOL by po_number    │
        │ ALL linked by PO Number!   │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PHASE 2: Validation        │
        │ • Products/Items match     │
        │ • Carrier names match      │
        │ • Route (origin/dest)      │
        │ • Dates (pickup/delivery)  │
        │ • Total amounts match      │
        │ • General info validation  │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PHASE 3: Create Flags      │
        │ • Amount variances         │
        │ • Missing charges          │
        │ • Unexpected charges       │
        │ • Route mismatches         │
        │ • Date discrepancies       │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PHASE 4: Update Statuses   │
        │ • PO: matched/disputed     │
        │ • BOL: matched/invoiced    │
        │ • Invoice: matched/flagged │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   Save Results & Notify    │
        │ • Store matching_result    │
        │ • Send alerts if needed    │
        └────────────────────────────┘
```

---

## Document Linkage: PO Number as the Hub

All three documents are linked through the **PO Number**:

```
         ┌─────────────────────┐
         │   Purchase Order    │
         │   PO-2024-001       │
         └──────────┬──────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌──────────────┐
│ Bill of Lading│       │   Invoice    │
│ po_number:    │       │ po_number:   │
│ "PO-2024-001" │       │ "PO-2024-001"│
└───────────────┘       └──────────────┘
```

**How it works:**

1. **PO Created First** - Customer places order, PO-2024-001 is created
2. **BOL References PO** - When shipment happens, BOL includes `po_number: "PO-2024-001"`
3. **Invoice References PO** - When carrier bills, invoice includes `po_number: "PO-2024-001"`
4. **Matching Triggered** - When invoice uploaded, system looks up all docs with same PO number

**Example Document Set:**

```typescript
// Purchase Order
{
  id: "po_abc123",
  po_number: "PO-2024-001",
  customer_name: "ACME Corp",
  carrier_name: "FedEx Freight",
  expected_charges: [
    { description: "Base Freight", amount: 800 },
    { description: "Fuel Surcharge", amount: 120 }
  ],
  total_amount: 920
}

// Bill of Lading
{
  id: "bol_def456",
  bol_number: "BOL-2024-5678",
  po_number: "PO-2024-001",  // ← Links to PO
  carrier_name: "FedEx Freight",
  actual_charges: [
    { description: "Base Freight", amount: 800 },
    { description: "Fuel Surcharge", amount: 130 }
  ]
}

// Invoice
{
  id: "inv_ghi789",
  invoice_number: "INV-2024-9999",
  po_number: "PO-2024-001",  // ← Links to PO
  carrier_name: "FedEx Freight",
  charges: [
    { description: "Base Freight", amount: 800 },
    { description: "Fuel Surcharge", amount: 130 }
  ],
  total_amount: 930
}
```

**Matching Query:**
```sql
-- Find all related documents
SELECT * FROM purchase_orders WHERE po_number = 'PO-2024-001';
SELECT * FROM bills_of_lading WHERE po_number = 'PO-2024-001';
SELECT * FROM invoices WHERE po_number = 'PO-2024-001';
```

---

## Matching Rules & Tolerance Levels

### 0. PO Number Linkage (Primary Match)

**What it checks:**
- Invoice has a valid `po_number`
- PO exists with that `po_number`
- BOL exists with the same `po_number`

**This is the PRIMARY matching mechanism.** Without a valid PO number, no matching can occur.

**Flag Created:** `NO_PO_FOUND` or `NO_BOL_FOUND` (High severity)

---

### 1. Product/Item Matching ⚠️ CRITICAL

**What it checks:**
- Items listed on PO match items on BOL
- Items on Invoice match what was ordered and shipped

**Comparison Logic:**

```typescript
// PO lists what was ordered
PO.expected_charges = [
  { description: "Pallets (10)", amount: 500 },
  { description: "Refrigerated Transport", amount: 300 }
]

// BOL confirms what was shipped
BOL.actual_charges = [
  { description: "Pallets (10)", amount: 500 },
  { description: "Refrigerated Transport", amount: 300 }
]

// Invoice bills for what was delivered
Invoice.charges = [
  { description: "Pallets (10)", amount: 500 },
  { description: "Refrigerated Transport", amount: 300 },
  { description: "Detention Fee", amount: 150 }  // ← UNEXPECTED!
]
```

**Matching Rules:**
- ✅ **Match:** Same description, same/similar amount
- ⚠️ **Variance:** Same description, different amount (within tolerance)
- ❌ **Missing:** Item on PO but not on Invoice
- ❌ **Extra:** Item on Invoice but not on PO/BOL

**Tolerance:**
- 5% amount variance per line item
- Fuzzy text matching for descriptions (80% similarity)

**Flags Created:**
- `MISSING_CHARGE` - Expected item not billed
- `UNEXPECTED_CHARGE` - Item not in PO/BOL
- `CHARGE_VARIANCE` - Same item, different price

---

### 2. Carrier Validation

**What it checks:**
- PO carrier name vs Invoice carrier name
- BOL carrier name vs Invoice carrier name

**Tolerance:**
- Fuzzy matching: 85% similarity
- "FedEx Freight" matches "FedEx" ✓
- "UPS" vs "DHL" = MISMATCH ✗

**Flag Created:** `CARRIER_MISMATCH` (Medium severity)

---

### 3. Route Verification

**What it checks:**
- Origin city match (PO ↔ BOL)
- Destination city match (PO ↔ BOL)

**Tolerance:**
- City-level matching only
- "Los Angeles, CA 90001" matches "Los Angeles, CA" ✓
- Full address differences ignored

**Flag Created:** `ROUTE_MISMATCH` (Low severity)

---

### 4. Date Validation

**What it checks:**
- Pickup date variance: PO vs BOL
- Delivery date variance: PO vs BOL
- Invoice date must be after delivery

**Tolerance:**
- Pickup: ±2 days
- Delivery: ±3 days

**Example:**
```
PO Pickup:     2024-01-15
BOL Pickup:    2024-01-16  ← Within 2 days ✓
BOL Pickup:    2024-01-20  ← 5 days apart ✗
```

**Flag Created:** `DATE_MISMATCH` (Low severity)

---

### 5. Total Amount Matching ⚠️ CRITICAL

**What it checks:**
- PO total amount vs Invoice total amount

**Tolerance:**
- **5% variance** OR **$100 absolute**
- Whichever is GREATER is allowed

**Examples:**
```
PO Total: $1,000
Invoice:  $1,040  ← 4% variance = ✓ OK
Invoice:  $1,080  ← 8% variance = ✗ FLAG (exceeds 5%)

PO Total: $500
Invoice:  $580   ← $80 diff = ✓ OK (within $100)
Invoice:  $650   ← $150 diff = ✗ FLAG (exceeds $100)
```

**Severity Levels:**
- 0-2% variance = Low
- 2-5% variance = Medium
- 5-10% variance = High
- >10% variance = Critical

**Flag Created:** `AMOUNT_MISMATCH_PO_INVOICE`

---

## Matching Outcomes

### Scenario 1: Perfect Match ✅

**Conditions:**
- All fields match exactly
- No flags created
- Amount variance = 0%

**Result:**
```
PO Status:      pending → matched
BOL Status:     delivered → matched
Invoice Status: pending → matched
Approval:       AUTO-APPROVED ✓
```

---

### Scenario 2: Minor Variance ⚠️

**Conditions:**
- 1-3 low/medium severity flags
- Amount variance < 5%
- No critical issues

**Result:**
```
PO Status:      pending → matched
BOL Status:     delivered → matched
Invoice Status: pending → flagged
Approval:       REQUIRES REVIEW ⏸️
```

**Example Flags:**
- "Amount $42 over (2.1% variance)" - Medium
- "Fuel surcharge $8 higher than expected" - Low

**Action Required:** Finance team reviews and approves manually

---

### Scenario 3: Major Discrepancy ❌

**Conditions:**
- 1+ high/critical severity flags
- Amount variance > 5%
- Missing documents
- Route/carrier mismatches

**Result:**
```
PO Status:      pending → disputed
BOL Status:     delivered → invoiced
Invoice Status: pending → disputed
Approval:       BLOCKED ✗
```

**Example Flags:**
- "Amount $450 over (15% variance)" - Critical
- "Carrier mismatch: Expected FedEx, got UPS" - High
- "Unexpected charge: Detention Fee $200" - Medium

**Action Required:** Investigation and vendor communication before payment

---

## Database Schema

### `matching_results` Table

Stores the complete comparison for audit trail:

```typescript
{
  id: "match_abc123",
  po_id: "po_xyz789",
  bol_id: "bol_def456",
  invoice_id: "inv_ghi012",

  match_status: "perfect_match" | "minor_variance" | "major_variance",
  confidence_score: 0.95, // 0-1 scale

  comparison: {
    po_total: 1000,
    bol_total: 1000,
    invoice_total: 1040,
    variance: 40,
    variance_pct: 4.0,

    charge_comparison: [
      {
        description: "Base Freight",
        po_amount: 800,
        bol_amount: 800,
        invoice_amount: 800,
        status: "match"
      },
      {
        description: "Fuel Surcharge",
        po_amount: 120,
        bol_amount: null,
        invoice_amount: 140,
        status: "variance"
      }
    ]
  },

  flags_count: 1,
  high_severity_flags: 0,
  created_at: "2024-01-20T10:30:00Z"
}
```

### `flags` Table

Individual discrepancies for tracking and resolution:

```typescript
{
  id: "flag_abc123",
  entity_type: "invoice",
  entity_id: "inv_xyz789",

  code: "AMOUNT_MISMATCH_PO_INVOICE",
  severity: "med", // low | med | high
  explanation: "Invoice amount exceeds PO by $40 (4.0% variance)",

  context: {
    po_amount: 1000,
    invoice_amount: 1040,
    variance: 40,
    variance_pct: 4.0
  },

  // Resolution tracking
  resolved_at: null,
  resolution_action: null, // "approved" | "disputed" | "rejected"
  resolution_notes: null,

  created_at: "2024-01-20T10:30:00Z"
}
```

---

## Inngest Background Jobs

### Job 1: Invoice Upload Trigger

**Event:** `invoice/uploaded`

**Payload:**
```json
{
  "invoice_id": "inv_abc123",
  "po_number": "PO-2024-001",
  "uploaded_by": "user_xyz",
  "timestamp": 1706008200000
}
```

**Steps:**
1. Fetch related PO and BOL
2. Run all comparison rules
3. Create flags for discrepancies
4. Update document statuses
5. Save matching result
6. Send notifications (if high severity)

**Steps:**
1. Mark flags as resolved with approval
2. Update invoice status to "approved"
3. Record approval metadata (who, when, why)

---

## API Endpoints
### Get Matching Result

```http
GET /api/matching/results/:invoice_id
```

**Response:**
```json
{
  "match_status": "minor_variance",
  "confidence_score": 0.92,
  "flags": [
    {
      "code": "CHARGE_VARIANCE",
      "severity": "med",
      "explanation": "Fuel surcharge $10 higher than expected"
    }
  ],
  "comparison": { /* full comparison data */ }
}
```

---

### Get All Flagged Items

```http
GET /api/matching/flags?severity=high&status=open
```

**Response:**
```json
{
  "flags": [
    {
      "id": "flag_abc123",
      "invoice_id": "inv_xyz",
      "code": "AMOUNT_MISMATCH_PO_INVOICE",
      "severity": "high",
      "created_at": "2024-01-20T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

### Manual Approve Invoice

```http
POST /api/matching/approve/:invoice_id
Content-Type: application/json

{
  "reason": "Fuel surcharge variance approved by carrier agreement",
  "acknowledged_flags": ["flag_abc", "flag_xyz"]
}
```

**Response:**
```json
{
  "invoice": {
    "id": "inv_abc123",
    "status": "approved",
    "approved_at": "2024-01-20T14:30:00Z",
    "approved_by": "user_finance_1"
  }
}
```

---

## Monitoring & Metrics

### Key Performance Indicators

1. **Match Rate**
   - % of perfect matches (no flags)
   - Target: >80%

2. **Processing Time**
   - Average time to complete matching
   - Target: <5 seconds

3. **Flag Distribution**
   ```
   Low severity:      60%
   Medium severity:   30%
   High severity:     8%
   Critical:          2%
   ```

4. **Manual Override Rate**
   - % of flagged invoices manually approved
   - Target: <15%

5. **False Positive Rate**
   - Flags that were incorrectly raised
   - Track via resolution notes

### Inngest Dashboard

Monitor real-time:
- ✅ Successful matches
- ⚠️ Retrying jobs
- ❌ Failed jobs
- ⏱️ Processing times
- 📊 Event traces

---

## Configuration

### Tolerance Settings

Located in: `api/src/service/matching/matching.config.ts`

```typescript
export const MATCHING_CONFIG = {
  tolerances: {
    amount: {
      percentage: 0.05,    // 5% - ADJUST AS NEEDED
      absolute: 100,       // $100 - ADJUST AS NEEDED
    },
    dates: {
      pickup: 2,           // ±2 days
      delivery: 3,         // ±3 days
    },
    fuzzy_match: {
      threshold: 0.85,     // 85% similarity
    },
  },

  severity_thresholds: {
    low: 0.02,             // <2%
    medium: 0.05,          // 2-5%
    high: 0.10,            // 5-10%
    critical: 0.10,        // >10%
  },

  auto_approve: {
    enabled: false,        // NEVER auto-approve initially
    max_variance: 0.01,    // Only if <1% and enabled
  },
};
```

**⚠️ Important:** Start conservative (5% tolerance) and adjust based on real-world data

---

## Future Enhancements

### Phase 2 Features

1. **Machine Learning**
   - Learn from manual approvals
   - Auto-adjust tolerances per carrier
   - Predict likely flags before upload

2. **Smart Tolerances**
   - Different rules per carrier
   - Seasonal adjustments (fuel prices)
   - Contract-based custom rules

3. **OCR Confidence Integration**
   - Factor in OCR accuracy scores
   - Higher tolerance for low-confidence fields
   - Flag uncertain extractions

4. **Real-time Notifications**
   - WebSocket alerts
   - Slack/Teams integration
   - Email digests

5. **Batch Processing**
   - Process multiple invoices together
   - Weekly reconciliation reports
   - Carrier performance scorecards

---

## Testing Strategy

### Unit Tests

Test individual comparison functions:

```typescript
describe('Amount Comparison', () => {
  it('should pass for exact match', () => {
    const result = compareAmounts(1000, 1000);
    expect(result.passed).toBe(true);
  });

  it('should pass within 5% tolerance', () => {
    const result = compareAmounts(1000, 1040); // 4%
    expect(result.passed).toBe(true);
  });

  it('should fail outside tolerance', () => {
    const result = compareAmounts(1000, 1100); // 10%
    expect(result.passed).toBe(false);
    expect(result.variance_pct).toBe(10);
  });
});
```

### Integration Tests

Test full matching flow:

```typescript
describe('3-Way Matching Flow', () => {
  it('should create flags for amount variance', async () => {
    const { po, bol, invoice } = await createTestDocuments({
      po_total: 1000,
      invoice_total: 1100, // 10% over
    });

    const result = await MatchingService.runThreeWayMatch(invoice.id);

    expect(result.matched).toBe(false);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].code).toBe('AMOUNT_MISMATCH_PO_INVOICE');
    expect(result.flags[0].severity).toBe('high');
  });
});
```

---

## Summary

### Key Insight: PO Number is the Hub

The entire matching system is built around **PO Number as the primary identifier**:

```
Invoice.po_number = "PO-2024-001"
   ↓
Find PO with po_number = "PO-2024-001"
   ↓
Find BOL with po_number = "PO-2024-001"
   ↓
Compare all three documents
```

This simple linkage makes matching straightforward and reliable.

### What Gets Matched

Once documents are linked by PO number, the system validates:

1. **Products/Items** - Do the line items match across all three?
2. **Amounts** - Are we being billed what we expected?
3. **General Info** - Carrier, route, dates all correct?

### Benefits

✅ **Automated validation** of invoices against orders and shipments
✅ **PO number-based linking** - simple and reliable
✅ **Product/item matching** across all three documents
✅ **Configurable tolerances** for real-world variance
✅ **Detailed audit trail** of all comparisons
✅ **Smart flagging** with severity levels
✅ **Manual override** capability for justified variances
✅ **Background processing** for scalability
✅ **Comprehensive monitoring** via Inngest

**Result:** Catch billing errors before payment, reduce manual review time, and maintain complete financial accuracy in freight operations.
