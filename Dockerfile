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
# 5) Install your declared dependencies
COPY package.json package-lock.json ./
RUN npm install
# 6) Immediately override Clerk to the latest v6 (supports Next.js 15)
RUN npm install @clerk/nextjs@latest
# 6.5) Install required dependencies for Tailwind CSS v4 and UI components
RUN npm install tailwindcss@4 @tailwindcss/postcss --legacy-peer-deps
RUN npm install class-variance-authority clsx tailwind-merge @radix-ui/react-slot --legacy-peer-deps

# 6.6) Debug and ensure file paths
RUN ls -la
RUN echo "Checking for component files..."
RUN find . -name "button.tsx" || echo "Button component not found"
RUN find . -name "utils.ts" || echo "Utils file not found"

# 6.7) Ensure directories exist
RUN mkdir -p components/ui lib

# 6.8) Create the Button component if it doesn't exist
RUN if [ ! -f components/ui/button.tsx ]; then \
    echo 'import * as React from "react"; \
    import { Slot } from "@radix-ui/react-slot"; \
    import { cva, type VariantProps } from "class-variance-authority"; \
    import { cn } from "@/lib/utils"; \
    const buttonVariants = cva( \
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", \
      { \
        variants: { \
          variant: { \
            default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90", \
            destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60", \
            outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50", \
            secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80", \
            ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50", \
            link: "text-primary underline-offset-4 hover:underline", \
          }, \
          size: { \
            default: "h-9 px-4 py-2 has-[>svg]:px-3", \
            sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5", \
            lg: "h-10 rounded-md px-6 has-[>svg]:px-4", \
            icon: "size-9", \
          }, \
        }, \
        defaultVariants: { \
          variant: "default", \
          size: "default", \
        }, \
      } \
    ); \
    function Button({ \
      className, \
      variant, \
      size, \
      asChild = false, \
      ...props \
    }: React.ComponentProps<"button"> & \
      VariantProps<typeof buttonVariants> & { \
        asChild?: boolean \
      }) { \
      const Comp = asChild ? Slot : "button"; \
      return ( \
        <Comp \
          data-slot="button" \
          className={cn(buttonVariants({ variant, size, className }))} \
          {...props} \
        /> \
      ) \
    } \
    export { Button, buttonVariants };' > components/ui/button.tsx; \
fi

# 6.9) Create the utils file if it doesn't exist
RUN if [ ! -f lib/utils.ts ]; then \
    echo 'import { type ClassValue, clsx } from "clsx"; \
    import { twMerge } from "tailwind-merge"; \
    export function cn(...inputs: ClassValue[]) { \
      return twMerge(clsx(inputs)); \
    }' > lib/utils.ts; \
fi

# 6.10) Create symlinks in app directory for better path resolution
RUN mkdir -p app/components/ui app/lib
RUN ln -sf ../../../components/ui/button.tsx app/components/ui/button.tsx || echo "Failed to create button.tsx symlink"
RUN ln -sf ../../lib/utils.ts app/lib/utils.ts || echo "Failed to create utils.ts symlink"

# 6.11) Verify the files exist
RUN ls -la components/ui/
RUN ls -la lib/
RUN ls -la app/components/ui/
RUN ls -la app/lib/
# 7) Copy the rest of your source (app/, components/, public/, etc.) and build
COPY . .
RUN npm run build
# ─── STAGE 2: runtime ─────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app
# 8) Let Next.js bind to Railway's $PORT (default 3000)
ARG PORT=3000
ENV PORT=${PORT}
# 9) Copy production artifacts from build stage
COPY --from=build /app/.next      ./.next
COPY --from=build /app/public     ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json  ./package.json
# 10) Expose the listening port
EXPOSE 3000
# 11) Start the optimized Next.js server (ensure your package.json has
#     "start": "next start -p ${PORT:-3000}")
CMD ["npm", "start"]