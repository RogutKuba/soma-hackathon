import { Id } from '@/lib/id';
import { text, pgTable, timestamp, jsonb } from 'drizzle-orm/pg-core';

export type FlagCode =
  // Amount mismatches
  | 'AMOUNT_MISMATCH_PO_BOL' // PO vs BOL amounts differ
  | 'AMOUNT_MISMATCH_PO_INVOICE' // PO vs Invoice amounts differ
  | 'AMOUNT_MISMATCH_BOL_INVOICE' // BOL vs Invoice amounts differ
  // Charge mismatches
  | 'UNEXPECTED_CHARGE' // Charge on invoice not in PO/BOL
  | 'MISSING_CHARGE' // Charge in PO not on invoice
  | 'CHARGE_VARIANCE' // Same charge, different amount
  // Document mismatches
  | 'CARRIER_MISMATCH' // Different carriers listed
  | 'ROUTE_MISMATCH' // Origin/destination differs
  | 'DATE_MISMATCH' // Dates don't align
  // Missing documents
  | 'NO_PO_FOUND' // Can't find matching PO
  | 'NO_BOL_FOUND' // Can't find matching BOL
  | 'MISSING_POD' // No proof of delivery
  // Duplicates
  | 'DUPLICATE_INVOICE'; // Invoice already processed

export type FlagSeverity = 'low' | 'med' | 'high';

export type FlagEntityType = 'purchase_order' | 'bill_of_lading' | 'invoice';

export const flagsTable = pgTable('flags', {
  id: text('id').$type<Id<'flag'>>().primaryKey(),

  // What entity is flagged (polymorphic)
  entity_type: text('entity_type').$type<FlagEntityType>().notNull(),
  entity_id: text('entity_id').notNull(),

  // Flag details
  code: text('code').$type<FlagCode>().notNull(),
  severity: text('severity').$type<FlagSeverity>().notNull(),
  explanation: text('explanation').notNull(),

  // Context (for display)
  context: jsonb('context').$type<{
    po_amount?: number;
    bol_amount?: number;
    invoice_amount?: number;
    variance?: number;
    variance_pct?: number;
    charge?: string;
    expected?: string;
    actual?: string;
    [key: string]: unknown;
  }>(),

  // Resolution
  resolved_at: timestamp('resolved_at', { mode: 'string' }),
  resolution_action: text('resolution_action').$type<
    'approved' | 'disputed' | 'rejected'
  >(),
  resolution_notes: text('resolution_notes'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type Flag = typeof flagsTable.$inferSelect;
export type NewFlag = typeof flagsTable.$inferInsert;
