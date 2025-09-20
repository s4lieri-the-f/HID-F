FROM node:latest AS base

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
    timeout 600 npm install --no-audit --silent --prefer-offline --maxsockets 1

COPY . .

RUN echo "Starting build process..." && \
    timeout 300 npx vite build || (echo "Build timed out after 5 minutes" && exit 1) && \
    echo "Build completed successfully"

FROM nginx:alpine AS runner

COPY --from=builder /app/build /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]