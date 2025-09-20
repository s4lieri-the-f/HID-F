FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm config set audit false && \
    npm config set fund false && \
    npm config set update-notifier false && \
    npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 60000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

COPY package.json package-lock.json* ./
RUN echo "Starting npm ci..." && \
    timeout 600 npm ci --no-audit --silent --prefer-offline --maxsockets 1 && \
    echo "npm ci completed successfully"

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN timeout 300 npm run build || (echo "Build timed out after 5 minutes" && exit 1)

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

RUN npm ci --only=production --no-audit --silent --maxsockets 1 && npm cache clean --force

RUN chown -R sveltekit:nodejs /app
USER sveltekit

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", "build"]