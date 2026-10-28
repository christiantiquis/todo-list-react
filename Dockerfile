FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ENV STATIC_EXPORT=true
ENV NEXT_PUBLIC_BASE_PATH=

RUN npx next build && node scripts/check-pages-export.cjs

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html

EXPOSE 80
