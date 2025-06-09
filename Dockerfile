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
# 6.5) Install Tailwind CSS v4 dependencies to fix build
RUN npm install @tailwindcss/postcss@latest tailwindcss@4 --legacy-peer-deps
# 7) Copy the rest of your source (app/, components/, public/, etc.)
COPY . .
# 7.5) Fix PostCSS config and create missing files
RUN rm -f postcss.config.mjs
RUN cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: ["@tailwindcss/postcss"],
};
EOF
# Create missing directories
RUN mkdir -p components/ui lib
# Create lib/utils.ts
RUN cat > lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF
# Create components/ui/button.tsx
RUN cat > components/ui/button.tsx << 'EOF'
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
EOF
# 8) Build the project
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