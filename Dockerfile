FROM node:20-alpine
WORKDIR /app

COPY .output /app/.output
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
CMD ["node", ".output/server/index.mjs"]