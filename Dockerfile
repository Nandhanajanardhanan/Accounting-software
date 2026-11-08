# Runs the books online. The host must provide:
#   BOOKS_USER, BOOKS_PASSWORD   the login (required: the server will not start on the network without it)
#   BOOKS_SESSION_SECRET         any long random text, so logins survive restarts
#   a persistent disk mounted at /data, where books.db is kept
FROM node:24-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    BOOKS_DATA_DIR=/data
EXPOSE 3001
CMD ["node", "server/index.js"]
