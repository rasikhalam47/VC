FROM node:20-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
ENV NODE_ENV=production
USER node
EXPOSE 8080
# Cloud Run injects PORT; server.js reads it (default 8080).
CMD ["node", "server.js"]
