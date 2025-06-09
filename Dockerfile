# ─── STAGE 1: deps + build ────────────────────────────────────────────────────
FROM node:18-alpine AS build

WORKDIR /app

# Set npm config
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# Declare build-time env vars
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

# Expose them as ENV
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

# Copy package files and install ALL dependencies (including dev dependencies for build)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source code
COPY . .

# Create missing directories and files
RUN mkdir -p components/ui lib

# Create lib/utils.ts
RUN echo 'import { type ClassValue, clsx } from "clsx"\nimport { twMerge } from "tailwind-merge"\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs))\n}' > lib/utils.ts

# Create components/ui/button.tsx
RUN echo 'import * as React from "react"\nimport { Slot } from "@radix-ui/react-slot"\nimport { cva, type VariantProps } from "class-variance-authority"\nimport { cn } from "@/lib/utils"\n\nconst buttonVariants = cva(\n  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",\n  {\n    variants: {\n      variant: {\n        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",\n        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",\n        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",\n        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",\n        ghost: "hover:bg-accent hover:text-accent-foreground",\n        link: "text-primary underline-offset-4 hover:underline",\n      },\n      size: {\n        default: "h-9 px-4 py-2",\n        sm: "h-8 rounded-md px-3 text-xs",\n        lg: "h-10 rounded-md px-8",\n        icon: "h-9 w-9",\n      },\n    },\n    defaultVariants: {\n      variant: "default",\n      size: "default",\n    },\n  }\n)\n\nexport interface ButtonProps\n  extends React.ButtonHTMLAttributes<HTMLButtonElement>,\n    VariantProps<typeof buttonVariants> {\n  asChild?: boolean\n}\n\nconst Button = React.forwardRef<HTMLButtonElement, ButtonProps>(\n  ({ className, variant, size, asChild = false, ...props }, ref) => {\n    const Comp = asChild ? Slot : "button"\n    return (\n      <Comp\n        className={cn(buttonVariants({ variant, size, className }))}\n        ref={ref}\n        {...props}\n      />\n    )\n  }\n)\nButton.displayName = "Button"\n\nexport { Button, buttonVariants }' > components/ui/button.tsx

# Update postcss.config.js to use standard tailwindcss
RUN echo 'module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}' > postcss.config.js

# Run build
RUN npm run build

# ─── STAGE 2: runtime ─────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

ARG PORT=3000
ENV PORT=${PORT}

# Copy production artifacts
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]