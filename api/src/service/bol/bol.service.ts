import { Elysia, t } from 'elysia';
import { generateId, type Id } from '@/lib/id';
import { db } from '@/db/client';
import {
  billsOfLadingTable,
  type BillOfLadingEntity,
} from '@/db/schema/bol.db';
import { filesTable } from '@/db/schema/files.db';
import { eq } from 'drizzle-orm';

export class BOLService {
  /**
   * Creates a bill of lading
   */
  static async createBOL(data: {
    bol_number: string;
    po_number: string;
    po_id?: string;
    carrier_name: string;
    origin: string;
    destination: string;
    pickup_date: string;
    delivery_date: string;
    weight_lbs?: number;
    item_description?: string;
    actual_charges?: Array<{ description: string; amount: number }>;
    file_id: string;
    pod_file_id?: string;
    pod_signed_at?: string;
  }) {
    // Create BOL record
    const newBOL: BillOfLadingEntity = {
      id: generateId('bol'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      bol_number: data.bol_number,
      po_number: data.po_number,
      po_id: data.po_id ? (data.po_id as Id<'po'>) : null,
      carrier_name: data.carrier_name,
      origin: data.origin,
      destination: data.destination,
      pickup_date: data.pickup_date,
      delivery_date: data.delivery_date,
      weight_lbs: data.weight_lbs || null,
      item_description: data.item_description || null,
      actual_charges: data.actual_charges || null,
      file_id: data.file_id as Id<'file'>,
      pod_file_id: data.pod_file_id ? (data.pod_file_id as Id<'file'>) : null,
      pod_signed_at: data.pod_signed_at || null,
      status: 'pending',
    };

    const [createdBOL] = await db
      .insert(billsOfLadingTable)
      .values(newBOL)
      .returning();

    return createdBOL;
  }

  /**
   * Gets a BOL by ID
   */
  static async getBOLById(id: string) {
    const [bol] = await db
      .select()
      .from(billsOfLadingTable)
      .where(eq(billsOfLadingTable.id, id as Id<'bol'>))
      .limit(1);

    if (!bol) {
      throw new Error(`Bill of lading with ID ${id} not found`);
    }

    return bol;
  }

  /**
   * Gets a BOL by BOL number
   */
  static async getBOLByNumber(bolNumber: string) {
    const [bol] = await db
      .select()
      .from(billsOfLadingTable)
      .where(eq(billsOfLadingTable.bol_number, bolNumber))
      .limit(1);

    if (!bol) {
      throw new Error(`Bill of lading with number ${bolNumber} not found`);
    }

    return bol;
  }

  /**
   * Gets all BOLs for a specific PO
   */
  static async getBOLsByPOId(poId: string) {
    return await db
      .select()
      .from(billsOfLadingTable)
      .where(eq(billsOfLadingTable.po_id, poId as Id<'po'>));
  }

  /**
   * Gets all BOLs for a specific PO number
   */
  static async getBOLsByPONumber(poNumber: string) {
    return await db
      .select()
      .from(billsOfLadingTable)
      .where(eq(billsOfLadingTable.po_number, poNumber));
  }

  /**
   * Gets all BOLs with file information and optional filtering
   */
  static async getAllBOLs(filters?: {
    status?: 'pending' | 'delivered' | 'invoiced' | 'matched';
    carrier_name?: string;
  }) {
    let query = db
      .select({
        id: billsOfLadingTable.id,
        bol_number: billsOfLadingTable.bol_number,
        po_number: billsOfLadingTable.po_number,
        po_id: billsOfLadingTable.po_id,
        carrier_name: billsOfLadingTable.carrier_name,
        origin: billsOfLadingTable.origin,
        destination: billsOfLadingTable.destination,
        pickup_date: billsOfLadingTable.pickup_date,
        delivery_date: billsOfLadingTable.delivery_date,
        weight_lbs: billsOfLadingTable.weight_lbs,
        item_description: billsOfLadingTable.item_description,
        actual_charges: billsOfLadingTable.actual_charges,
        file_id: billsOfLadingTable.file_id,
        pod_file_id: billsOfLadingTable.pod_file_id,
        pod_signed_at: billsOfLadingTable.pod_signed_at,
        status: billsOfLadingTable.status,
        created_at: billsOfLadingTable.created_at,
        updated_at: billsOfLadingTable.updated_at,
        file: {
          id: filesTable.id,
          filename: filesTable.filename,
          url: filesTable.url,
          mime_type: filesTable.mime_type,
          size_bytes: filesTable.size_bytes,
        },
      })
      .from(billsOfLadingTable)
      .leftJoin(filesTable, eq(billsOfLadingTable.file_id, filesTable.id));

    if (filters?.status) {
      query = query.where(eq(billsOfLadingTable.status, filters.status)) as any;
    }
    if (filters?.carrier_name) {
      query = query.where(
        eq(billsOfLadingTable.carrier_name, filters.carrier_name)
      ) as any;
    }

    return await query;
  }

  /**
   * Updates BOL status
   */
  static async updateBOLStatus(
    id: string,
    status: 'pending' | 'delivered' | 'invoiced' | 'matched'
  ) {
    const [updatedBOL] = await db
      .update(billsOfLadingTable)
      .set({
        status,
        updated_at: new Date().toISOString(),
      })
      .where(eq(billsOfLadingTable.id, id as Id<'bol'>))
      .returning();

    if (!updatedBOL) {
      throw new Error(`Bill of lading with ID ${id} not found`);
    }

    return updatedBOL;
  }

  /**
   * Attaches POD (Proof of Delivery) to a BOL
   */
  static async attachPOD(id: string, podFileId: string, signedAt?: string) {
    const [updatedBOL] = await db
      .update(billsOfLadingTable)
      .set({
        pod_file_id: podFileId as Id<'file'>,
        pod_signed_at: signedAt || new Date().toISOString(),
        status: 'delivered',
        updated_at: new Date().toISOString(),
      })
      .where(eq(billsOfLadingTable.id, id as Id<'bol'>))
      .returning();

    if (!updatedBOL) {
      throw new Error(`Bill of lading with ID ${id} not found`);
    }

    return updatedBOL;
  }

  /**
   * Links a BOL to a PO by PO ID
   */
  static async linkToPO(bolId: string, poId: string) {
    const [updatedBOL] = await db
      .update(billsOfLadingTable)
      .set({
        po_id: poId as Id<'po'>,
        updated_at: new Date().toISOString(),
      })
      .where(eq(billsOfLadingTable.id, bolId as Id<'bol'>))
      .returning();

    if (!updatedBOL) {
      throw new Error(`Bill of lading with ID ${bolId} not found`);
    }

    return updatedBOL;
  }
}

// Elysia routes for bills of lading
export const bolRoutes = new Elysia({ prefix: '/bol' })
  .post(
    '/',
    async ({ body }) => {
      const result = await BOLService.createBOL(body);
      return {
        success: true,
        bill_of_lading: result,
      };
    },
    {
      body: t.Object({
        bol_number: t.String(),
        po_number: t.String(),
        po_id: t.Optional(t.String()),
        carrier_name: t.String(),
        origin: t.String(),
        destination: t.String(),
        pickup_date: t.String(),
        delivery_date: t.String(),
        weight_lbs: t.Optional(t.Number()),
        item_description: t.Optional(t.String()),
        actual_charges: t.Optional(
          t.Array(
            t.Object({
              description: t.String(),
              amount: t.Number(),
            })
          )
        ),
        file_id: t.String(),
        pod_file_id: t.Optional(t.String()),
        pod_signed_at: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/:id',
    async ({ params: { id } }) => {
      const bol = await BOLService.getBOLById(id);
      return {
        success: true,
        bill_of_lading: bol,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get(
    '/number/:bol_number',
    async ({ params: { bol_number } }) => {
      const bol = await BOLService.getBOLByNumber(bol_number);
      return {
        success: true,
        bill_of_lading: bol,
      };
    },
    {
      params: t.Object({
        bol_number: t.String(),
      }),
    }
  )
  .get(
    '/po/:po_id',
    async ({ params: { po_id } }) => {
      const bols = await BOLService.getBOLsByPOId(po_id);
      return {
        success: true,
        bills_of_lading: bols,
        count: bols.length,
      };
    },
    {
      params: t.Object({
        po_id: t.String(),
      }),
    }
  )
  .get(
    '/po/number/:po_number',
    async ({ params: { po_number } }) => {
      const bols = await BOLService.getBOLsByPONumber(po_number);
      return {
        success: true,
        bills_of_lading: bols,
        count: bols.length,
      };
    },
    {
      params: t.Object({
        po_number: t.String(),
      }),
    }
  )
  .get(
    '/',
    async ({ query }) => {
      const bols = await BOLService.getAllBOLs(query);
      return {
        success: true,
        bills_of_lading: bols,
        count: bols.length,
      };
    },
    {
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal('pending'),
            t.Literal('delivered'),
            t.Literal('invoiced'),
            t.Literal('matched'),
          ])
        ),
        carrier_name: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/:id/status',
    async ({ params: { id }, body }) => {
      const bol = await BOLService.updateBOLStatus(id, body.status);
      return {
        success: true,
        bill_of_lading: bol,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        status: t.Union([
          t.Literal('pending'),
          t.Literal('delivered'),
          t.Literal('invoiced'),
          t.Literal('matched'),
        ]),
      }),
    }
  )
  .patch(
    '/:id/pod',
    async ({ params: { id }, body }) => {
      const bol = await BOLService.attachPOD(
        id,
        body.pod_file_id,
        body.signed_at
      );
      return {
        success: true,
        bill_of_lading: bol,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        pod_file_id: t.String(),
        signed_at: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    '/:id/link-po',
    async ({ params: { id }, body }) => {
      const bol = await BOLService.linkToPO(id, body.po_id);
      return {
        success: true,
        bill_of_lading: bol,
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
  );
