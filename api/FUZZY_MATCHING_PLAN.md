# Fuzzy 3-Way Matching Implementation Plan

## Problem Statement

Currently, matching only works when all documents share the same PO number. This plan addresses scenarios where:
- Invoice references a PO number that doesn't exist
- BOL is missing for a given PO number
- Documents are related but have mismatched/typo'd PO numbers

## Flow Overview

```
Invoice Upload
    ↓
Try Exact PO Number Match
    ↓
    ├─→ [Found] → Continue with normal 3-way match
    ↓
    └─→ [Not Found] → Fuzzy Matching Process
              ↓
        Query unmatched documents from DB
              ↓
        Send to LLM for similarity analysis
              ↓
        Get best match candidates
              ↓
        Continue 3-way match with fuzzy-matched docs
              ↓
        Mark result as "fuzzy_po_match" in comparison
```

## Implementation Steps

### Step 1: Extend Database Schema

**File:** `api/src/db/schema/matching-results.db.ts`

Add new fields to track fuzzy matching:

```typescript
export const matchingResultsTable = pgTable('matching_results', {
  // ... existing fields ...

  // NEW: Fuzzy matching metadata
  po_number_match_type: text('po_number_match_type')
    .$type<'exact' | 'fuzzy' | 'manual'>()
    .default('exact'),

  fuzzy_match_confidence: real('fuzzy_match_confidence'), // 0-1 for fuzzy matches

  fuzzy_match_reasoning: text('fuzzy_match_reasoning'), // LLM explanation

  comparison: jsonb('comparison').$type<{
    // ... existing fields ...
    po_number_mismatch?: {
      invoice_po: string;
      matched_po: string;
      reason: string;
    };
  }>(),
});
```

### Step 2: Create Fuzzy Matching Service

**File:** `api/src/service/matching/fuzzy-matcher.service.ts`

```typescript
/**
 * Fuzzy Matching Service
 *
 * Finds the best matching document when exact PO number match fails
 */
export abstract class FuzzyMatcherService {

  /**
   * Find best matching PO for an invoice using LLM
   */
  static async findMatchingPO(
    invoice: InvoiceEntity
  ): Promise<{ po: POEntity; confidence: number; reasoning: string } | null> {
    // 1. Get all unmatched POs
    const unmatchedPOs = await this.getUnmatchedPOs();

    // 2. Use LLM to find best match
    const llmResult = await this.analyzePOMatches(invoice, unmatchedPOs);

    // 3. Return best match if confidence > threshold (e.g., 0.7)
    if (llmResult.confidence > 0.7) {
      return llmResult;
    }

    return null;
  }

  /**
   * Find best matching BOL for a PO using LLM
   */
  static async findMatchingBOL(
    po: POEntity,
    invoice: InvoiceEntity
  ): Promise<{ bol: BillOfLadingEntity; confidence: number; reasoning: string } | null> {
    // 1. Get all unmatched BOLs
    const unmatchedBOLs = await this.getUnmatchedBOLs();

    // 2. Use LLM to find best match
    const llmResult = await this.analyzeBOLMatches(po, invoice, unmatchedBOLs);

    // 3. Return best match if confidence > threshold
    if (llmResult.confidence > 0.7) {
      return llmResult;
    }

    return null;
  }

  /**
   * Get all unmatched POs from database
   */
  private static async getUnmatchedPOs(): Promise<POEntity[]> {
    return db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.status, 'pending'));
  }

  /**
   * Get all unmatched BOLs from database
   */
  private static async getUnmatchedBOLs(): Promise<BillOfLadingEntity[]> {
    return db
      .select()
      .from(billsOfLadingTable)
      .where(eq(billsOfLadingTable.status, 'pending'));
  }

  /**
   * Use LLM to analyze which PO best matches the invoice
   */
  private static async analyzePOMatches(
    invoice: InvoiceEntity,
    candidatePOs: POEntity[]
  ): Promise<{ po: POEntity; confidence: number; reasoning: string }> {
    const prompt = `You are analyzing an invoice to find the best matching Purchase Order.

**Invoice:**
- Invoice Number: ${invoice.invoice_number}
- Carrier: ${invoice.carrier_name}
- Invoice Date: ${invoice.invoice_date}
- Referenced PO Number: ${invoice.po_number}
- Total Amount: $${invoice.total_amount}
- Charges:
${invoice.charges.map((c) => `  - ${c.description}: $${c.amount}`).join('\n')}

**Candidate Purchase Orders:**
${candidatePOs.map((po, idx) => `
[${idx}] PO Number: ${po.po_number}
- Customer: ${po.customer_name}
- Carrier: ${po.carrier_name}
- Total: $${po.total_amount}
- Origin: ${po.origin} → Destination: ${po.destination}
- Pickup: ${po.pickup_date} → Delivery: ${po.delivery_date}
- Expected Charges:
${po.expected_charges.map((c) => `  - ${c.description}: $${c.amount}`).join('\n')}
`).join('\n')}

