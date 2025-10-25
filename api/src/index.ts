import { Elysia } from 'elysia';
import { purchaseOrderRoutes } from '@/service/po/po.service';
import { uploadService } from '@/service/upload/upload.service';
import { ocrRoutes } from '@/service/ocr/ocr.service';
import { bolRoutes } from '@/service/bol/bol.service';
import cors from '@elysiajs/cors';
import { logger } from '@bogeychan/elysia-logger';

const PORT = 8000;

const app = new Elysia()
  .use(
    logger({
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    })
  )
  .use(cors())
  .get('/', () => ({
    message: 'Welcome to the API',
    docs: '/swagger',
    endpoints: {
      ai: '/ai',
      upload: '/upload',
      purchaseOrders: '/purchase-orders',
      bol: '/bol',
      ocr: '/ocr',
    },
  }))
  // Mount upload routes
  .use(uploadService)
  // Mount purchase order routes
  .use(purchaseOrderRoutes)
  // Mount BOL routes
  .use(bolRoutes)
  // Mount OCR routes
  .use(ocrRoutes)
  .listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
