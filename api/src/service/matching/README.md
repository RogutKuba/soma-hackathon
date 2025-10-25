# 3-Way Matching Service

## Overview

The 3-Way Matching service validates that Purchase Orders (PO), Bills of Lading (BOL), and Invoices align correctly before payment approval. This process ensures that:
1. What was **ordered** (PO)
2. What was **shipped** (BOL)
3. What is being **billed** (Invoice)

All match according to predefined rules and tolerances.

## Matching Process Architecture

### Background Job Processing with Inngest

The matching process runs asynchronously using **Inngest**, a background job framework. This ensures:
- **Non-blocking operations**: API requests return immediately
- **Reliable processing**: Jobs are retried on failure
- **Scalable**: Multiple matches can run concurrently
- **Observable**: Full visibility into job status and history

```
User Action (Upload Invoice)
         ↓
    Trigger Event
         ↓
    Inngest Queue
         ↓
  Background Worker
         ↓
   Matching Logic
         ↓
  Update Database
         ↓
  Create Flags (if discrepancies)
         ↓
   Notify User
```

## The 3-Way Matching Process

### Phase 1: Document Identification

When an invoice is uploaded, the system must identify related documents:

```typescript
1. Extract invoice PO number
2. Find PO by po_number
3. Find BOL(s) by po_number or po_id
4. Validate all three documents exist
```

**Triggers:**
- Invoice upload (manual)
- BOL upload (if PO and Invoice already exist)
- Scheduled re-matching job (for previously flagged items)

### Phase 2: Field-by-Field Comparison

The system compares key fields across all three documents:

#### 2.1 Party Validation

```typescript
// Compare carrier information
PO.carrier_name === BOL.carrier_name === Invoice.carrier_name

// Customer/Shipper validation
PO.customer_name === Invoice.customer_name
```

**Tolerance:** Fuzzy matching with 85% similarity score
**Flag Type:** `CARRIER_MISMATCH`, `CUSTOMER_MISMATCH`

#### 2.2 Route Verification

```typescript
// Origin and destination must match
PO.origin === BOL.origin === Invoice.origin
PO.destination === BOL.destination === Invoice.destination
```

**Tolerance:** City-level matching (ignore address details)
**Flag Type:** `ROUTE_MISMATCH`

#### 2.3 Date Validation

```typescript
// Pickup date comparison
BOL.pickup_date within ±2 days of PO.pickup_date

// Delivery date comparison
BOL.delivery_date within ±3 days of PO.delivery_date

// Invoice date must be after delivery
Invoice.invoice_date >= BOL.delivery_date
```

**Tolerance:** Configurable grace periods
**Flag Type:** `DATE_DISCREPANCY`

#### 2.4 Financial Matching (Critical)

This is the most important validation:

```typescript
// Step 1: Match line items
for each charge in Invoice.charges {
  find matching charge in PO.expected_charges where:
    - description matches (fuzzy, 80% similarity)
    - amount within tolerance
}

// Step 2: Compare totals
Expected Total: PO.total_amount
Actual Total: sum(BOL.actual_charges) || Invoice.total_amount
Billed Total: Invoice.total_amount

// Step 3: Validate tolerance
difference = abs(Expected Total - Billed Total)
tolerance = Expected Total * 0.05  // 5% tolerance

if (difference > tolerance) {
  flag_discrepancy("AMOUNT_MISMATCH", difference, tolerance)
}
```

**Tolerance:** 5% of total amount (configurable)
**Flag Types:**
- `AMOUNT_OVER_TOLERANCE` (exceeds 5%)
- `AMOUNT_UNDER` (billed less than expected)
- `UNEXPECTED_CHARGE` (charge not in PO)
- `MISSING_CHARGE` (PO charge not billed)

### Phase 3: Discrepancy Analysis

When mismatches are found, the system:

1. **Categorizes the discrepancy**
   - Minor: Within tolerance, but noteworthy
   - Major: Outside tolerance, requires review
   - Critical: Significant fraud indicators

2. **Calculates impact**
   ```typescript
   financialImpact = actualAmount - expectedAmount
   percentageVariance = (financialImpact / expectedAmount) * 100
   ```

3. **Assigns severity**
   ```typescript
   if (percentageVariance > 10%) severity = "high"
   else if (percentageVariance > 5%) severity = "medium"
   else severity = "low"
   ```

