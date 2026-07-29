# frontend-interface/Dockerfile — Next.js Frontend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile || npm install

COPY . .

ENV NEXT_PUBLIC_API_URL=http://localhost:8000
RUN npm run build || true

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "run", "start"]
