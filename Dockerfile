# === Build Stage ===
FROM node:20-bullseye AS builder

WORKDIR /app

# Copy package files and prisma schema before npm install (needed for postinstall script)
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies (postinstall will run prisma generate)
RUN npm install

# Copy rest of the application
COPY . .

RUN npx prisma generate
RUN npm run build

# === Runtime Stage ===
FROM node:20-bullseye AS runner

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Copy prisma schema before npm install (needed for postinstall script)
COPY prisma ./prisma

# Install dependencies (postinstall will run prisma generate)
RUN npm install --omit=dev && npm install prisma --save

# Copy built application and generated Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run migrations on startup, then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

