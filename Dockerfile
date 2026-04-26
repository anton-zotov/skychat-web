FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts/setup-hooks.mjs ./scripts/setup-hooks.mjs
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY scripts/setup-hooks.mjs ./scripts/setup-hooks.mjs
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["npm", "start"]
