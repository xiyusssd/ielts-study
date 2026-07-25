# -------- deps --------
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# --ignore-scripts 绕开 pnpm 11 对未批准 build scripts 的报错；Prisma 客户端在下一步单独 generate
RUN pnpm install --frozen-lockfile --ignore-scripts

# -------- builder --------
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN ./node_modules/.bin/prisma generate
RUN pnpm build

# -------- runner --------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache wget

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# SQLite 数据目录（volume 会挂到这里）
RUN mkdir -p /app/data /app/content && chown -R nextjs:nodejs /app/data /app/content

# standalone 输出（含运行 server.js 所需的最小依赖）
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# seed 需要的：完整 node_modules（tsx / prisma / bcryptjs 等）+ prisma / scripts / lib
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
