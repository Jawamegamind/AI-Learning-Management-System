# FROM node:18-alpine AS base

# WORKDIR /app

# COPY package.json package-lock.json* pnpm-lock.yaml* ./

# RUN if [ -f yarn.lock ]; then \
#       yarn install --frozen-lockfile; \
#     elif [ -f package-lock.json ]; then \
#       npm ci; \
#     elif [ -f pnpm-lock.yaml ]; then \
#       corepack enable pnpm && pnpm i --frozen-lockfile; \
#     else \
#       echo "No lock file found. Please provide yarn.lock, package-lock.json, or pnpm-lock.yaml." && exit 1; \
#     fi

# COPY . .

# RUN npm run build

# EXPOSE 3000

# CMD ["npm", "start"]

FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]