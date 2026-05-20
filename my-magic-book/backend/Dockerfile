# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:20-slim AS build

WORKDIR /app

# Skip downloading the bundled Chromium during npm install — we install
# the system Chromium in the runtime stage instead. This keeps the image
# smaller and avoids version mismatches.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop devDependencies for the runtime image.
RUN npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:20-slim AS runtime

# Install Chromium and the libs Puppeteer needs to run headless.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    wget \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Cloud Run sets PORT (default 8080). The server already reads process.env.PORT.
EXPOSE 8080

# Run as the non-root user that ships in the node image.
USER node

CMD ["node", "dist/server.js"]
