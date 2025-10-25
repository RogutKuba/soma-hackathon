import { inngestClient } from '@/lib/inngest-client';
import { type Id } from '@/lib/id';
import { MatchingService } from './matching.service';

export interface MatchingRunJobData {
  invoice_id: Id<'inv'>;
}

const MATCHING_RUN_JOB_ID = 'matching/run';

export const runMatchingJob = inngestClient.createFunction(
  { id: 'run-matching', name: 'Run 3-Way Matching' },
  { event: MATCHING_RUN_JOB_ID },
  async ({ event, step }) => {
    const { invoice_id } = event.data as MatchingRunJobData;

    // Step 1: Fetch related documents
    const docs = await step.run('fetch-related-documents', async () => {
      console.log(`Fetching related documents for invoice ${invoice_id}`);
      return await MatchingService.fetchRelatedDocuments(invoice_id);
    });

    if (!docs) {
      console.error(`No related PO found for invoice ${invoice_id}`);
      return {
        success: false,
        matched: false,
        result: null,
        error: 'Could not find related PO for invoice',
      };
    }

    console.log(`Found related documents: PO ${docs.po.po_number}, BOL: ${docs.bol?.bol_number || 'N/A'}`);

    // Step 2: Analyze match with LLM
    const llmAnalysis = await step.run('analyze-match-with-llm', async () => {
      console.log(`Analyzing match with LLM for invoice ${invoice_id}`);
      return await MatchingService.analyzeMatchWithLLM(docs);
    });

    console.log(`LLM Analysis: matched=${llmAnalysis.matched}, confidence=${llmAnalysis.confidence}`);

    // Step 3: Save matching result
    const matchingResult = await step.run('save-matching-result', async () => {
      console.log(`Saving matching result for invoice ${invoice_id}`);
      return await MatchingService.saveMatchingResult(docs, llmAnalysis);
    });

    console.log(`Matching result saved with ID ${matchingResult.id}`);

    // Step 4: Update document statuses
    await step.run('update-document-statuses', async () => {
      console.log(`Updating document statuses for invoice ${invoice_id}`);
      await MatchingService.updateDocumentStatuses(docs, llmAnalysis);
    });

    console.log(`Document statuses updated. Match completed for invoice ${invoice_id}`);

    return {
      success: true,
      matched: llmAnalysis.matched,
      result: matchingResult,
      llm_analysis: llmAnalysis,
    };
  }
);

export const createMatchingJob = async (data: MatchingRunJobData) => {
  await inngestClient.send({
    name: MATCHING_RUN_JOB_ID,
    data: data,
  });
};
