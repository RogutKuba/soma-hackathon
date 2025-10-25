import { Elysia } from 'elysia';
import { aiRoutes } from '@/service/ai/Ai.service';
import { uploadService } from '@/service/upload/upload.service';

const PORT = 8000;

const app = new Elysia()
  .get('/', () => ({
    message: 'Welcome to the API',
    docs: '/swagger',
    endpoints: {
      ai: '/ai',
      upload: '/upload',
    },
  }))
  // Mount AI routes
  .use(aiRoutes)
  // Mount upload routes
  .use(uploadService)
  .listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
