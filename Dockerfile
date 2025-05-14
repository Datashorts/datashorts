# ─── STAGE 1: deps + build ─────────────────────────────────────────────────────
FROM node:18-alpine AS build

# 1) Use container root as project directory
WORKDIR /

# 2) Make npm default to legacy-peer-deps
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# 3) Build-time env args (Railway will inject these)
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

# 4) Promote them to ENV so `next build` can see them
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

# 5) Install your declared deps
COPY package.json package-lock.json ./
RUN npm install

# 6) Override Clerk to its Next-15 beta (fixes the missing‐module error)
RUN npm install @clerk/nextjs@next

# 7) Copy every folder at your project root (app/, components/, public/, etc.)
COPY . .

# 8) Build your Next.js app
RUN npm run build


# ─── STAGE 2: runtime ──────────────────────────────────────────────────────────
FROM node:18-alpine AS runner

# 9) Again use the container root
WORKDIR /

# 10) Let Next.js pick up Railway’s $PORT (fallback to 3000)
ARG PORT=3000
ENV PORT=${PORT}

# 11) Copy only the build outputs from the build stage
COPY --from=build /.next      ./.next
COPY --from=build /public     ./public
COPY --from=build /node_modules ./node_modules
COPY --from=build /package.json  ./package.json

# 12) Tell Docker & Railway which port you’re listening on
EXPOSE 3000

# 13) Start in production mode. 
#     (Make sure package.json has: "start":"next start -p ${PORT:-3000}")
CMD ["npm","start"]