import multer from 'multer';
import { config } from '../config.js';
import { badRequest } from '../lib/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxUploadMb * 1024 * 1024,
    files: 8,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(badRequest(`نوع فایل «${file.mimetype}» پشتیبانی نمی‌شود.`));
  },
});

export const uploadFiles = upload.array('files', 8);
export const uploadSingle = upload.single('file');
