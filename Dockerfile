FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_APP_MODE=operational
ARG API_INTERNAL_URL=http://api:8000
ENV NEXT_PUBLIC_APP_MODE=$NEXT_PUBLIC_APP_MODE
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN mkdir -p public && npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_PUBLIC_APP_MODE=operational
COPY --from=build --chown=node:node /app/.next-operational/standalone ./
COPY --from=build --chown=node:node /app/.next-operational/static ./.next-operational/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
