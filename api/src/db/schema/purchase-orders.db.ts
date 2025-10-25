import { filesTable } from '@/db/schema/files.db';
import { type Id } from '@/lib/id';
import { text, pgTable, timestamp, real, jsonb } from 'drizzle-orm/pg-core';

export const purchaseOrdersTable = pgTable('purchase_orders', {
  id: text('id').$type<Id<'po'>>().primaryKey(),

  file_id: text('file_id')
    .$type<Id<'file'>>()
    .references(() => filesTable.id),

  // PO details
  po_number: text('po_number').unique().notNull(),
  customer_name: text('customer_name').notNull(),
  carrier_name: text('carrier_name').notNull(),

  // Route
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  pickup_date: timestamp('pickup_date', { mode: 'string' }).notNull(),
  delivery_date: timestamp('delivery_date', { mode: 'string' }).notNull(),

  // Expected charges (from PO)
  expected_charges: jsonb('expected_charges')
    .$type<
      Array<{
        description: string;
        amount: number;
      }>
    >()
    .notNull(),
  total_amount: real('total_amount').notNull(),

  // Status
  status: text('status')
    .$type<'pending' | 'bol_received' | 'invoiced' | 'matched' | 'disputed'>()
    .notNull()
    .default('pending'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type POEntity = typeof purchaseOrdersTable.$inferSelect;
