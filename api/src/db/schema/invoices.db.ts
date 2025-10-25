import { Id } from '@/lib/id';
import { text, pgTable, timestamp, real, jsonb } from 'drizzle-orm/pg-core';
import { purchaseOrdersTable } from './purchase-orders.db';
import { billsOfLadingTable } from './bol.db';
import { filesTable } from './files.db';

export const invoicesTable = pgTable('invoices', {
  id: text('id').$type<Id<'inv'>>().primaryKey(),

  // Invoice details
  invoice_number: text('invoice_number').unique().notNull(),
  carrier_name: text('carrier_name').notNull(),
  invoice_date: timestamp('invoice_date', { mode: 'string' }).notNull(),

  // References to PO and BOL (as stated on invoice)
  po_number: text('po_number').notNull(), // Required for 3-way matching
  bol_number: text('bol_number'),
  po_id: text('po_id')
    .$type<Id<'po'>>()
    .references(() => purchaseOrdersTable.id),
  bol_id: text('bol_id')
    .$type<Id<'bol'>>()
    .references(() => billsOfLadingTable.id),

  // Invoice charges
  charges: jsonb('charges')
    .$type<
      Array<{
        description: string;
        amount: number;
      }>
    >()
    .notNull(),
  total_amount: real('total_amount').notNull(),

  // Payment terms
  payment_terms: text('payment_terms'), // e.g., "NET 30"
  due_date: timestamp('due_date', { mode: 'string' }),

  // Uploaded file
  invoice_file_id: text('invoice_file_id')
    .$type<Id<'file'>>()
    .references(() => filesTable.id),

  // Matching
  match_type: text('match_type').$type<'exact' | 'fuzzy' | 'manual' | null>(),
  match_confidence: real('match_confidence').default(0),

  // Status
  status: text('status')
    .$type<
      'pending' | 'matched' | 'flagged' | 'approved' | 'disputed' | 'rejected'
    >()
    .notNull()
    .default('pending'),

  // Approval
  approved_at: timestamp('approved_at', { mode: 'string' }),
  approved_by: text('approved_by'),
  approval_notes: text('approval_notes'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type InvoiceEntity = typeof invoicesTable.$inferSelect;
