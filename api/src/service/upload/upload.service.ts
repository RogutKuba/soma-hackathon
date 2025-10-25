import { Elysia, t } from 'elysia';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@/lib/env';
import { generateId } from '@/lib/id';
import { db } from '@/db/client';
import { filesTable, FileEntity, type FileType } from '@/db/schema/files.db';
import { r2Client } from '@/lib/r2';

export class UploadService {
  /**
   * Uploads a file to R2 and saves metadata to database
   */
  static async uploadFile(file: File, fileType?: FileType) {
    const fileId = generateId('file');
    const storagePath = `${fileType || 'other'}/${fileId}/${file.name}`;

    // Convert file to buffer
    const buffer = await file.arrayBuffer();

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: storagePath,
      Body: Buffer.from(buffer),
      ContentType: file.type,
    });

    await r2Client.send(uploadCommand);

    // Save metadata to database
    const newFile: FileEntity = {
      id: fileId,
      created_at: new Date().toISOString(),
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      storage_path: storagePath,
      file_type: fileType || null,
      url: `${env.R2_PUBLIC_URL}/${storagePath}`,
    };

    const [savedFile] = await db.insert(filesTable).values(newFile).returning();

    return savedFile;
  }

  /**
   * Uploads multiple files to R2 and saves metadata to database
   */
  static async uploadFiles(files: File[], fileType?: FileType) {
    const uploadPromises = files.map((file) => this.uploadFile(file, fileType));
    return await Promise.all(uploadPromises);
  }
}

// Elysia route for uploading files
export const uploadService = new Elysia({ prefix: '/upload' })
  .post(
    '/',
    async ({ body }) => {
      const { file, file_type } = body;
      const result = await UploadService.uploadFile(file, file_type);
      return {
        success: true,
        file: result,
      };
    },
    {
      body: t.Object({
        file: t.File(),
        file_type: t.Optional(
          t.Union([
            t.Literal('invoice_pdf'),
            t.Literal('pod'),
            t.Literal('po_pdf'),
            t.Literal('bol_pdf'),
            t.Literal('other'),
          ])
        ),
      }),
    }
  )
  .post(
    '/multiple',
    async ({ body }) => {
      const { files, file_type } = body;
      const result = await UploadService.uploadFiles(files, file_type);
      return {
        success: true,
        files: result,
      };
    },
    {
      body: t.Object({
        files: t.Array(t.File()),
        file_type: t.Optional(
          t.Union([
            t.Literal('invoice_pdf'),
            t.Literal('pod'),
            t.Literal('po_pdf'),
            t.Literal('bol_pdf'),
            t.Literal('other'),
          ])
        ),
      }),
    }
  );