**Your Task:**
Determine which Purchase Order (if any) best matches this invoice. Consider:
1. Carrier name similarity
2. Total amount proximity
3. Charge descriptions and amounts
4. Dates (pickup/delivery vs invoice date)
5. PO number similarity (typos, formatting differences)

Return your analysis as a JSON object with:
- best_match_index: number (index of best matching PO, or -1 if no good match)
- confidence: number from 0-1 (how confident you are)
- reasoning: string (2-3 sentences explaining your decision)

Return ONLY valid JSON, no markdown formatting.`;

    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      prompt,
    });

    const cleaned = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const result = JSON.parse(cleaned);

    if (result.best_match_index === -1) {
      throw new Error('No matching PO found');
    }

    return {
      po: candidatePOs[result.best_match_index],
      confidence: result.confidence,
      reasoning: result.reasoning,
    };
  }

  /**
   * Use LLM to analyze which BOL best matches the PO and Invoice
   */
  private static async analyzeBOLMatches(
    po: POEntity,
    invoice: InvoiceEntity,
    candidateBOLs: BillOfLadingEntity[]
  ): Promise<{ bol: BillOfLadingEntity; confidence: number; reasoning: string }> {
    // Similar implementation to analyzePOMatches but for BOLs
    // Compare carrier, origin/destination, dates, weights, etc.
    // Return best match with confidence and reasoning
  }
}
```

### Step 3: Update Main Matching Service

**File:** `api/src/service/matching/matching.service.ts`

Modify `fetchRelatedDocuments` to support fuzzy matching:

```typescript
/**
 * Phase 1: Fetch related documents
 * Now supports fuzzy matching when exact PO number match fails
 */
static async fetchRelatedDocuments(
  invoiceId: Id<'inv'>
): Promise<{
  docs: MatchingDocuments;
  fuzzyMatchData?: {
    po_match_type: 'exact' | 'fuzzy';
    po_confidence?: number;
    po_reasoning?: string;
    bol_match_type: 'exact' | 'fuzzy' | 'missing';
    bol_confidence?: number;
    bol_reasoning?: string;
  };
} | null> {
  // Get invoice
  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId));

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  let po: POEntity | null = null;
  let fuzzyMatchData: any = {};

  // Try exact PO match first
  const [exactPO] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.po_number, invoice.po_number));

  if (exactPO) {
    po = exactPO;
    fuzzyMatchData.po_match_type = 'exact';
  } else {
    // FUZZY MATCHING: Try to find similar PO
    console.log(`No exact PO match for ${invoice.po_number}, trying fuzzy match...`);

    const fuzzyPOResult = await FuzzyMatcherService.findMatchingPO(invoice);

    if (fuzzyPOResult) {
      po = fuzzyPOResult.po;
      fuzzyMatchData.po_match_type = 'fuzzy';
      fuzzyMatchData.po_confidence = fuzzyPOResult.confidence;
      fuzzyMatchData.po_reasoning = fuzzyPOResult.reasoning;

      console.log(`Fuzzy matched PO: ${po.po_number} (confidence: ${fuzzyPOResult.confidence})`);
    } else {
      // No PO found - cannot match
      return null;
    }
  }

  // Try exact BOL match first
  let bol: BillOfLadingEntity | null = null;
  const [exactBOL] = await db
    .select()
    .from(billsOfLadingTable)
    .where(eq(billsOfLadingTable.po_number, po.po_number));

  if (exactBOL) {
    bol = exactBOL;
    fuzzyMatchData.bol_match_type = 'exact';
  } else {
    // FUZZY MATCHING: Try to find similar BOL
    const fuzzyBOLResult = await FuzzyMatcherService.findMatchingBOL(po, invoice);

    if (fuzzyBOLResult) {
      bol = fuzzyBOLResult.bol;
      fuzzyMatchData.bol_match_type = 'fuzzy';
      fuzzyMatchData.bol_confidence = fuzzyBOLResult.confidence;
      fuzzyMatchData.bol_reasoning = fuzzyBOLResult.reasoning;
    } else {
      fuzzyMatchData.bol_match_type = 'missing';
    }
  }

  return {
    docs: {
      po,
      bol,
      invoice,
    },
    fuzzyMatchData,
  };
}
```

### Step 4: Update Save Matching Result

**File:** `api/src/service/matching/matching.service.ts`

Include fuzzy match metadata in saved results:

