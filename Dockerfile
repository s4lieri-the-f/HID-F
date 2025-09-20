FROM node:20-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm config set audit false && \
    npm config set fund false && \
    npm config set update-notifier false && \
    npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 60000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

COPY package.json package-lock.json* .npmrc* ./
RUN echo "Installing dependencies in builder..." && \
    timeout 600 npm install --no-audit --silent --prefer-offline --maxsockets 1 && \
    echo "Dependencies installed successfully" && \
    echo "Checking node_modules..." && \
    ls -la node_modules/.bin/ | grep vite && \
    echo "Checking if vite is available..." && \
    npx vite --version

COPY . .

RUN echo "Starting build process..." && \
    timeout 300 npx vite build || (echo "Build timed out after 5 minutes" && exit 1) && \
    echo "Build completed successfully"

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