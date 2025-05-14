# ─── STAGE 1: deps + build ─────────────────────────────────────────────────────
FROM node:18-alpine AS build

# Use container root as project dir
WORKDIR /

# Tell npm to default to legacy‐peer‐deps for all installs
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# Build‐time args (Railway will inject these)
ARG NEXT_PUBLIC_DRIZZLE_DATABASE_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
ARG OPENAI_API_KEY
ARG PINECONE_API_KEY
ARG PINECONE_INDEX_NAME
ARG CLERK_SECRET_KEY
ARG NODE_TLS_REJECT_UNAUTHORIZED
ARG XAI_API_KEY

# Push them into ENV so `next build` can read them
ENV NEXT_PUBLIC_DRIZZLE_DATABASE_URL=$NEXT_PUBLIC_DRIZZLE_DATABASE_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV PINECONE_API_KEY=$PINECONE_API_KEY
ENV PINECONE_INDEX_NAME=$PINECONE_INDEX_NAME
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV NODE_TLS_REJECT_UNAUTHORIZED=$NODE_TLS_REJECT_UNAUTHORIZED
ENV XAI_API_KEY=$XAI_API_KEY

# Install deps (now automatically using legacy‐peer‐deps)
COPY package.json package-lock.json* ./
RUN npm install

# Copy & build
COPY . .
RUN npm run build


# ─── STAGE 2: runtime ──────────────────────────────────────────────────────────
FROM node:18-alpine AS runner

# Again use container root
WORKDIR /

# Let Next.js pick up Railway’s $PORT
ARG PORT=3000
ENV PORT=${PORT}

# Copy artifacts from build stage
COPY --from=build /public     ./public
COPY --from=build /.next      ./.next
COPY --from=build /node_modules ./node_modules
COPY --from=build /package.json  ./package.json

EXPOSE 3000

# Use your package.json “start” script (which should be: next start -p ${PORT:-3000})
CMD ["npm","start"]