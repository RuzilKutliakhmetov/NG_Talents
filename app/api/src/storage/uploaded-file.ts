import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';

export const STORAGE_FILE_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const STORAGE_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface UploadedFileInput {
  buffer?: Buffer;
  originalname?: string;
  mimetype?: string;
}

export function validateUploadedFile(file: UploadedFileInput | undefined) {
  if (!file?.buffer || file.buffer.length === 0)
    throw new BadRequestException({
      code: 'FILE_REQUIRED',
      message: 'A non-empty file is required',
    });
  if (file.buffer.length > STORAGE_FILE_MAX_SIZE_BYTES)
    throw new BadRequestException({
      code: 'FILE_TOO_LARGE',
      message: 'File size must not exceed 10 MB',
    });
  const mimeType = file.mimetype;
  if (
    typeof mimeType !== 'string' ||
    !STORAGE_FILE_ALLOWED_MIME_TYPES.includes(mimeType as never)
  )
    throw new BadRequestException({
      code: 'FILE_MIME_TYPE_NOT_ALLOWED',
      message: 'Only PDF and DOCX files are allowed',
    });

  const extension = mimeType === 'application/pdf' ? 'pdf' : 'docx';
  const originalName = (file.originalname ?? '').replace(/[\\/]/g, '_').trim();
  if (!originalName)
    throw new BadRequestException({
      code: 'FILE_NAME_REQUIRED',
      message: 'File name is required',
    });
  const actualExtension = extname(originalName).toLowerCase();
  const expectedExtension = `.${extension}`;
  if (actualExtension && actualExtension !== expectedExtension)
    throw new BadRequestException({
      code: 'FILE_EXTENSION_NOT_ALLOWED',
      message: `File extension must be ${expectedExtension}`,
    });
  return {
    buffer: file.buffer,
    originalName,
    mimeType,
    sizeBytes: file.buffer.length,
    extension,
  };
}
