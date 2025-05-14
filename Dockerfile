# Stage 1: Install deps and build
FROM node:18-alpine AS deps

WORKDIR /app

# Accept this variable at build time
ARG NEXT_PUBLIC_DRIZZLE_DATABASE_URL
ENV NEXT_PUBLIC_DRIZZLE_DATABASE_URL=${NEXT_PUBLIC_DRIZZLE_DATABASE_URL}

# Install libc6 to avoid runtime issues
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .

# Build with environment variable available
RUN npm run build

# Stage 2: Final runtime image
FROM node:18-alpine AS runner

WORKDIR /app

# Optional: install any OS dependencies
RUN apk add --no-cache libc6-compat

COPY --from=deps /app/public ./public
COPY --from=deps /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Set the ENV again for runtime
ARG NEXT_PUBLIC_DRIZZLE_DATABASE_URL
ENV NEXT_PUBLIC_DRIZZLE_DATABASE_URL=${NEXT_PUBLIC_DRIZZLE_DATABASE_URL}

EXPOSE 3000


CMD ["npm", "run","dev"]
