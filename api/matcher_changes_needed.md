# Database Schema Changes Needed for Matching System (MVP)

## Overview

Based on the matching system design where **PO Number is the primary linkage**, here are the ONLY changes needed to make it work for a basic MVP.

---

## Required Changes (Functional Only)

### 1. Invoice.po_number Should Be Required ⚠️ HIGH PRIORITY

**Current State:**
```typescript
// invoices.db.ts
po_number: text('po_number'),  // ← OPTIONAL
```

**Problem:**
- The entire matching system depends on `po_number` to link documents
- Without `po_number`, we cannot find the related PO or BOL
- Currently nullable, which means invoices can be created without a PO reference

**Required Change:**
```typescript
// invoices.db.ts
po_number: text('po_number').notNull(),  // ← MAKE REQUIRED
```

**Impact:**
- Frontend forms must require PO number input
- OCR must extract PO number or matching will fail
- API validation must enforce this field

**Migration Needed:** Yes - any existing invoices without `po_number` will need to be handled

---

## Schema Validation - Everything Else is Fine ✓

### Products vs Charges - Current Approach is Perfect ✓

**Current Design:**
```typescript
PO: expected_charges: Array<{description, amount}>
BOL: actual_charges: Array<{description, amount}>  // optional
Invoice: charges: Array<{description, amount}>
```

**Analysis:**

**✅ KEEP THIS APPROACH** - Here's why:

In freight logistics, the "charges" ARE the products/line items:
- Base Freight
- Fuel Surcharge
- Accessorial Fees
- Detention
- Liftgate Service
- Residential Delivery

The matching system compares these "charge descriptions" across documents, which is effectively product matching.

**No Change Needed** - The current schema already supports what we need.

---

### 5. BOL.actual_charges is Optional - This is Correct ✓

**Current State:**
```typescript
// bol.db.ts
actual_charges: jsonb('actual_charges').$type<...>(),  // Optional
```

**Analysis:**

**✅ KEEP AS OPTIONAL** - Here's why:

Bills of Lading typically show:
- What was shipped (items, weight, dimensions)
- Who shipped it (carrier)
- Where it went (origin/destination)
- When it was delivered (dates)

**BUT:** BOLs often DO NOT show charges/pricing. The invoice is the first time pricing appears.

**Matching Logic Should Handle This:**
```typescript
// If BOL has charges, use them in comparison
if (bol.actual_charges && bol.actual_charges.length > 0) {
  // Compare PO → BOL → Invoice charges
} else {
  // Compare PO → Invoice charges only
}
```

**No Change Needed** - Field should remain optional.

---

## These Schemas Are Already Perfect - No Changes Needed

### ✓ Purchase Orders Schema
- `po_number` is unique and required ✓
- `expected_charges` array structure is perfect ✓
- Status values are appropriate ✓

### ✓ Bills of Lading Schema
- `po_number` is required (for linkage) ✓
- `po_id` foreign key is optional (good for direct linking) ✓
- `bol_number` is unique ✓
- Status values are appropriate ✓

### ✓ Flags Schema
- FlagCode enum has all necessary types ✓
- Severity levels (low/med/high) are good ✓
- Polymorphic entity reference is flexible ✓
- Resolution tracking is complete ✓

### ✓ Matching Results Schema
- Links all three documents correctly ✓
- Has match_status enum ✓
- Comparison structure is comprehensive ✓
- Tracks flag counts ✓

---

## Summary: What Actually Needs to Change

### ONE CRITICAL CHANGE:

**Make Invoice.po_number required**
```typescript
// invoices.db.ts - Change this line:
po_number: text('po_number'),  // Current
// To:
po_number: text('po_number').notNull(),  // Required
```

That's it. Everything else already works for MVP.

---

## Migration Script (If Needed)

```sql
-- Only if you have existing invoices without po_number
UPDATE invoices
SET po_number = 'UNKNOWN-' || id
WHERE po_number IS NULL;

-- Then add NOT NULL constraint
ALTER TABLE invoices
ALTER COLUMN po_number SET NOT NULL;
```

---

## Frontend Implications

Just need to ensure PO number is captured:

**Invoice Upload Form:**
```typescript
// Make sure PO number field is required
<input name="po_number" required />
```

**OCR Service:**
```typescript
// Extract PO number from invoice
extractedData.po_number  // Must be present
```

---

## Testing Checklist (MVP)

After making the schema change:

- [ ] Create invoice with PO number → should work ✓
- [ ] Create invoice without PO number → should fail ✓
- [ ] Matching can find PO and BOL by po_number ✓

---

## Conclusion

**Changes Needed:** 1
1. Make `invoice.po_number` required (`.notNull()`)

**Everything Else:** Already perfect for MVP ✓

The schema is basically ready - just need to enforce that one field.
