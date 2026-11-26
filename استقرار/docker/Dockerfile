# ---------------------------------------------------------------------
#  ازمونک — ایمیج Docker
#  ساخت:  docker build -f استقرار/docker/Dockerfile -t azmoonak:latest .
# ---------------------------------------------------------------------

FROM node:22-alpine AS builder
WORKDIR /app

# نصب کتابخانه‌ها با استفاده از lockfile
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci

# کپی کد و ساخت
COPY . .
RUN npm run build

# حذف وابستگی‌های توسعه‌ای از مرحله‌ی نهایی
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# فایل‌های لازم برای اجرا
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/server ./server
COPY --from=builder /app/web/dist ./web/dist

# پوشه‌ی داده (دیتابیس SQLite و فایل‌های آپلودی)
RUN mkdir -p /app/server/data/uploads && chown -R node:node /app/server/data
USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/dist/index.js"]
