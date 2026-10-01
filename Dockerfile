# Outil de Diagnostic Organisationnel: web app + API server (PostgreSQL in a separate container).
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

COPY index.html ./
COPY css css
COPY js js
COPY dist dist
COPY server server

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1
CMD ["node", "server/index.js"]