4. **Creates flag record**
   ```typescript
   {
     po_id: string,
     bol_id: string | null,
     invoice_id: string,
     flag_type: FlagType,
     severity: "low" | "medium" | "high",
     description: string,
     field: string,
     expected_value: any,
     actual_value: any,
     financial_impact: number,
     requires_approval: boolean
   }
   ```

### Phase 4: Status Updates

Based on matching results, update document statuses:

```typescript
// All documents match perfectly
if (no_discrepancies) {
  PO.status = "matched"
  BOL.status = "matched"
  Invoice.status = "matched"
  Invoice.approved_for_payment = true
}

// Minor discrepancies within tolerance
else if (all_discrepancies_minor) {
  PO.status = "matched"
  BOL.status = "matched"
  Invoice.status = "matched"
  Invoice.approved_for_payment = false  // Needs review
  create_flags()
}

// Major discrepancies
else {
  PO.status = "disputed"
  BOL.status = "invoiced"
  Invoice.status = "disputed"
  Invoice.approved_for_payment = false
  create_flags()
}
```

## Matching Rules Engine

### Rule Definitions

```typescript
interface MatchingRule {
  id: string;
  name: string;
  description: string;
  field: string;
  comparison: "exact" | "fuzzy" | "range" | "custom";
  tolerance?: number | string;
  severity: "low" | "medium" | "high";
  enabled: boolean;
}
```

### Default Rules

1. **Carrier Name Match**
   - Comparison: Fuzzy (85% similarity)
   - Severity: Medium
   - Fields: `PO.carrier_name`, `BOL.carrier_name`, `Invoice.carrier_name`

2. **Total Amount Match**
   - Comparison: Range (±5%)
   - Severity: High
   - Fields: `PO.total_amount`, `Invoice.total_amount`

3. **Line Item Match**
   - Comparison: Custom (fuzzy description + amount range)
   - Severity: Medium
   - Fields: `PO.expected_charges`, `Invoice.charges`

4. **Route Validation**
   - Comparison: Exact (city-level)
   - Severity: Low
   - Fields: `PO.origin/destination`, `BOL.origin/destination`

5. **Date Range Validation**
   - Comparison: Range (±2/3 days)
   - Severity: Low
   - Fields: Various date fields

### Custom Rule Example

```typescript
{
  id: "fuel_surcharge_validation",
  name: "Fuel Surcharge Validation",
  description: "Validates fuel surcharge is within acceptable range",
  field: "charges.fuel_surcharge",
  comparison: "custom",
  tolerance: "10%",
  severity: "low",
  enabled: true,
  customLogic: (po, bol, invoice) => {
    const expectedFuel = po.expected_charges.find(c =>
      c.description.includes("Fuel")
    );
    const actualFuel = invoice.charges.find(c =>
      c.description.includes("Fuel")
    );

    if (!expectedFuel && actualFuel) {
      return {
        passed: false,
        message: "Unexpected fuel surcharge"
      };
    }

    const variance = abs(actualFuel.amount - expectedFuel.amount);
    const tolerance = expectedFuel.amount * 0.10;

    return {
      passed: variance <= tolerance,
      variance,
      tolerance
    };
  }
}
```

## Inngest Implementation

### Event Definitions

```typescript
// Event sent when invoice is uploaded
{
  name: "invoice/uploaded",
  data: {
    invoice_id: string,
    po_number: string,
    uploaded_by: string,
    timestamp: string
  }
}

// Event for BOL completion
{
  name: "bol/delivered",
  data: {
    bol_id: string,
    po_id: string,
    delivery_date: string
  }
}

// Manual re-match request
{
  name: "matching/reprocess",
  data: {
    po_id: string,
    bol_id?: string,
    invoice_id: string,
    reason: string
  }
}
```

### Inngest Functions

#### 1. Main Matching Function

```typescript
inngest.createFunction(
  {
    id: "three-way-match",
    name: "3-Way Document Matching"
  },
  { event: "invoice/uploaded" },
  async ({ event, step }) => {

    // Step 1: Fetch related documents
    const documents = await step.run("fetch-documents", async () => {
      return await MatchingService.fetchRelatedDocuments(
        event.data.invoice_id,
        event.data.po_number
      );
    });

    // Step 2: Validate documents exist
    await step.run("validate-documents", async () => {
      return await MatchingService.validateDocuments(documents);
    });

    // Step 3: Run matching rules
    const results = await step.run("run-matching-rules", async () => {
      return await MatchingService.runMatchingRules(documents);
    });

    // Step 4: Create flags for discrepancies
    const flags = await step.run("create-flags", async () => {
      return await MatchingService.createFlags(results);
    });

    // Step 5: Update document statuses
    await step.run("update-statuses", async () => {
      return await MatchingService.updateDocumentStatuses(
        documents,
        results,
        flags
      );
    });

    // Step 6: Send notifications (if configured)
    await step.run("send-notifications", async () => {
      if (flags.length > 0) {
        return await MatchingService.notifyStakeholders(
          documents,
          flags
        );
      }
    });

    return {
      success: true,
      matched: results.perfect_match,
      flags_created: flags.length,
      processing_time_ms: Date.now() - event.data.timestamp
    };
  }
);
```

