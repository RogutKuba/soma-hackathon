# 3-Way Invoice Matching Flow - Web Application

## Overview

This document outlines the web application flow for **3-way invoice matching** in freight/3PL operations, matching three critical documents:

1. **Purchase Orders (PO)** - Expected shipment and charges
2. **Bill of Lading (BOL)** - Shipment confirmation and actual goods received
3. **Carrier Invoices** - Final charges to be paid

This approach ensures that:
- Goods were ordered (PO exists)
- Goods were received (BOL confirms delivery)
- Charges are accurate (Invoice matches PO and BOL)

---

## Table of Contents

1. [3-Way Matching Concept](#3-way-matching-concept)
2. [User Flows](#user-flows)
3. [Dashboard Design](#dashboard-design)
4. [Document States](#document-states)
5. [Matching Logic](#matching-logic)
6. [Flag System](#flag-system)
7. [UI Components](#ui-components)
8. [API Integration](#api-integration)

---

## 3-Way Matching Concept

### Traditional 3-Way Match (from INVOICE_MATCHING.md)

The classic 3-way match validates:
1. **Purchase Order** - What was ordered and agreed upon
2. **Receipt of Goods** - What was actually received
3. **Supplier Invoice** - What the supplier is charging

### Freight Industry Adaptation

In freight/3PL operations, the three documents are:

1. **Purchase Order (PO)**
   - Created when booking a shipment
   - Contains expected charges (linehaul, fuel, accessorials)
   - References route, carrier, dates
   - Status: "open" → "shipped" → "closed"

2. **Bill of Lading (BOL)**
   - Created at pickup/delivery
   - Confirms actual shipment occurred
   - May include additional charges discovered during transit
   - References the PO
   - Status: "in_transit" → "delivered" → "awaiting_invoice"

3. **Carrier Invoice**
   - Submitted by carrier after delivery
   - Final charges for the shipment
   - References both PO and BOL
   - Status: "uploaded" → "matched" → "approved"

### The "WOW" Factor

```
Upload invoice PDF
    ↓
AI extracts: PO #, BOL #, charges
    ↓
System finds PO-1234 and BOL-5678
    ↓
3-way comparison:
┌──────────────────┬──────────────────┬──────────────────┐
│ PO-1234          │ BOL-5678         │ Invoice C-9999   │
├──────────────────┼──────────────────┼──────────────────┤
│ Linehaul: $1,000 │ Linehaul: $1,000 │ Linehaul: $1,000│
│ Fuel: $150       │ Fuel: $145       │ Fuel: $145      │
│ (none)           │ Detention: $75   │ Detention: $75  │
├──────────────────┼──────────────────┼──────────────────┤
│ Total: $1,150    │ Total: $1,220    │ Total: $1,220   │
└──────────────────┴──────────────────┴──────────────────┘

✅ BOL matches Invoice (approved charges)
⚠️ PO doesn't match BOL (fuel adjustment + detention added)
    → Flag for review but ready to approve
```

**Key Insight**: The BOL is the "source of truth" for what actually happened during shipment. The PO is what was expected. The invoice must match the BOL.

---

## User Flows

### Flow 1: Perfect 3-Way Match (Happy Path)

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: PURCHASE ORDER (Pre-existing)                  │
└─────────────────────────────────────────────────────────┘
PO-1234 created in TMS/WMS
- Carrier: ACME Trucking
- Route: Chicago → Detroit
- Expected charges: Linehaul $1,000, Fuel $150
- Total: $1,150
- Status: "open"

┌─────────────────────────────────────────────────────────┐
│ STEP 2: BOL CREATED (Shipment occurs)                  │
└─────────────────────────────────────────────────────────┘
BOL-5678 synced from TMS
- References: PO-1234
- Carrier: ACME Trucking
- Actual charges: Linehaul $1,000, Fuel $150
- Status: "delivered" → "awaiting_invoice"
- No changes from PO ✓

┌─────────────────────────────────────────────────────────┐
│ STEP 3: INVOICE UPLOAD                                 │
└─────────────────────────────────────────────────────────┘
User uploads carrier invoice PDF
    ↓
POST /api/invoices/upload
    ↓
Invoice C-9999 uploaded
- Extracted: PO-1234, BOL-5678
- Carrier: ACME Trucking
- Charges: Linehaul $1,000, Fuel $150
- Total: $1,150

┌─────────────────────────────────────────────────────────┐
│ STEP 4: 3-WAY MATCHING                                 │
└─────────────────────────────────────────────────────────┘
Daytona job runs matching logic:
    ↓
Find PO-1234 ✓
Find BOL-5678 ✓
    ↓
Compare:
- PO charges = BOL charges ✓
- BOL charges = Invoice charges ✓
- PO charges = Invoice charges ✓
    ↓
Result: Perfect 3-way match
Flags: None
Confidence: 100%

┌─────────────────────────────────────────────────────────┐
│ STEP 5: READY TO APPROVE                               │
└─────────────────────────────────────────────────────────┘
Dashboard shows in "Ready to Approve" column
    ↓
User clicks invoice → sees 3-way comparison
    ↓
All three columns align perfectly ✅
    ↓
User clicks "Approve"
    ↓
Invoice approved → PO closed → BOL invoiced
```

---

### Flow 2: BOL Modified (Legitimate Changes)

```
┌─────────────────────────────────────────────────────────┐
│ SCENARIO: Fuel surcharge adjusted, detention added     │
└─────────────────────────────────────────────────────────┘

PO-2345:
- Linehaul: $1,000
- Fuel: $150 (estimated at booking)
- Total: $1,150

BOL-6789 (at delivery):
- Linehaul: $1,000
- Fuel: $145 (actual rate that week)
- Detention: $75 (truck waited 2 hours)
- Total: $1,220
- Note: "Fuel adjusted to actual. Detention per contract."

Invoice C-1111:
- Linehaul: $1,000
- Fuel: $145
- Detention: $75
- Total: $1,220

┌─────────────────────────────────────────────────────────┐
│ MATCHING RESULT                                         │
└─────────────────────────────────────────────────────────┘

✅ BOL matches Invoice (100%)
⚠️ PO doesn't match BOL ($70 variance)
    ↓
Flags:
- PO_BOL_VARIANCE (severity: low)
  "BOL total $1,220 differs from PO $1,150 by $70"
  Context: BOL has notes explaining changes

- UNEXPECTED_CHARGE_VS_PO (severity: low)
  "Detention $75 not in original PO"
  Context: Charge exists on BOL (approved at delivery)

Status: "ready_to_approve_with_notes"

┌─────────────────────────────────────────────────────────┐
│ USER DECISION                                           │
└─────────────────────────────────────────────────────────┘

Dashboard shows:
⚠️ "PO variance: +$70"
✅ "BOL and Invoice match"

User reviews:
- Sees BOL notes about fuel adjustment and detention
- Charges are legitimate (per BOL)
- Invoice matches actual delivery (BOL)

Action: Approve with notes
Note: "BOL charges approved at delivery. Fuel adjusted to actual rate. Detention per contract."

Result:
✅ Invoice approved
✅ PO closed (with adjustment noted)
✅ BOL invoiced
```

---

### Flow 3: Invoice Discrepancy (Exception)

```
┌─────────────────────────────────────────────────────────┐
│ SCENARIO: Invoice has extra charges not on BOL         │
└─────────────────────────────────────────────────────────┘

PO-3456:
- Linehaul: $800
- Fuel: $120
- Total: $920

BOL-7890:
- Linehaul: $800
- Fuel: $120
- Total: $920
- Status: "delivered" (no issues noted)

Invoice C-2222:
- Linehaul: $800
- Fuel: $120
- Lumper Fee: $100 (NOT ON BOL!)
- Total: $1,020

┌─────────────────────────────────────────────────────────┐
│ MATCHING RESULT                                         │
└─────────────────────────────────────────────────────────┘

❌ Invoice doesn't match BOL ($100 over)
❌ Invoice doesn't match PO ($100 over)

Flags:
- INVOICE_BOL_MISMATCH (severity: high)
  "Invoice total $1,020 exceeds BOL $920 by $100"

- UNEXPECTED_CHARGE (severity: high)
  "Lumper Fee $100 not found on BOL or PO"
  "This charge was not approved at delivery"

- POSSIBLE_DUPLICATE_CHARGE (severity: med)
  "Check if lumper fee was already paid separately"

Status: "flagged" (blocks approval)

┌─────────────────────────────────────────────────────────┐
│ 3-WAY COMPARISON VIEW                                   │
└─────────────────────────────────────────────────────────┘

PO-3456          BOL-7890         Invoice C-2222
─────────────    ─────────────    ─────────────
Linehaul: $800   Linehaul: $800   Linehaul: $800  ✓
Fuel: $120       Fuel: $120       Fuel: $120      ✓
(none)           (none)           Lumper: $100    ❌
─────────────    ─────────────    ─────────────
Total: $920      Total: $920      Total: $1,020   ❌

┌─────────────────────────────────────────────────────────┐
│ USER OPTIONS                                            │
└─────────────────────────────────────────────────────────┘

Option 1: Update BOL (if charge is legitimate)
    ↓
- Contact driver/shipper to verify
- If confirmed: Add $100 lumper fee to BOL
- Re-run matching
- Invoice clears and can be approved

Option 2: Dispute with Carrier
    ↓
- Click "Dispute"
- System generates email:
  "Invoice C-2222 includes $100 lumper fee not authorized
   on BOL-7890. Please provide proof of delivery receipt
   or issue corrected invoice."
- Status: "disputed"

Option 3: Reject Invoice
    ↓
- Mark as rejected
- Carrier must resubmit corrected invoice
```

---

## Dashboard Design

### Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ FreightFlow - 3-Way Invoice Matching        [Upload Invoice]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Left Column (60%)                Right Column (40%)         │
│                                                              │
│ ┌─────────────────────────────┐  ┌──────────────────────┐  │
│ │ Unmatched Invoices (3)      │  │ 3-Way Match Summary  │  │
│ ├─────────────────────────────┤  ├──────────────────────┤  │
│ │ C-9999 | ACME | $1,234      │  │  Perfect Matches: 12 │  │
│ │   Missing PO/BOL reference  │  │  With Variances: 5   │  │
│ │   [Try Match]               │  │  Flagged: 3          │  │
│ │                             │  │  Disputed: 1         │  │
│ │ C-8888 | Fast | $890        │  │                      │  │
│ │   Low confidence (62%)      │  │  ┌───────────────┐   │  │
│ │   [Manual Match]            │  │  │ [View Report] │   │  │
│ └─────────────────────────────┘  │  └───────────────┘   │  │
│                                   └──────────────────────┘  │
│ ┌─────────────────────────────┐                            │
│ │ Flagged Items (3)           │  ┌──────────────────────┐  │
│ ├─────────────────────────────┤  │ Recent Activity      │  │
│ │ ⚠️ C-7777 | ACME | $1,020   │  ├──────────────────────┤  │
│ │   BOL/Invoice mismatch      │  │ 2m ago: C-9999      │  │
│ │   +$100 unexpected charge   │  │   matched to BOL-123 │  │
│ │   [Review]                  │  │                      │  │
│ │                             │  │ 5m ago: C-8888      │  │
│ │ ⚠️ C-6666 | Fast | $2,450   │  │   flagged (variance) │  │
│ │   PO variance: +$200        │  │                      │  │
│ │   [Review]                  │  │ 10m ago: C-7777     │  │
│ └─────────────────────────────┘  │   approved          │  │
│                                   └──────────────────────┘  │
│ ┌─────────────────────────────┐                            │
│ │ Ready to Approve (5)        │                            │
│ ├─────────────────────────────┤                            │
│ │ ✅ C-5555 | ACME | $1,150   │                            │
│ │   Perfect 3-way match       │                            │
│ │   [Approve]                 │                            │
│ │                             │                            │
│ │ ⚠️ C-4444 | Fast | $980     │                            │
│ │   BOL matches, PO variance  │                            │
│ │   +$30 fuel adjustment      │                            │
│ │   [Review & Approve]        │                            │
│ └─────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

---

### Invoice Detail View (3-Way Comparison)

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard > Invoices > C-2222                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Invoice C-2222 - ACME Trucking           Status: Flagged ⚠️ │
│ Date: 2025-10-25                                            │
│                                                              │
│ [Approve] [Dispute] [Reject] [Add to BOL] [Re-match]       │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Flags                                                        │
│ ❌ HIGH: Invoice total exceeds BOL by $100                  │
│ ❌ HIGH: Lumper Fee $100 not authorized on BOL              │
│ ⚠️  MED: Verify charge wasn't paid separately               │
├─────────────────────────────────────────────────────────────┤
│ 3-Way Comparison                                            │
│                                                              │
│ ┌──────────────┬──────────────┬──────────────┬─────────┐   │
│ │ Charge       │ PO-3456      │ BOL-7890     │ Invoice │   │
│ ├──────────────┼──────────────┼──────────────┼─────────┤   │
│ │ Linehaul     │ $800 ✓       │ $800 ✓       │ $800 ✓  │   │
│ │ Fuel         │ $120 ✓       │ $120 ✓       │ $120 ✓  │   │
│ │ Lumper Fee   │ (none) ❌    │ (none) ❌    │ $100 ❌ │   │
│ ├──────────────┼──────────────┼──────────────┼─────────┤   │
│ │ Total        │ $920         │ $920         │ $1,020  │   │
│ │ Variance     │ -$100        │ -$100        │ -       │   │
│ └──────────────┴──────────────┴──────────────┴─────────┘   │
│                                                              │
│ ⚠️ Key Issue: Lumper Fee appears only on invoice            │
│    - Not authorized at booking (PO)                         │
│    - Not approved at delivery (BOL)                         │
│    - May be duplicate charge                                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Matching Details                                            │
│ Match Type: Exact                                           │
│ PO Found: PO-3456 (confidence: 100%)                       │
│ BOL Found: BOL-7890 (confidence: 100%)                     │
│ Daytona Job: [View Logs]                                   │
├─────────────────────────────────────────────────────────────┤
│ Documents                                                    │
│ 📄 PO-3456 [View] | BOL-7890 [View] | Invoice PDF [View]   │
└─────────────────────────────────────────────────────────────┘
```

---

## Document States

### Purchase Order (PO) States

```
open
  ↓ (shipment dispatched)
shipped
  ↓ (BOL created at delivery)
delivered
  ↓ (invoice received and matched)
invoiced
  ↓ (payment approved)
closed
```

### Bill of Lading (BOL) States

```
in_transit
  ↓ (goods delivered)
delivered
  ↓ (waiting for carrier invoice)
awaiting_invoice
  ↓ (invoice received and matched)
invoiced
  ↓ (payment approved)
closed
```

### Invoice States

```
uploaded
  ↓ (AI parsing)
parsed
  ↓ (matching to PO and BOL)
matched | unmatched | flagged
  ↓
ready_to_approve | needs_review
  ↓
approved | disputed | rejected
```

---

## Matching Logic

### 3-Way Matching Algorithm

```typescript
interface ThreeWayMatchResult {
  po_id: string | null;
  bol_id: string | null;
  match_confidence: number;
  match_type: 'perfect' | 'bol_approved' | 'variance' | 'mismatch';
  flags: Flag[];
  comparison: ThreeWayComparison;
}

async function threeWayMatch(invoiceId: string): Promise<ThreeWayMatchResult> {
  // 1. Load invoice
  const invoice = await getInvoice(invoiceId);

  // 2. Find PO (by PO number on invoice)
  const po = await findPO(invoice.po_number);
  if (!po) {
    return flagMissingPO(invoice);
  }

  // 3. Find BOL (by BOL number, or via PO reference)
  const bol = await findBOL(invoice.bol_number || po.bol_number);
  if (!bol) {
    return flagMissingBOL(invoice, po);
  }

  // 4. Validate relationships
  if (bol.po_id !== po.id) {
    flags.push({
      code: 'PO_BOL_MISMATCH',
      severity: 'high',
      message: 'BOL does not reference this PO'
    });
  }

  // 5. Three-way comparison
  const comparison = compareThreeWay(po, bol, invoice);

  // 6. Matching priority logic:
  //    BOL is source of truth (actual delivery)
  //    Invoice MUST match BOL
  //    PO variance is acceptable if BOL explains it

  const flags: Flag[] = [];

  // Check 1: Invoice vs BOL (CRITICAL)
  if (!comparison.invoice_matches_bol) {
    flags.push({
      code: 'INVOICE_BOL_MISMATCH',
      severity: 'high',
      message: `Invoice total ${invoice.total} doesn't match BOL ${bol.total}`
    });
  }

  // Check 2: BOL vs PO (INFORMATIONAL)
  if (!comparison.bol_matches_po) {
    // This is OK if BOL has notes explaining variance
    if (bol.notes && bol.notes.includes('adjusted')) {
      flags.push({
        code: 'PO_BOL_VARIANCE',
        severity: 'low',
        message: `BOL charges differ from PO (explained in BOL notes)`,
        context: { variance: comparison.po_bol_variance }
      });
    } else {
      flags.push({
        code: 'PO_BOL_VARIANCE',
        severity: 'med',
        message: `BOL charges differ from PO without explanation`,
        context: { variance: comparison.po_bol_variance }
      });
    }
  }

  // Check 3: Charge-by-charge comparison
  for (const charge of comparison.charge_comparison) {
    if (!charge.on_bol && charge.on_invoice) {
      flags.push({
        code: 'UNEXPECTED_CHARGE',
        severity: 'high',
        message: `${charge.description} $${charge.invoice_amount} not on BOL`,
        context: { charge: charge.description }
      });
    }
  }

  // 7. Determine match type
  let matchType: 'perfect' | 'bol_approved' | 'variance' | 'mismatch';

  if (comparison.perfect_three_way_match) {
    matchType = 'perfect';
  } else if (comparison.invoice_matches_bol) {
    matchType = 'bol_approved'; // BOL is source of truth
  } else if (comparison.variance_within_tolerance) {
    matchType = 'variance';
  } else {
    matchType = 'mismatch';
  }

  // 8. Return result
  return {
    po_id: po.id,
    bol_id: bol.id,
    match_confidence: calculateConfidence(comparison),
    match_type: matchType,
    flags,
    comparison
  };
}

function compareThreeWay(po: PO, bol: BOL, invoice: Invoice) {
  const poCharges = po.expected_charges;
  const bolCharges = bol.actual_charges;
  const invoiceCharges = invoice.charges;

  const chargeMap: Map<string, ChargeComparison> = new Map();

  // Normalize charge descriptions for matching
  const normalize = (desc: string) =>
    desc.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Build comprehensive charge comparison
  const allCharges = new Set([
    ...poCharges.map(c => normalize(c.description)),
    ...bolCharges.map(c => normalize(c.description)),
    ...invoiceCharges.map(c => normalize(c.description))
  ]);

  for (const chargeKey of allCharges) {
    const poCharge = poCharges.find(c => normalize(c.description) === chargeKey);
    const bolCharge = bolCharges.find(c => normalize(c.description) === chargeKey);
    const invCharge = invoiceCharges.find(c => normalize(c.description) === chargeKey);

    chargeMap.set(chargeKey, {
      description: invCharge?.description || bolCharge?.description || poCharge?.description,
      po_amount: poCharge?.amount || null,
      bol_amount: bolCharge?.amount || null,
      invoice_amount: invCharge?.amount || null,
      on_po: !!poCharge,
      on_bol: !!bolCharge,
      on_invoice: !!invCharge,
      match_status: determineMatchStatus(poCharge, bolCharge, invCharge)
    });
  }

  return {
    charge_comparison: Array.from(chargeMap.values()),
    po_total: po.total_amount,
    bol_total: bol.total_amount,
    invoice_total: invoice.total_amount,
    po_bol_variance: bol.total_amount - po.total_amount,
    bol_invoice_variance: invoice.total_amount - bol.total_amount,
    perfect_three_way_match:
      po.total_amount === bol.total_amount &&
      bol.total_amount === invoice.total_amount,
    invoice_matches_bol:
      Math.abs(invoice.total_amount - bol.total_amount) < 0.01,
    bol_matches_po:
      Math.abs(bol.total_amount - po.total_amount) < 0.01,
    variance_within_tolerance:
      Math.abs(invoice.total_amount - bol.total_amount) / bol.total_amount < 0.02
  };
}
```

---

## Flag System

### 3-Way Matching Flags

| Flag Code | Severity | Description | Blocks Approval? |
|-----------|----------|-------------|------------------|
| `MISSING_PO` | High | No PO found for invoice | ✅ Yes |
| `MISSING_BOL` | High | No BOL found for invoice | ✅ Yes |
| `PO_BOL_MISMATCH` | High | BOL doesn't reference PO | ✅ Yes |
| `INVOICE_BOL_MISMATCH` | High | Invoice doesn't match BOL | ✅ Yes |
| `UNEXPECTED_CHARGE` | High | Charge on invoice not on BOL | ✅ Yes |
| `PO_BOL_VARIANCE` | Low/Med | BOL differs from PO | ℹ️ No (if explained) |
| `CHARGE_VARIANCE` | Med | Charge amounts differ | ⚠️ Review needed |
| `MISSING_CHARGE_ON_INVOICE` | Low | BOL charge not invoiced | ℹ️ No |
| `DUPLICATE_INVOICE` | High | Invoice already processed | ✅ Yes |
| `BOL_ALREADY_INVOICED` | High | BOL already paid | ✅ Yes |
| `CARRIER_MISMATCH` | High | Invoice carrier ≠ PO/BOL carrier | ✅ Yes |
| `DATE_ANOMALY` | Low | Invoice date before delivery | ℹ️ No |

---

## UI Components

### Key Components for 3-Way Matching

#### `<ThreeWayComparisonTable />`

Side-by-side view of all three documents:

```tsx
<ThreeWayComparisonTable
  po={po}
  bol={bol}
  invoice={invoice}
  comparison={comparison}
/>
```

Renders:
```
┌─────────────┬──────────┬──────────┬──────────┬─────────┐
│ Charge      │ PO-1234  │ BOL-5678 │ Invoice  │ Status  │
├─────────────┼──────────┼──────────┼──────────┼─────────┤
│ Linehaul    │ $1,000   │ $1,000   │ $1,000   │ ✅ Match│
│ Fuel        │ $150     │ $145     │ $145     │ ⚠️ PO≠  │
│ Detention   │ -        │ $75      │ $75      │ ✅ BOL  │
├─────────────┼──────────┼──────────┼──────────┼─────────┤
│ Total       │ $1,150   │ $1,220   │ $1,220   │ ✅ Match│
└─────────────┴──────────┴──────────┴──────────┴─────────┘
```

#### `<MatchStatusBadge />`

Visual indicator of match type:
- 🟢 **Perfect Match** - All three documents identical
- 🟡 **BOL Approved** - Invoice matches BOL, PO variance explained
- 🟠 **Variance** - Small differences within tolerance
- 🔴 **Mismatch** - Significant discrepancies

#### `<ThreeWayMatchSummary />`

Dashboard widget showing stats:
```
┌──────────────────────────┐
│ 3-Way Match Summary      │
├──────────────────────────┤
│ 🟢 Perfect Matches: 12   │
│ 🟡 BOL Approved: 5       │
│ 🟠 With Variance: 2      │
│ 🔴 Flagged: 3            │
│ ⚫ Disputed: 1           │
├──────────────────────────┤
│ [View Detailed Report]   │
└──────────────────────────┘
```

---

## API Integration

### New/Modified Endpoints

#### `POST /api/invoices/match-three-way/:invoiceId`

Performs 3-way matching instead of just BOL matching.

**Response**:
```typescript
{
  invoice_id: string,
  po_id: string,
  bol_id: string,
  match_type: 'perfect' | 'bol_approved' | 'variance' | 'mismatch',
  match_confidence: number,

  comparison: {
    charge_comparison: Array<{
      description: string,
      po_amount: number | null,
      bol_amount: number | null,
      invoice_amount: number | null,
      match_status: 'perfect' | 'bol_match' | 'variance' | 'mismatch'
    }>,

    po_total: number,
    bol_total: number,
    invoice_total: number,

    po_bol_variance: number,
    bol_invoice_variance: number,

    perfect_three_way_match: boolean,
    invoice_matches_bol: boolean,
    bol_matches_po: boolean
  },

  flags: Array<Flag>,

  status: 'matched' | 'flagged' | 'ready_to_approve',
  daytona_job_id: string,
  daytona_logs_url: string
}
```

#### `GET /api/analytics/three-way-stats`

Dashboard statistics:

```typescript
{
  total_invoices: number,

  match_breakdown: {
    perfect_matches: number,
    bol_approved: number,
    with_variance: number,
    mismatched: number
  },

  common_variances: Array<{
    type: 'fuel_adjustment' | 'detention' | 'lumper' | 'other',
    count: number,
    avg_amount: number
  }>,

  avg_po_variance: number,
  avg_bol_invoice_variance: number
}
```

---

## Implementation Priority

### Phase 1: Data Model Update
1. Add PO table and relationships
2. Link BOLs to POs
3. Update invoice matching to include PO lookup

### Phase 2: 3-Way Matching Logic
1. Implement three-way comparison algorithm
2. Update flag system for 3-way scenarios
3. Deploy Daytona job for 3-way matching

### Phase 3: UI Components
1. Build `<ThreeWayComparisonTable />`
2. Update dashboard with 3-way stats
3. Add PO/BOL/Invoice detail views

### Phase 4: Workflows
1. Add "Update BOL" flow
2. Enhanced dispute with 3-way context
3. Reporting and analytics

---

## Key Takeaways

**The BOL is King**: In 3-way matching for freight:
- PO = **Expectation** (what was agreed at booking)
- BOL = **Reality** (what actually happened during shipment)
- Invoice = **Bill** (what carrier is charging)

**Matching Priority**:
1. Invoice MUST match BOL (critical)
2. PO variance is acceptable if BOL explains it
3. Charges approved on BOL are legitimate even if not on PO

**Why This Works**:
- Prevents paying for unauthorized charges
- Allows legitimate adjustments documented on BOL
- Provides full audit trail (PO → BOL → Invoice)
- Catches errors, fraud, and discrepancies automatically

---

**Status**: Ready for Implementation
**Last Updated**: 2025-10-25
