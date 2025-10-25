import { Id } from '@/lib/id';
import { text, pgTable, timestamp, real } from 'drizzle-orm/pg-core';

export const purchaseOrdersTable = pgTable('purchase_orders', {
  id: text('id').$type<Id<'po'>>().primaryKey(),

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
  expected_charges: text('expected_charges', { mode: 'json' })
    .$type<Array<{
      description: string;
      amount: number;
    }>>()
    .notNull(),
  total_amount: real('total_amount').notNull(),

  // Status
  status: text('status')
    .$type<'pending' | 'bol_received' | 'invoiced' | 'matched' | 'disputed'>()
    .notNull()
    .default('pending'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrdersTable.$inferInsert;
