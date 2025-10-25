import { Elysia, t } from 'elysia';
import { generateId, Id } from '@/lib/id';
import { db } from '@/db/client';
import { invoicesTable, type InvoiceEntity } from '@/db/schema/invoices.db';
import { filesTable } from '@/db/schema/files.db';
import { eq } from 'drizzle-orm';

export class InvoiceService {
  /**
   * Creates an invoice
   */
  static async createInvoice(data: {
    invoice_number: string;
    carrier_name: string;
    invoice_date: string;
    po_number: string; // Required for 3-way matching
    bol_number?: string;
    po_id?: string;
    bol_id?: string;
    charges: Array<{ description: string; amount: number }>;
    total_amount: number;
    payment_terms?: string;
    due_date?: string;
    invoice_file_id?: string;
  }) {
    // Create invoice record
    const newInvoice: InvoiceEntity = {
      id: generateId('inv'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      invoice_number: data.invoice_number,
      carrier_name: data.carrier_name,
      invoice_date: data.invoice_date,
      po_number: data.po_number, // Required field
      bol_number: data.bol_number || null,
      po_id: data.po_id ? (data.po_id as Id<'po'>) : null,
      bol_id: data.bol_id ? (data.bol_id as Id<'bol'>) : null,
      charges: data.charges,
      total_amount: data.total_amount,
      payment_terms: data.payment_terms || null,
      due_date: data.due_date || null,
      invoice_file_id: data.invoice_file_id
        ? (data.invoice_file_id as Id<'file'>)
        : null,
      match_type: null,
      match_confidence: 0,
      status: 'pending',
      approved_at: null,
      approved_by: null,
      approval_notes: null,
    };

    const [createdInvoice] = await db
      .insert(invoicesTable)
      .values(newInvoice)
      .returning();

    return createdInvoice;
  }

  /**
   * Gets an invoice by ID
   */
  static async getInvoiceById(id: string) {
    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id as Id<'inv'>))
      .limit(1);

