import { Elysia, t } from 'elysia';

export const ocrService = new Elysia().post(
  '/ocr',
  async ({ body }) => {
    const { image } = body;
    const result = await ocr(image);
    return result;
  },
  {
    body: t.Object({
      image: t.String(),
    }),
  }
);

export abstract class OcrService {
  static async ocr(image: string) {
    return await ocr(image);
  }
}