#### 2. Scheduled Re-matching

```typescript
inngest.createFunction(
  {
    id: "rematch-disputed-invoices",
    name: "Re-match Previously Disputed Invoices"
  },
  { cron: "0 2 * * *" },  // Run daily at 2 AM
  async ({ step }) => {

    // Get all disputed invoices
    const disputed = await step.run("fetch-disputed", async () => {
      return await InvoiceService.getInvoicesByStatus("disputed");
    });

    // Re-run matching for each
    for (const invoice of disputed) {
      await step.run(`rematch-${invoice.id}`, async () => {
        return await inngest.send({
          name: "matching/reprocess",
          data: {
            invoice_id: invoice.id,
            po_id: invoice.po_id,
            bol_id: invoice.bol_id,
            reason: "scheduled_rematch"
          }
        });
      });
    }

    return { processed: disputed.length };
  }
);
```

#### 3. Manual Override Handler

```typescript
inngest.createFunction(
  {
    id: "manual-approval-override",
    name: "Handle Manual Approval Override"
  },
  { event: "matching/manual-approval" },
  async ({ event, step }) => {

    // Record approval
    await step.run("record-override", async () => {
      return await MatchingService.recordManualOverride({
        invoice_id: event.data.invoice_id,
        approved_by: event.data.user_id,
        reason: event.data.reason,
        flags_acknowledged: event.data.flag_ids
      });
    });

    // Update invoice status
    await step.run("approve-invoice", async () => {
      return await InvoiceService.updateInvoiceStatus(
        event.data.invoice_id,
        "approved"
      );
    });

    return { approved: true };
  }
);
```

### Inngest Configuration

```typescript
// inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "freightflow-matching",
  schemas: new EventSchemas().from(schemas),
});

// inngest/functions/index.ts
export const functions = [
  threeWayMatchFunction,
  rematchDisputedFunction,
  manualApprovalFunction,
];
```

## Database Schema for Matching

### Matching Results Table

```typescript
{
  id: string,
  po_id: string,
  bol_id: string | null,
  invoice_id: string,

  // Overall result
  matched: boolean,
  match_score: number,  // 0-100

  // Rule results
  rules_passed: number,
  rules_failed: number,
  rule_results: Array<{
    rule_id: string,
    passed: boolean,
    expected: any,
    actual: any,
    variance?: number
  }>,

  // Processing metadata
  processed_at: timestamp,
  processing_time_ms: number,
  inngest_run_id: string,

  // Status
  status: "completed" | "failed" | "needs_review",
  flags_created: number
}
```

### Flags Table Schema

See `/src/db/schema/flags.db.ts` for full schema.

## Workflow Examples

### Example 1: Perfect Match

```
1. Invoice uploaded for PO-001
2. Inngest event: "invoice/uploaded"
3. Fetch: PO-001, BOL-001, INV-001
4. Run matching rules: ALL PASS ✓
5. Create 0 flags
6. Update statuses:
   - PO-001: matched
   - BOL-001: matched
   - INV-001: matched (approved_for_payment: true)
7. No notifications sent
```

### Example 2: Minor Discrepancy

```
1. Invoice uploaded for PO-002
2. Inngest event: "invoice/uploaded"
3. Fetch: PO-002, BOL-002, INV-002
4. Run matching rules:
   - Carrier: PASS ✓
   - Route: PASS ✓
   - Dates: PASS ✓
   - Amount: FAIL (2% over) ⚠️
5. Create 1 flag:
   - Type: AMOUNT_OVER_TOLERANCE
   - Severity: medium
   - Financial Impact: +$50
6. Update statuses:
   - PO-002: matched
   - BOL-002: matched
   - INV-002: matched (approved_for_payment: false)
7. Send notification to approver
```

### Example 3: Major Discrepancy

