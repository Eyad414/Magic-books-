# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

# Cloud Run injects PORT (default 8080). Generate the nginx config at
# startup so it listens on whatever PORT is set to.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080

# nginx:alpine entrypoint expands templates in /etc/nginx/templates
# and then starts nginx.
CMD ["nginx", "-g", "daemon off;"]
