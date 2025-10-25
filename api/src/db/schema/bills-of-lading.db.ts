import { Id } from '@/lib/id';
import { text, pgTable, timestamp, real } from 'drizzle-orm/pg-core';
import { purchaseOrdersTable } from './purchase-orders.db';
import { filesTable } from './files.db';

export const billsOfLadingTable = pgTable('bills_of_lading', {
  id: text('id').$type<Id<'bol'>>().primaryKey(),

  // BOL details
  bol_number: text('bol_number').unique().notNull(),

  // Link to PO
  po_number: text('po_number').notNull(),
  po_id: text('po_id')
    .$type<Id<'po'>>()
    .references(() => purchaseOrdersTable.id),

  // Shipment details
  carrier_name: text('carrier_name').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  pickup_date: timestamp('pickup_date', { mode: 'string' }).notNull(),
  delivery_date: timestamp('delivery_date', { mode: 'string' }).notNull(),

  // Weight and items
  weight_lbs: real('weight_lbs'),
  item_description: text('item_description'),

  // Actual charges (from BOL, if listed)
  actual_charges: text('actual_charges', { mode: 'json' }).$type<
    Array<{
      description: string;
      amount: number;
    }>
  >(),

  // POD
  pod_file_id: text('pod_file_id')
    .$type<Id<'file'>>()
    .references(() => filesTable.id),
  pod_signed_at: timestamp('pod_signed_at', { mode: 'string' }),

  // Status
  status: text('status')
    .$type<'pending' | 'delivered' | 'invoiced' | 'matched'>()
    .notNull()
    .default('pending'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export type BillOfLading = typeof billsOfLadingTable.$inferSelect;
export type NewBillOfLading = typeof billsOfLadingTable.$inferInsert;
