# === Build Stage ===
FROM node:20-bullseye AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# === Runtime Stage ===
FROM node:20-bullseye AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run migrations on startup, then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

