import { Elysia, t } from 'elysia';
import { generateId, type Id } from '@/lib/id';
import { db } from '@/db/client';
import {
  purchaseOrdersTable,
  type POEntity,
} from '@/db/schema/purchase-orders.db';
import { eq } from 'drizzle-orm';

// Elysia routes for purchase orders
export const purchaseOrderRoutes = new Elysia({ prefix: '/purchase-orders' })
  .post(
    '/',
    async ({ body }) => {
      const result = await POService.createPO({
        ...body,
        fileId: body.fileId as Id<'file'>,
      });

      return {
        success: true,
        purchase_order: result,
      };
    },
    {
      body: t.Object({
        po_number: t.String(),
        customer_name: t.String(),
        carrier_name: t.String(),
        origin: t.String(),
        destination: t.String(),
        pickup_date: t.String(),
        delivery_date: t.String(),
        expected_charges: t.Array(
          t.Object({
            description: t.String(),
            amount: t.Number(),
          })
        ),
        total_amount: t.Number(),
        fileId: t.String(),
      }),
    }
  )
  .get(
    '/:id',
    async ({ params: { id } }) => {
      const po = await POService.getPOById(id);
      return {
        success: true,
        purchase_order: po,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get(
    '/number/:po_number',
    async ({ params: { po_number } }) => {
      const po = await POService.getPOByNumber(po_number);
      return {
        success: true,
        purchase_order: po,
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
    async () => {
      const pos = await POService.getAllPOs();
      return {
        success: true,
        purchase_orders: pos,
        count: pos.length,
      };
    },
    {
      query: t.Object({}),
    }
  )
  .patch(
    '/:id/status',
    async ({ params: { id }, body }) => {
      const po = await POService.updatePOStatus(id, body.status);
      return {
        success: true,
        purchase_order: po,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        status: t.Union([
          t.Literal('pending'),
          t.Literal('bol_received'),
          t.Literal('invoiced'),
          t.Literal('matched'),
          t.Literal('disputed'),
        ]),
      }),
    }
  );

export abstract class POService {
  /**
   * Creates a purchase order with optional file upload
   */
  static async createPO(data: {
    po_number: string;
    customer_name: string;
    carrier_name: string;
    origin: string;
    destination: string;
    pickup_date: string;
    delivery_date: string;
    expected_charges: Array<{ description: string; amount: number }>;
    total_amount: number;
    fileId: Id<'file'>;
  }) {
    const poId = generateId('po');

    // Create PO record
    const newPO: POEntity = {
      id: poId,
      file_id: data.fileId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      po_number: data.po_number,
      customer_name: data.customer_name,
      carrier_name: data.carrier_name,
      origin: data.origin,
      destination: data.destination,
      pickup_date: data.pickup_date,
      delivery_date: data.delivery_date,
      expected_charges: data.expected_charges,
      total_amount: data.total_amount,
      status: 'pending',
    };

    const [createdPO] = await db
      .insert(purchaseOrdersTable)
      .values(newPO)
      .returning();

    return createdPO;
  }

  /**
   * Gets a purchase order by ID
   */
  static async getPOById(id: string) {
    const [po] = await db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, id as Id<'po'>))
      .limit(1);

    if (!po) {
      throw new Error(`Purchase order with ID ${id} not found`);
    }

    return po;
  }

  /**
   * Gets a purchase order by PO number
   */
  static async getPOByNumber(poNumber: string) {
    const [po] = await db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.po_number, poNumber))
      .limit(1);

    if (!po) {
      throw new Error(`Purchase order with number ${poNumber} not found`);
    }

    return po;
  }

  /**
   * Gets all purchase orders with optional filtering
   */
  static async getAllPOs() {
    return await db.select().from(purchaseOrdersTable);
  }

  /**
   * Updates purchase order status
   */
  static async updatePOStatus(
    id: string,
    status: 'pending' | 'bol_received' | 'invoiced' | 'matched' | 'disputed'
  ) {
    const [updatedPO] = await db
      .update(purchaseOrdersTable)
      .set({
        status,
        updated_at: new Date().toISOString(),
      })
      .where(eq(purchaseOrdersTable.id, id as Id<'po'>))
      .returning();

    if (!updatedPO) {
      throw new Error(`Purchase order with ID ${id} not found`);
    }

    return updatedPO;
  }
}
