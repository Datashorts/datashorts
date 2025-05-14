<<<<<<< HEAD
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

=======
# Stage 1: Install dependencies
FROM node:18-alpine AS deps

# Set working directory
WORKDIR /app

# Install required OS packages
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with legacy-peer-deps to avoid ERESOLVE issues
RUN npm install --legacy-peer-deps

# Copy rest of the app
COPY . .

# Build the app
RUN npm run build

# Stage 2: Create a lightweight production image
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Install required OS packages
RUN apk add --no-cache libc6-compat

# Copy files from build stage
>>>>>>> bd50985e3cc509885ae826df4ccfe106964bda54
COPY --from=deps /app/public ./public
COPY --from=deps /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

<<<<<<< HEAD
# Set the ENV again for runtime
ARG NEXT_PUBLIC_DRIZZLE_DATABASE_URL
ENV NEXT_PUBLIC_DRIZZLE_DATABASE_URL=${NEXT_PUBLIC_DRIZZLE_DATABASE_URL}

EXPOSE 3000


CMD ["npm", "run","dev"]
=======
# Expose the port Railway will use
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "run", "start""dev", "start", "start",]
>>>>>>> bd50985e3cc509885ae826df4ccfe106964bda54