    if (!invoice) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  /**
   * Gets an invoice by invoice number
   */
  static async getInvoiceByNumber(invoiceNumber: string) {
    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.invoice_number, invoiceNumber))
      .limit(1);

    if (!invoice) {
      throw new Error(`Invoice with number ${invoiceNumber} not found`);
    }

    return invoice;
  }

  /**
   * Gets all invoices with file information and optional filtering
   */
  static async getAllInvoices(filters?: {
    status?:
      | 'pending'
      | 'matched'
      | 'flagged'
      | 'approved'
      | 'disputed'
      | 'rejected';
    carrier_name?: string;
  }) {
    let query = db
      .select({
        id: invoicesTable.id,
        invoice_number: invoicesTable.invoice_number,
        carrier_name: invoicesTable.carrier_name,
        invoice_date: invoicesTable.invoice_date,
        po_number: invoicesTable.po_number,
        bol_number: invoicesTable.bol_number,
        po_id: invoicesTable.po_id,
        bol_id: invoicesTable.bol_id,
        charges: invoicesTable.charges,
        total_amount: invoicesTable.total_amount,
        payment_terms: invoicesTable.payment_terms,
        due_date: invoicesTable.due_date,
        invoice_file_id: invoicesTable.invoice_file_id,
        match_type: invoicesTable.match_type,
        match_confidence: invoicesTable.match_confidence,
        status: invoicesTable.status,
        approved_at: invoicesTable.approved_at,
        approved_by: invoicesTable.approved_by,
        approval_notes: invoicesTable.approval_notes,
        created_at: invoicesTable.created_at,
        updated_at: invoicesTable.updated_at,
        file: {
          id: filesTable.id,
          filename: filesTable.filename,
          url: filesTable.url,
          mime_type: filesTable.mime_type,
          size_bytes: filesTable.size_bytes,
        },
      })
      .from(invoicesTable)
      .leftJoin(filesTable, eq(invoicesTable.invoice_file_id, filesTable.id));

    if (filters?.status) {
      query = query.where(eq(invoicesTable.status, filters.status)) as any;
    }
    if (filters?.carrier_name) {
      query = query.where(
        eq(invoicesTable.carrier_name, filters.carrier_name)
      ) as any;
    }

    return await query;
  }

  /**
   * Gets all invoices for a specific PO
   */
  static async getInvoicesByPOId(poId: string) {
    return await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.po_id, poId as Id<'po'>));
  }

  /**
   * Gets all invoices for a specific BOL
   */
  static async getInvoicesByBOLId(bolId: string) {
    return await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.bol_id, bolId as Id<'bol'>));
  }

  /**
   * Updates invoice status
   */
  static async updateInvoiceStatus(
    id: string,
    status:
      | 'pending'
      | 'matched'
      | 'flagged'
      | 'approved'
      | 'disputed'
      | 'rejected'
  ) {
    const [updatedInvoice] = await db
      .update(invoicesTable)
      .set({
        status,
        updated_at: new Date().toISOString(),
      })
      .where(eq(invoicesTable.id, id as Id<'inv'>))
      .returning();

    if (!updatedInvoice) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    return updatedInvoice;
  }

  /**
   * Approves an invoice
   */
  static async approveInvoice(id: string, approvedBy: string, notes?: string) {
    const [updatedInvoice] = await db
      .update(invoicesTable)
      .set({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
        approval_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .where(eq(invoicesTable.id, id as Id<'inv'>))
      .returning();

    if (!updatedInvoice) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    return updatedInvoice;
  }

  /**
   * Links an invoice to a PO by PO ID
   */
  static async linkToPO(invoiceId: string, poId: string) {
    const [updatedInvoice] = await db
      .update(invoicesTable)
      .set({
        po_id: poId as Id<'po'>,
        updated_at: new Date().toISOString(),
      })
      .where(eq(invoicesTable.id, invoiceId as Id<'inv'>))
      .returning();

    if (!updatedInvoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }

    return updatedInvoice;
  }

  /**
   * Links an invoice to a BOL by BOL ID
   */
  static async linkToBOL(invoiceId: string, bolId: string) {
    const [updatedInvoice] = await db
      .update(invoicesTable)
      .set({
        bol_id: bolId as Id<'bol'>,
        updated_at: new Date().toISOString(),
      })
      .where(eq(invoicesTable.id, invoiceId as Id<'inv'>))
      .returning();

    if (!updatedInvoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }

    return updatedInvoice;
  }

  /**
   * Updates match information for an invoice
   */
  static async updateMatchInfo(
    id: string,
    matchType: 'exact' | 'fuzzy' | 'manual',
    confidence: number
  ) {
    const [updatedInvoice] = await db
      .update(invoicesTable)
      .set({
        match_type: matchType,
        match_confidence: confidence,
        updated_at: new Date().toISOString(),
      })
      .where(eq(invoicesTable.id, id as Id<'inv'>))
      .returning();

    if (!updatedInvoice) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    return updatedInvoice;
  }
}

// Elysia routes for invoices
export const invoiceRoutes = new Elysia({ prefix: '/invoices' })
  .post(
    '/',
    async ({ body }) => {
      const result = await InvoiceService.createInvoice(body);
      return {
        success: true,
        invoice: result,
      };
    },
    {
      body: t.Object({
        invoice_number: t.String(),
        carrier_name: t.String(),
        invoice_date: t.String(),
        po_number: t.String(), // Required for 3-way matching
        bol_number: t.Optional(t.String()),
        po_id: t.Optional(t.String()),
        bol_id: t.Optional(t.String()),
        charges: t.Array(
          t.Object({
            description: t.String(),
            amount: t.Number(),
          })
        ),
        total_amount: t.Number(),
        payment_terms: t.Optional(t.String()),
        due_date: t.Optional(t.String()),
        invoice_file_id: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/:id',
    async ({ params: { id } }) => {
      const invoice = await InvoiceService.getInvoiceById(id);
      return {
        success: true,
        invoice,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get(
    '/number/:invoice_number',
    async ({ params: { invoice_number } }) => {
      const invoice = await InvoiceService.getInvoiceByNumber(invoice_number);
      return {
        success: true,
        invoice,
      };
    },
    {
      params: t.Object({
        invoice_number: t.String(),
      }),
    }
  )
  .get(
    '/po/:po_id',
    async ({ params: { po_id } }) => {
      const invoices = await InvoiceService.getInvoicesByPOId(po_id);
      return {
        success: true,
        invoices,
        count: invoices.length,
      };
    },
    {
      params: t.Object({
        po_id: t.String(),
      }),
    }
  )
  .get(
    '/bol/:bol_id',
    async ({ params: { bol_id } }) => {
      const invoices = await InvoiceService.getInvoicesByBOLId(bol_id);
      return {
        success: true,
        invoices,
        count: invoices.length,
      };
    },
    {
      params: t.Object({
        bol_id: t.String(),
      }),
    }
  )
  .get(
    '/',
    async ({ query }) => {
      const invoices = await InvoiceService.getAllInvoices(query);
      return {
        success: true,
        invoices,
        count: invoices.length,
      };
    },
    {
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal('pending'),
            t.Literal('matched'),
            t.Literal('flagged'),
            t.Literal('approved'),
            t.Literal('disputed'),
            t.Literal('rejected'),
          ])
        ),
        carrier_name: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/:id/status',
    async ({ params: { id }, body }) => {
      const invoice = await InvoiceService.updateInvoiceStatus(id, body.status);
      return {
        success: true,
        invoice,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        status: t.Union([
          t.Literal('pending'),
          t.Literal('matched'),
          t.Literal('flagged'),
          t.Literal('approved'),
          t.Literal('disputed'),
          t.Literal('rejected'),
        ]),
      }),
    }
  )
  .patch(
    '/:id/approve',
    async ({ params: { id }, body }) => {
      const invoice = await InvoiceService.approveInvoice(
        id,
        body.approved_by,
        body.notes
      );
      return {
        success: true,
        invoice,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        approved_by: t.String(),
        notes: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/:id/link-po',
    async ({ params: { id }, body }) => {
      const invoice = await InvoiceService.linkToPO(id, body.po_id);
      return {
        success: true,
        invoice,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        po_id: t.String(),
      }),
    }
  )
  .patch(
    '/:id/link-bol',
    async ({ params: { id }, body }) => {
      const invoice = await InvoiceService.linkToBOL(id, body.bol_id);
      return {
        success: true,
        invoice,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        bol_id: t.String(),
      }),
    }
  )
  .patch(
    '/:id/match',
    async ({ params: { id }, body }) => {
      const invoice = await InvoiceService.updateMatchInfo(
        id,
        body.match_type,
        body.confidence
      );
      return {
        success: true,
        invoice,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        match_type: t.Union([
          t.Literal('exact'),
          t.Literal('fuzzy'),
          t.Literal('manual'),
        ]),
        confidence: t.Number(),
      }),
    }
  );
