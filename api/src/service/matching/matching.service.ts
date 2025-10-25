import { db } from '@/db/client';
import {
  purchaseOrdersTable,
  type POEntity,
} from '@/db/schema/purchase-orders.db';
import {
  billsOfLadingTable,
  type BillOfLadingEntity,
} from '@/db/schema/bol.db';
import { invoicesTable, type InvoiceEntity } from '@/db/schema/invoices.db';
import {
  matchingResultsTable,
  type MatchingResultEntity,
} from '@/db/schema/matching-results.db';
import { generateId, type Id } from '@/lib/id';
import { eq } from 'drizzle-orm';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import Elysia from 'elysia';

/**
 * Documents required for 3-way matching
 */
interface MatchingDocuments {
  po: POEntity;
  bol: BillOfLadingEntity | null;
  invoice: InvoiceEntity;
}

/**
 * LLM matching analysis response
 */
interface LLMMatchingAnalysis {
  matched: boolean;
  confidence: number; // 0-1
  variance_amount: number;
  variance_percentage: number;
  reasoning: string;
  discrepancies: Array<{
    field: string;
    po_value: string | number;
    invoice_value: string | number;
    issue: string;
  }>;
}

/**
 * 3-Way Matching Service
 *
 * Currently implements only the perfect match case where:
 * - All documents link by PO number
 * - All amounts match
 * - No discrepancies found
 */
