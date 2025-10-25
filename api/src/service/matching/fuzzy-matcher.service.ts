import { db } from '@/db/client';
import {
  purchaseOrdersTable,
  type POEntity,
} from '@/db/schema/purchase-orders.db';
import {
  billsOfLadingTable,
  type BillOfLadingEntity,
} from '@/db/schema/bol.db';
import { type InvoiceEntity } from '@/db/schema/invoices.db';
import { eq, or } from 'drizzle-orm';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Schema for match result
const matchResultSchema = z.object({
  best_match_index: z
    .number()
    .describe('Index of best matching document, or -1 if no good match'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0-1'),
  reasoning: z
    .string()
    .describe('2-3 sentences explaining the matching decision'),
});

/**
 * Fuzzy Matching Service
 *
 * Finds the best matching document when exact PO number match fails
 * Uses LLM to analyze similarity between documents
 */
export abstract class FuzzyMatcherService {
  /**
   * Find best matching PO for an invoice using LLM
   */
  static async findMatchingPO(
    invoice: InvoiceEntity
  ): Promise<{ po: POEntity; confidence: number; reasoning: string } | null> {
    // Get all unmatched POs
    const unmatchedPOs = await this.getUnmatchedPOs();

    if (unmatchedPOs.length === 0) {
      console.log('No unmatched POs found for fuzzy matching');
      return null;
    }

    console.log(
      `Fuzzy matching invoice against ${unmatchedPOs.length} unmatched POs`
    );

    try {
      // Use LLM to find best match
      const llmResult = await this.analyzePOMatches(invoice, unmatchedPOs);

      // Return best match if confidence > threshold (0.7)
      if (llmResult.confidence >= 0.7) {
        return llmResult;
      }

      console.log(
        `Fuzzy match confidence too low: ${llmResult.confidence} < 0.7`
      );
      return null;
    } catch (error) {
      console.error('Error in fuzzy PO matching:', error);
      return null;
    }
  }

  /**
   * Find best matching BOL for a PO using LLM
   */
  static async findMatchingBOL(
    po: POEntity,
    invoice: InvoiceEntity
  ): Promise<{
    bol: BillOfLadingEntity;
    confidence: number;
    reasoning: string;
  } | null> {
    // Get all unmatched BOLs
    const unmatchedBOLs = await this.getUnmatchedBOLs();

    console.log('Unmatched BOLs:', unmatchedBOLs);

    if (unmatchedBOLs.length === 0) {
      console.log('No unmatched BOLs found for fuzzy matching');
      return null;
    }

    console.log(
      `Fuzzy matching BOL against ${unmatchedBOLs.length} unmatched BOLs`
    );

    try {
      // Use LLM to find best match
      const llmResult = await this.analyzeBOLMatches(
        po,
        invoice,
        unmatchedBOLs
      );

      console.log('bol-match-resut:', llmResult);

      // Return best match if confidence > threshold (0.5)
      if (llmResult.confidence >= 0.2) {
        return llmResult;
      }

      console.log(
        `Fuzzy BOL match confidence too low: ${llmResult.confidence} < 0.7`,
        llmResult.reasoning
      );
      return null;
    } catch (error) {
      console.error('Error in fuzzy BOL matching:', error);
      return null;
    }
  }

  /**
   * Get all unmatched POs from database
   */
  private static async getUnmatchedPOs(): Promise<POEntity[]> {
    return db
      .select()
      .from(purchaseOrdersTable)
      .where(
        or(
          eq(purchaseOrdersTable.status, 'pending'),
          eq(purchaseOrdersTable.status, 'bol_received')
        )
      );
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
${candidatePOs
  .map(
    (po, idx) => `
[${idx}] PO Number: ${po.po_number}
- Customer: ${po.customer_name}
- Carrier: ${po.carrier_name}
- Total: $${po.total_amount}
- Origin: ${po.origin} → Destination: ${po.destination}
- Pickup: ${po.pickup_date} → Delivery: ${po.delivery_date}
- Expected Charges:
${po.expected_charges
  .map((c) => `  - ${c.description}: $${c.amount}`)
  .join('\n')}
`
  )
  .join('\n')}

**Your Task:**
Determine which Purchase Order (if any) best matches this invoice. Consider:
1. Carrier name similarity (very important)
2. Total amount proximity (important)
3. Charge descriptions and amounts (important)
4. Dates (pickup/delivery vs invoice date)
5. PO number similarity (typos, formatting differences like "PO-1234" vs "1234")
6. Origin/destination if mentioned in invoice

**Important Rules:**
- If no PO is a reasonable match, return -1
- Be conservative - only return high confidence if the match is clear
- Consider that PO numbers might have typos or format differences

Return your analysis.`;

    const { object: result } = await generateObject({
      model: google('gemini-2.0-flash-exp'),
      schema: matchResultSchema,
      prompt,
    });

    if (result.best_match_index === -1) {
      throw new Error('No matching PO found by LLM');
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
  ): Promise<{
    bol: BillOfLadingEntity;
    confidence: number;
    reasoning: string;
  }> {
    const prompt = `You are analyzing a Purchase Order and Invoice to find the best matching Bill of Lading.

**Purchase Order:**
- PO Number: ${po.po_number}
- Customer: ${po.customer_name}
- Carrier: ${po.carrier_name}
- Origin: ${po.origin} → Destination: ${po.destination}
- Pickup: ${po.pickup_date} → Delivery: ${po.delivery_date}
- Total: $${po.total_amount}

**Invoice:**
- Invoice Number: ${invoice.invoice_number}
- Carrier: ${invoice.carrier_name}
- Total: $${invoice.total_amount}
- BOL Number Referenced: ${invoice.bol_number || 'N/A'}

**Candidate Bills of Lading:**
${candidateBOLs
  .map(
    (bol, idx) => `
[${idx}] BOL Number: ${bol.bol_number}
- Carrier: ${bol.carrier_name}
- Origin: ${bol.origin} → Destination: ${bol.destination}
- Pickup: ${bol.pickup_date} → Delivery: ${bol.delivery_date}
- PO Number Referenced: ${bol.po_number || 'N/A'}
${
  bol.actual_charges
    ? `- Actual Charges:\n${bol.actual_charges
        .map((c) => `  - ${c.description}: $${c.amount}`)
        .join('\n')}`
    : ''
}
`
  )
  .join('\n')}

**Your Task:**
Determine which Bill of Lading (if any) best matches this PO and Invoice. Consider:
1. Carrier name consistency (very important)
2. Origin and destination match (very important)
3. Dates consistency (pickup/delivery dates)
4. BOL number similarity to invoice's referenced BOL
5. PO number similarity to BOL's referenced PO

**Important Rules:**
- If no BOL is a reasonable match, return -1
- Be conservative - only return high confidence if the match is clear

Return your analysis.`;

    console.log('bol-match-prompt:', prompt);

    const { object: result } = await generateObject({
      model: google('gemini-2.0-flash-exp'),
      schema: matchResultSchema,
      prompt,
    });

    console.log('bol-match-result:', result);

    if (result.best_match_index === -1) {
      throw new Error('No matching BOL found by LLM');
    }

    return {
      bol: candidateBOLs[result.best_match_index],
      confidence: result.confidence,
      reasoning: result.reasoning,
    };
  }
}