```typescript
static async saveMatchingResult(
  docs: MatchingDocuments,
  llmAnalysis: LLMMatchingAnalysis,
  fuzzyMatchData?: any
): Promise<MatchingResultEntity> {
  // ... existing code ...

  const newResult: MatchingResultEntity = {
    // ... existing fields ...

    // NEW: Fuzzy matching fields
    po_number_match_type: fuzzyMatchData?.po_match_type || 'exact',
    fuzzy_match_confidence: fuzzyMatchData?.po_confidence || null,
    fuzzy_match_reasoning: fuzzyMatchData?.po_reasoning || null,

    comparison: {
      // ... existing fields ...

      // NEW: PO number mismatch details
      po_number_mismatch: fuzzyMatchData?.po_match_type === 'fuzzy' ? {
        invoice_po: docs.invoice.po_number,
        matched_po: docs.po.po_number,
        reason: fuzzyMatchData.po_reasoning,
      } : undefined,
    },
  };

  // ... rest of save logic ...
}
```

### Step 5: Update Main Matching Entry Point

**File:** `api/src/service/matching/matching.service.ts`

```typescript
static async runThreeWayMatch(invoiceId: Id<'inv'>): Promise<{
  success: boolean;
  matched: boolean;
  result: MatchingResultEntity | null;
  llm_analysis?: LLMMatchingAnalysis;
  fuzzy_match_used?: boolean;
  error?: string;
}> {
  try {
    // Phase 1: Fetch documents (with fuzzy matching support)
    const fetchResult = await this.fetchRelatedDocuments(invoiceId);

    if (!fetchResult) {
      return {
        success: false,
        matched: false,
        result: null,
        error: 'Could not find related PO for invoice (even with fuzzy matching)',
      };
    }

    const { docs, fuzzyMatchData } = fetchResult;

    // Phase 2: Use LLM to analyze the match
    const llmAnalysis = await this.analyzeMatchWithLLM(docs);

    // Phase 3: Save matching result with fuzzy match metadata
    const matchingResult = await this.saveMatchingResult(
      docs,
      llmAnalysis,
      fuzzyMatchData
    );

    // Phase 4: Update document statuses
    await this.updateDocumentStatuses(docs, llmAnalysis);

    return {
      success: true,
      matched: llmAnalysis.matched,
      result: matchingResult,
      llm_analysis: llmAnalysis,
      fuzzy_match_used: fuzzyMatchData?.po_match_type === 'fuzzy',
    };
  } catch (error) {
    console.error('Error in 3-way matching:', error);
    return {
      success: false,
      matched: false,
      result: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

## Implementation Order

1. **Schema Changes** - Add fuzzy matching fields to database
2. **Fuzzy Matcher Service** - Build the core LLM-based fuzzy matching
3. **Update Fetch Logic** - Integrate fuzzy matching into document fetching
4. **Update Save Logic** - Store fuzzy match metadata
5. **Frontend Updates** - Display fuzzy match warnings in MatchingView

## Frontend Updates Needed

**File:** `web/components/matching/MatchingView.tsx`

Add visual indicators for fuzzy matches:

```tsx
// In the details dialog, add a warning section
{result.po_number_match_type === 'fuzzy' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2">
      <RiAlertLine className="h-5 w-5 text-yellow-600" />
      <h3 className="font-semibold text-yellow-900">
        Fuzzy PO Match
      </h3>
    </div>
    <div className="text-sm text-yellow-800">
      <p className="mb-1">
        Invoice references PO: <code>{result.comparison.po_number_mismatch?.invoice_po}</code>
      </p>
      <p className="mb-2">
        Matched to PO: <code>{result.comparison.po_number_mismatch?.matched_po}</code>
      </p>
      <p className="italic">
        {result.fuzzy_match_reasoning}
      </p>
      <p className="mt-2 text-xs">
        Confidence: {(result.fuzzy_match_confidence * 100).toFixed(0)}%
      </p>
    </div>
  </div>
)}
```

## Testing Strategy

1. **Exact Match Test** - Verify existing functionality still works
2. **Typo Test** - Invoice references "PO-1234" but PO is "PO-12345"
3. **Format Test** - Invoice references "1234" but PO is "PO-1234"
4. **No Match Test** - Invoice references completely different PO number
5. **Missing BOL Test** - PO exists but no BOL, fuzzy match BOL
6. **Confidence Threshold Test** - Low confidence match should fail gracefully

## Confidence Thresholds

- **High Confidence (≥ 0.85)**: Auto-match, mark as fuzzy
- **Medium Confidence (0.70-0.84)**: Auto-match, flag for review
- **Low Confidence (< 0.70)**: Do not match, mark as "no_match"

## Benefits

1. **Handles typos** in PO numbers
2. **Handles format variations** (e.g., "PO-1234" vs "1234")
3. **Handles missing links** when BOL doesn't reference correct PO
4. **Transparent to users** - fuzzy matches are clearly marked
5. **Maintains accuracy** - uses confidence thresholds to avoid false positives