export abstract class MatchingService {
  /**
   * Phase 1: Fetch related documents by PO number from invoice
   */
  static async fetchRelatedDocuments(
    invoiceId: Id<'inv'>
  ): Promise<MatchingDocuments | null> {
    // Get invoice
    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId));

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Get PO by po_number (required field now)
    const [po] = await db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.po_number, invoice.po_number));

    if (!po) {
      // No PO found - cannot match
      return null;
    }

    // Get BOL by po_number
    const [bol] = await db
      .select()
      .from(billsOfLadingTable)
      .where(eq(billsOfLadingTable.po_number, invoice.po_number));

    return {
      po,
      bol: bol || null,
      invoice,
    };
  }

  /**
   * Use LLM to analyze if documents match and provide reasoning
   */
  static async analyzeMatchWithLLM(
    docs: MatchingDocuments
  ): Promise<LLMMatchingAnalysis> {
    const prompt = `You are analyzing a 3-way match between a Purchase Order (PO) and an Invoice for freight/logistics services.

**Purchase Order:**
- PO Number: ${docs.po.po_number}
- Customer: ${docs.po.customer_name}
- Carrier: ${docs.po.carrier_name}
- Origin: ${docs.po.origin}
- Destination: ${docs.po.destination}
- Pickup Date: ${docs.po.pickup_date}
- Delivery Date: ${docs.po.delivery_date}
- Total Amount: $${docs.po.total_amount}
- Expected Charges:
${docs.po.expected_charges
  .map((c) => `  - ${c.description}: $${c.amount}`)
  .join('\n')}

**Invoice:**
- Invoice Number: ${docs.invoice.invoice_number}
- Carrier: ${docs.invoice.carrier_name}
- Invoice Date: ${docs.invoice.invoice_date}
- PO Number Referenced: ${docs.invoice.po_number}
- Total Amount: $${docs.invoice.total_amount}
- Charges:
${docs.invoice.charges
  .map((c) => `  - ${c.description}: $${c.amount}`)
  .join('\n')}

${
  docs.bol
    ? `**Bill of Lading (BOL):**
- BOL Number: ${docs.bol.bol_number}
- Carrier: ${docs.bol.carrier_name}
- Origin: ${docs.bol.origin}
- Destination: ${docs.bol.destination}
- Pickup Date: ${docs.bol.pickup_date}
- Delivery Date: ${docs.bol.delivery_date}
${
  docs.bol.actual_charges
    ? `- Actual Charges:\n${docs.bol.actual_charges
        .map((c) => `  - ${c.description}: $${c.amount}`)
        .join('\n')}`
    : ''
}`
    : '**Bill of Lading:** Not available'
}

**Your Task:**
Analyze if the Invoice matches the Purchase Order. Consider:
1. Do the total amounts match (or are within reasonable variance)?
2. Do the line items/charges match between PO and Invoice?
3. Are the carriers consistent?
4. Does the general information align (if BOL is available)?

For freight logistics, small variances (fuel surcharges, accessorial fees) are common.

Return your analysis as a JSON object with:
- matched: boolean (true if this is a good match, false if significant discrepancies)
- confidence: number from 0-1 (how confident you are in your assessment)
- variance_amount: number (absolute dollar difference between PO and Invoice totals)
- variance_percentage: number (percentage difference)
- reasoning: string (2-3 sentences explaining your decision)
- discrepancies: array of objects with {field, po_value, invoice_value, issue} for each discrepancy found

Return ONLY valid JSON, no markdown formatting.`;

    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      prompt,
    });

    // Parse the JSON response
    const cleaned = text
      .trim()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '');

    return JSON.parse(cleaned);
  }

  /**
   * Check if this is a perfect match using LLM analysis
   */
  static async checkMatchWithLLM(
    docs: MatchingDocuments
  ): Promise<LLMMatchingAnalysis> {
    return await this.analyzeMatchWithLLM(docs);
  }

  /**
   * Save matching result to database
   */
  static async saveMatchingResult(
    docs: MatchingDocuments,
    llmAnalysis: LLMMatchingAnalysis
  ): Promise<MatchingResultEntity> {
    // Build charge comparison from LLM discrepancies
    const chargeComparison = llmAnalysis.discrepancies.map((disc) => {
      return {
        description: disc.field,
        po_amount: typeof disc.po_value === 'number' ? disc.po_value : null,
        bol_amount: null, // BOL charges optional for MVP
        invoice_amount:
          typeof disc.invoice_value === 'number' ? disc.invoice_value : null,
        status: 'variance' as const,
      };
    });

    // Also add matched charges from PO
    const poCharges = docs.po.expected_charges || [];
    const invoiceCharges = docs.invoice.charges || [];
    poCharges.forEach((poCharge) => {
      const invCharge = invoiceCharges.find(
        (ic) =>
          ic.description.toLowerCase() === poCharge.description.toLowerCase()
      );
      if (invCharge && invCharge.amount === poCharge.amount) {
        chargeComparison.push({
          description: poCharge.description,
          po_amount: poCharge.amount,
          bol_amount: null,
          invoice_amount: invCharge.amount,
          status: 'variance' as const,
        });
      }
    });

    const newResult: MatchingResultEntity = {
      id: generateId('match'),
      created_at: new Date().toISOString(),
      po_id: docs.po.id,
      bol_id: docs.bol?.id || null,
      invoice_id: docs.invoice.id,
      match_status: llmAnalysis.matched ? 'perfect_match' : 'major_variance',
      confidence_score: llmAnalysis.confidence,
      comparison: {
        po_total: docs.po.total_amount,
        bol_total: docs.bol?.actual_charges?.reduce(
          (sum, c) => sum + c.amount,
          0
        ),
        invoice_total: docs.invoice.total_amount,
        variance: llmAnalysis.variance_amount,
        variance_pct: llmAnalysis.variance_percentage,
        charge_comparison: chargeComparison,
      },
      flags_count: llmAnalysis.discrepancies.length,
      high_severity_flags: llmAnalysis.discrepancies.filter((d) =>
        d.issue.toLowerCase().includes('significant')
      ).length,
    };

    const [matchingResult] = await db
      .insert(matchingResultsTable)
      .values(newResult)
      .returning();

    return matchingResult;
  }

  /**
   * Update document statuses based on LLM matching results
   *
   * - If matched → all statuses → "matched"
   * - If not matched → statuses stay as is or → "disputed"
   */
  static async updateDocumentStatuses(
    docs: MatchingDocuments,
    llmAnalysis: LLMMatchingAnalysis
  ): Promise<void> {
    if (llmAnalysis.matched) {
      // Perfect match - update all to matched
      await db
        .update(purchaseOrdersTable)
        .set({
          status: 'matched',
          updated_at: new Date().toISOString(),
        })
        .where(eq(purchaseOrdersTable.id, docs.po.id));

      if (docs.bol) {
        await db
          .update(billsOfLadingTable)
          .set({
            status: 'matched',
            updated_at: new Date().toISOString(),
          })
          .where(eq(billsOfLadingTable.id, docs.bol.id));
      }

      await db
        .update(invoicesTable)
        .set({
          status: 'matched',
          updated_at: new Date().toISOString(),
        })
        .where(eq(invoicesTable.id, docs.invoice.id));
    }
  }

  /**
   * Main entry point: Run 3-way matching
   *
   * Uses LLM to analyze if documents match and provide reasoning
   */
  static async runThreeWayMatch(invoiceId: Id<'inv'>): Promise<{
    success: boolean;
    matched: boolean;
    result: MatchingResultEntity | null;
    llm_analysis?: LLMMatchingAnalysis;
    error?: string;
  }> {
    try {
      // Phase 1: Fetch documents linked by PO number
      const docs = await this.fetchRelatedDocuments(invoiceId);

      if (!docs) {
        return {
          success: false,
          matched: false,
          result: null,
          error: 'Could not find related PO for invoice',
        };
      }

      // Phase 2: Use LLM to analyze the match
      const llmAnalysis = await this.analyzeMatchWithLLM(docs);

      // Phase 3: Save matching result with LLM analysis
      const matchingResult = await this.saveMatchingResult(docs, llmAnalysis);

      // Phase 4: Update document statuses based on LLM decision
      await this.updateDocumentStatuses(docs, llmAnalysis);

      return {
        success: true,
        matched: llmAnalysis.matched,
        result: matchingResult,
        llm_analysis: llmAnalysis,
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

  /**
   * Get matching result by invoice ID
   */
  static async getMatchingResultByInvoice(
    invoiceId: Id<'inv'>
  ): Promise<MatchingResultEntity | null> {
    const [result] = await db
      .select()
      .from(matchingResultsTable)
      .where(eq(matchingResultsTable.invoice_id, invoiceId))
      .orderBy(matchingResultsTable.created_at)
      .limit(1);

    return result || null;
  }

  /**
   * Get all matching results
   */
  static async getAllMatchingResults(): Promise<MatchingResultEntity[]> {
    return db.select().from(matchingResultsTable);
  }
}

export const matchingRoutes = new Elysia({ prefix: '/matching' }).get(
  '/',
  async () => {
    const matchingResults = await MatchingService.getAllMatchingResults();
    return matchingResults;
  }
);
