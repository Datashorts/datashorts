# ─── STAGE 1: deps + build ────────────────────────────────────────────────────
FROM node:18-alpine AS build

# 1) Use /app as your project directory
WORKDIR /app

# 2) Always use legacy-peer-deps for npm installs
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# 3) Declare build-time env vars (Railway injects these automatically)
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
ARG DODO_WEBHOOK_SECRET
ARG CLAUDE_AUTH_TOKEN
ARG NODE_ENV
ARG DODO_PAYMENTS_API_KEY
ARG NEXT_PUBLIC_DODO_TEST_API
ARG NEXT_PUBLIC_RETURN_URL
ARG NEXT_PUBLIC_APP_URL

# 4) Expose them as ENV so `next build` can see them
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
ENV DODO_WEBHOOK_SECRET=$DODO_WEBHOOK_SECRET
ENV CLAUDE_AUTH_TOKEN=$CLAUDE_AUTH_TOKEN
ENV NODE_ENV=$NODE_ENV
ENV DODO_PAYMENTS_API_KEY=$DODO_PAYMENTS_API_KEY
ENV NEXT_PUBLIC_DODO_TEST_API=$NEXT_PUBLIC_DODO_TEST_API
ENV NEXT_PUBLIC_RETURN_URL=$NEXT_PUBLIC_RETURN_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# 5) Copy package files first
COPY package.json package-lock.json ./

# 6) Install base dependencies
RUN npm install

# 7) Install additional required packages
RUN npm install @clerk/nextjs@latest
RUN npm install tailwindcss postcss autoprefixer tailwindcss-animate --save-dev
RUN npm install class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-slot --save
RUN npm install @radix-ui/react-dialog @radix-ui/react-switch @radix-ui/react-label @radix-ui/react-select --save

# 8) Copy ALL source files including configs BEFORE building
COPY . .

# 9) Now build with all configs and dependencies in place
RUN npm run build


# ─── STAGE 2: runtime ─────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

# 10) Let Next.js bind to Railway's $PORT (default 3000)
ARG PORT=3000
ENV PORT=${PORT}

# 11) Copy production artifacts from build stage
COPY --from=build /app/.next      ./.next
COPY --from=build /app/public     ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json  ./package.json

# 12) Expose the listening port
EXPOSE 3000

# 13) Start the optimized Next.js server
CMD ["npm", "start"]