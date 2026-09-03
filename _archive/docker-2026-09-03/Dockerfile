# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Le garde-fou typographique arrête le build sur une graisse légère sous 18 px.
RUN npx tsx scripts/verifier-typo.ts
RUN npm run build
# Les scripts d'administration sont compilés en un seul fichier sans dépendances,
# pour ne pas embarquer node_modules dans l'image finale.
RUN npx esbuild scripts/cli.ts \
      --bundle --platform=node --target=node22 --format=cjs \
      --outfile=dist-scripts/cli.cjs

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_DIR=/data/uploads

RUN addgroup --system --gid 1001 bantu \
 && adduser --system --uid 1001 bantu \
 && mkdir -p /data/uploads \
 && chown -R bantu:bantu /data

COPY --from=builder --chown=bantu:bantu /app/.next/standalone ./
COPY --from=builder --chown=bantu:bantu /app/.next/static ./.next/static
COPY --from=builder --chown=bantu:bantu /app/public ./public
COPY --from=builder --chown=bantu:bantu /app/dist-scripts ./dist-scripts
COPY --from=builder --chown=bantu:bantu /app/drizzle ./drizzle
COPY --chown=bantu:bantu docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER bantu
EXPOSE 3000
VOLUME ["/data/uploads"]

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
