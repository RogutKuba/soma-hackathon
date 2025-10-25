import { Id } from '@/lib/id';
import { text, pgTable, timestamp, integer } from 'drizzle-orm/pg-core';

export type FileType = 'invoice_pdf' | 'pod' | 'po_pdf' | 'bol_pdf' | 'other';

export const filesTable = pgTable('files', {
  id: text('id').$type<Id<'file'>>().primaryKey(),

  filename: text('filename').notNull(),
  mime_type: text('mime_type').notNull(),
  size_bytes: integer('size_bytes').notNull(),
  storage_path: text('storage_path').notNull(),

  file_type: text('file_type').$type<FileType>(),

  created_at: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export type File = typeof filesTable.$inferSelect;
export type NewFile = typeof filesTable.$inferInsert;
