/**
 * ساخت بسته‌ی قابل دانلود (ZIP) از سورس ازمونک — بدون وابستگی خارجی و کاملاً cross-platform.
 * اجرا:  node scripts/build-release.mjs
 * خروجی: release/azmoonak-vX.Y.Z.zip
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version ?? '1.0.0';
const outDir = path.join(root, 'release');
const outFile = path.join(outDir, `azmoonak-v${version}.zip`);

/** پوشه‌ها و فایل‌هایی که نباید در بسته باشند */
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.next',
  '.vite',
  'release',
  'data',
]);
const EXCLUDE_FILES = new Set(['.env', '.DS_Store', 'azmoonak.db', 'prod-test.db']);

/** نام فایل‌های غیرلاتین داخل بسته، به نام امن ASCII تبدیل می‌شود تا در ویندوز مشکلی نباشد. */
const RENAME = new Map([['راهنمای-اجرا.md', 'QUICKSTART-FA.md']]);

function shouldSkip(name) {
  return EXCLUDE_DIRS.has(name) || EXCLUDE_FILES.has(name);
}

/* ------------------------------ پیاده‌سازی ZIP ------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function collect(dir, base = dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (shouldSkip(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const relative = path.relative(base, full).split(path.sep).join('/');
    if (entry.isDirectory()) {
      collect(full, base, acc);
    } else if (entry.isFile()) {
      acc.push({ absolute: full, relative: RENAME.get(relative) ?? relative });
    }
  }
  return acc;
}

function dosDateTime(date) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2) & 0x1f);
  const day =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

const files = collect(root);
const chunks = [];
const central = [];
let offset = 0;

for (const file of files) {
  const content = fs.readFileSync(file.absolute);
  const compressed = zlib.deflateRawSync(content, { level: 9 });
  const useDeflate = compressed.length < content.length;
  const payload = useDeflate ? compressed : content;
  const method = useDeflate ? 8 : 0;
  const crc = crc32(content);
  const { time, day } = dosDateTime(fs.statSync(file.absolute).mtime);
  const nameBuffer = Buffer.from(file.relative, 'utf8');

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 flag
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(day, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(payload.length, 18);
  local.writeUInt32LE(content.length, 22);
  local.writeUInt16LE(nameBuffer.length, 26);
  local.writeUInt16LE(0, 28);

  chunks.push(local, nameBuffer, payload);

  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(method, 10);
  header.writeUInt16LE(time, 12);
  header.writeUInt16LE(day, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(payload.length, 20);
  header.writeUInt32LE(content.length, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);

  central.push(header, nameBuffer);
  offset += local.length + nameBuffer.length + payload.length;
}

const centralBuffer = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuffer.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, Buffer.concat([...chunks, centralBuffer, end]));

const sizeMb = (fs.statSync(outFile).size / 1024 / 1024).toFixed(2);
console.log(`✅ بسته ساخته شد: ${path.relative(root, outFile)} (${files.length} فایل، ${sizeMb} مگابایت)`);
console.log('   برای نصب: فایل را از حالت فشرده خارج کنید و scripts\\setup-windows.bat را اجرا کنید.');
