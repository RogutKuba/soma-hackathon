import { Elysia } from 'elysia';
import { purchaseOrderRoutes } from '@/service/po/po.service';
import { uploadService } from '@/service/upload/upload.service';
import { ocrRoutes } from '@/service/ocr/ocr.service';
import { bolRoutes } from '@/service/bol/bol.service';
import { invoiceRoutes } from '@/service/invoice/invoice.service';
import cors from '@elysiajs/cors';
import { logger } from '@bogeychan/elysia-logger';
import { matchingRoutes } from '@/service/matching/matching.service';
import { inngestHandler } from '@/lib/inngest';

const PORT = 8000;

const app = new Elysia()
  .use(cors())
  .use(
    logger({
      transport: {
        target: 'pino-pretty',
        level: 'info',
        options: {
          colorize: true,
        },
      },
    })
  )
  .get('/', () => ({
    message: 'Welcome to the API',
    docs: '/swagger',
    endpoints: {
      ai: '/ai',
      upload: '/upload',
      purchaseOrders: '/purchase-orders',
      bol: '/bol',
      invoices: '/invoices',
      ocr: '/ocr',
    },
  }))
  // Mount upload routes
  .use(uploadService)
  // Mount purchase order routes
  .use(purchaseOrderRoutes)
  // Mount BOL routes
  .use(bolRoutes)
  // Mount invoice routes
  .use(invoiceRoutes)
  // Mount OCR routes
  .use(ocrRoutes)
  // Mount matching routes
  .use(matchingRoutes)
  .use(inngestHandler)
  .listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
