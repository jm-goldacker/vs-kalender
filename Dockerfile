# Stage 1: Client und Server bauen
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY server/ server/
COPY client/ client/
RUN npm run build

# Stage 2: Runtime-Image (nur Produktions-Abhängigkeiten)
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    DATABASE_PATH=/data/bus-kalender.db \
    PORT=3001
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist server/public
VOLUME /data
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
