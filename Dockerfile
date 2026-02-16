FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY backend/package.json ./backend/
COPY prisma/ ./prisma/

RUN npm install --workspace=backend
RUN npx prisma generate --schema=prisma/schema.prisma

COPY backend/ ./backend/
RUN npm run build --workspace=backend

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/dist/ ./backend/dist/
COPY --from=builder /app/prisma/ ./prisma/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/backend/node_modules/ ./backend/node_modules/

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node backend/dist/index.js"]