```
1. Invoice uploaded for PO-003
2. Inngest event: "invoice/uploaded"
3. Fetch: PO-003, BOL-003, INV-003
4. Run matching rules:
   - Carrier: PASS ✓
   - Route: FAIL (destination mismatch) ❌
   - Dates: PASS ✓
   - Amount: FAIL (8% over) ❌
   - Line Items: FAIL (unexpected charge) ❌
5. Create 3 flags:
   - ROUTE_MISMATCH (high severity)
   - AMOUNT_OVER_TOLERANCE (high severity)
   - UNEXPECTED_CHARGE (medium severity)
6. Update statuses:
   - PO-003: disputed
   - BOL-003: invoiced
   - INV-003: disputed (approved_for_payment: false)
7. Send urgent notification to manager
```

## Configuration

### Tolerance Settings

```typescript
// config/matching.ts
export const MATCHING_CONFIG = {
  tolerances: {
    amount: {
      percentage: 0.05,  // 5%
      absolute: 100,     // $100
    },
    dates: {
      pickup: 2,         // ±2 days
      delivery: 3,       // ±3 days
    },
    fuzzy_match: {
      threshold: 0.85,   // 85% similarity
    }
  },

  severity_thresholds: {
    low: 0.02,           // <2% variance
    medium: 0.05,        // 2-5% variance
    high: 0.10,          // 5-10% variance
    critical: 0.10,      // >10% variance
  },

  auto_approve: {
    enabled: false,      // Require manual review
    max_variance: 0.01,  // Auto-approve if <1% variance
  },

  notifications: {
    on_mismatch: true,
    on_manual_review: true,
    recipients: ["finance@company.com", "manager@company.com"]
  }
};
```

## API Endpoints

### Trigger Manual Match

```typescript
POST /matching/run
{
  po_id: string,
  bol_id?: string,
  invoice_id: string
}
```

### Get Matching Results

```typescript
GET /matching/results/:invoice_id
Response: {
  matched: boolean,
  score: number,
  flags: Flag[],
  details: MatchingResult
}
```

### Get All Flagged Items

```typescript
GET /matching/flags?severity=high&status=open
Response: {
  flags: Flag[],
  count: number
}
```

### Approve Invoice (Override)

```typescript
POST /matching/approve/:invoice_id
{
  reason: string,
  acknowledged_flags: string[]
}
```

## Testing Strategy

### Unit Tests

```typescript
describe("Matching Rules", () => {
  it("should match identical amounts", () => {
    const po = { total_amount: 1000 };
    const invoice = { total_amount: 1000 };
    const result = MatchingService.compareAmounts(po, invoice);
    expect(result.passed).toBe(true);
  });

  it("should flag amount outside tolerance", () => {
    const po = { total_amount: 1000 };
    const invoice = { total_amount: 1100 };  // 10% over
    const result = MatchingService.compareAmounts(po, invoice);
    expect(result.passed).toBe(false);
    expect(result.variance).toBe(100);
  });
});
```

### Integration Tests

```typescript
describe("3-Way Matching Flow", () => {
  it("should complete full match cycle", async () => {
    const invoice = await createTestInvoice();
    await inngest.send({
      name: "invoice/uploaded",
      data: { invoice_id: invoice.id }
    });

    // Wait for processing
    await waitForCompletion(invoice.id);

    const result = await getMatchingResult(invoice.id);
    expect(result.status).toBe("completed");
  });
});
```

## Monitoring & Observability

### Metrics to Track

1. **Match Rate**: % of perfect matches vs discrepancies
2. **Processing Time**: Average time to complete matching
3. **Flag Distribution**: Count by flag type and severity
4. **Manual Override Rate**: % of disputed invoices manually approved
5. **False Positive Rate**: Flags that were incorrectly raised

### Inngest Dashboard

Monitor via Inngest dashboard:
- Function execution logs
- Success/failure rates
- Retry attempts
- Processing times
- Event traces

## Future Enhancements

1. **Machine Learning**: Learn from manual overrides to improve rules
2. **Smart Tolerances**: Dynamic tolerance based on vendor history
3. **Predictive Flagging**: Flag potential issues before invoice arrival
4. **Batch Processing**: Process multiple invoices in parallel
5. **Real-time Notifications**: WebSocket updates for instant alerts
6. **OCR Confidence Scores**: Factor in OCR accuracy when matching

## Related Services

- **Purchase Order Service** - Source of expected data
- **BOL Service** - Shipping verification data
- **Invoice Service** - Billing data to validate
- **Flags Service** - Discrepancy tracking and resolution
- **OCR Service** - Document data extraction
