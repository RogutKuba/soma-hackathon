import { Id } from '@/lib/id';
import { text, pgTable, timestamp, real } from 'drizzle-orm/pg-core';
import { purchaseOrdersTable } from './purchase-orders.db';
import { billsOfLadingTable } from './bills-of-lading.db';
import { invoicesTable } from './invoices.db';

export const matchingResultsTable = pgTable('matching_results', {
  id: text('id').$type<Id<'match'>>().primaryKey(),

  // The 3 documents
  po_id: text('po_id')
    .$type<Id<'po'>>()
    .references(() => purchaseOrdersTable.id)
    .notNull(),
  bol_id: text('bol_id')
    .$type<Id<'bol'>>()
    .references(() => billsOfLadingTable.id),
  invoice_id: text('invoice_id')
    .$type<Id<'inv'>>()
    .references(() => invoicesTable.id)
    .notNull(),

  // Match quality
  match_status: text('match_status')
    .$type<'perfect_match' | 'minor_variance' | 'major_variance' | 'no_match'>()
    .notNull(),
  confidence_score: real('confidence_score').notNull(), // 0-1

  // Comparison
  comparison: text('comparison', { mode: 'json' }).$type<{
    po_total: number;
    bol_total?: number;
    invoice_total: number;
    variance: number;
    variance_pct: number;

    charge_comparison: Array<{
      description: string;
      po_amount: number | null;
      bol_amount: number | null;
      invoice_amount: number | null;
      status: 'match' | 'variance' | 'missing' | 'extra';
    }>;
  }>(),

  // Flags found
  flags_count: real('flags_count').default(0),
  high_severity_flags: real('high_severity_flags').default(0),

  // Job tracking (Daytona)
  daytona_job_id: text('daytona_job_id'),
  daytona_logs_url: text('daytona_logs_url'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export type MatchingResult = typeof matchingResultsTable.$inferSelect;
export type NewMatchingResult = typeof matchingResultsTable.$inferInsert;
