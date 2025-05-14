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
COPY --from=deps /app/public ./public
COPY --from=deps /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Expose the port Railway will use
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "run", "start""dev", "start", "start",]