import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export const ALLOWED_UPLOAD_MIME = Object.keys(EXT_BY_MIME);

export interface StoredFile {
  fileName: string;
  url: string;
  size: number;
  mimeType: string;
}

export async function saveBuffer(
  buffer: Buffer,
  mimeType: string,
  originalName = 'file',
): Promise<StoredFile> {
  await fs.mkdir(config.storage.uploadDir, { recursive: true });
  const ext = EXT_BY_MIME[mimeType] ?? path.extname(originalName).slice(0, 8) ?? '';
  const safeName = path
    .basename(originalName)
    .replace(/[^\w.\-؀-ۿ ]/g, '')
    .slice(0, 60);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const fileName = `${unique}`;
  await fs.writeFile(path.join(config.storage.uploadDir, fileName), buffer);
  void safeName;
  return {
    fileName,
    url: `/uploads/${fileName}`,
    size: buffer.byteLength,
    mimeType,
  };
}

export async function readUpload(fileName: string): Promise<Buffer | null> {
  const safe = path.basename(fileName);
  try {
    return await fs.readFile(path.join(config.storage.uploadDir, safe));
  } catch {
    return null;
  }
}
