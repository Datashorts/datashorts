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

# 6.6) Create directories
RUN mkdir -p components/ui lib app/components/ui app/lib

# 6.7) Create button.tsx file
RUN echo 'import * as React from "react";' > components/ui/button.tsx
RUN echo 'import { Slot } from "@radix-ui/react-slot";' >> components/ui/button.tsx
RUN echo 'import { cva, type VariantProps } from "class-variance-authority";' >> components/ui/button.tsx
RUN echo 'import { cn } from "@/lib/utils";' >> components/ui/button.tsx
RUN echo '' >> components/ui/button.tsx
RUN echo 'const buttonVariants = cva(' >> components/ui/button.tsx
RUN echo '  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",' >> components/ui/button.tsx
RUN echo '  {' >> components/ui/button.tsx
RUN echo '    variants: {' >> components/ui/button.tsx
RUN echo '      variant: {' >> components/ui/button.tsx
RUN echo '        default: "bg-primary text-primary-foreground hover:bg-primary/90",' >> components/ui/button.tsx
RUN echo '        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",' >> components/ui/button.tsx
RUN echo '        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",' >> components/ui/button.tsx
RUN echo '        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",' >> components/ui/button.tsx
RUN echo '        ghost: "hover:bg-accent hover:text-accent-foreground",' >> components/ui/button.tsx
RUN echo '        link: "text-primary underline-offset-4 hover:underline",' >> components/ui/button.tsx
RUN echo '      },' >> components/ui/button.tsx
RUN echo '      size: {' >> components/ui/button.tsx
RUN echo '        default: "h-9 px-4 py-2",' >> components/ui/button.tsx
RUN echo '        sm: "h-8 rounded-md px-3 text-xs",' >> components/ui/button.tsx
RUN echo '        lg: "h-10 rounded-md px-8",' >> components/ui/button.tsx
RUN echo '        icon: "h-9 w-9",' >> components/ui/button.tsx
RUN echo '      },' >> components/ui/button.tsx
RUN echo '    },' >> components/ui/button.tsx
RUN echo '    defaultVariants: {' >> components/ui/button.tsx
RUN echo '      variant: "default",' >> components/ui/button.tsx
RUN echo '      size: "default",' >> components/ui/button.tsx
RUN echo '    },' >> components/ui/button.tsx
RUN echo '  }' >> components/ui/button.tsx
RUN echo ');' >> components/ui/button.tsx
RUN echo '' >> components/ui/button.tsx
RUN echo 'export interface ButtonProps' >> components/ui/button.tsx
RUN echo '  extends React.ButtonHTMLAttributes<HTMLButtonElement>,' >> components/ui/button.tsx
RUN echo '    VariantProps<typeof buttonVariants> {' >> components/ui/button.tsx
RUN echo '  asChild?: boolean;' >> components/ui/button.tsx
RUN echo '}' >> components/ui/button.tsx
RUN echo '' >> components/ui/button.tsx
RUN echo 'const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(' >> components/ui/button.tsx
RUN echo '  ({ className, variant, size, asChild = false, ...props }, ref) => {' >> components/ui/button.tsx
RUN echo '    const Comp = asChild ? Slot : "button";' >> components/ui/button.tsx
RUN echo '    return (' >> components/ui/button.tsx
RUN echo '      <Comp' >> components/ui/button.tsx
RUN echo '        className={cn(buttonVariants({ variant, size, className }))}' >> components/ui/button.tsx
RUN echo '        ref={ref}' >> components/ui/button.tsx
RUN echo '        {...props}' >> components/ui/button.tsx
RUN echo '      />' >> components/ui/button.tsx
RUN echo '    );' >> components/ui/button.tsx
RUN echo '  }' >> components/ui/button.tsx
RUN echo ');' >> components/ui/button.tsx
RUN echo 'Button.displayName = "Button";' >> components/ui/button.tsx
RUN echo '' >> components/ui/button.tsx
RUN echo 'export { Button, buttonVariants };' >> components/ui/button.tsx

# 6.8) Create utils.ts file
RUN echo 'import { type ClassValue, clsx } from "clsx";' > lib/utils.ts
RUN echo 'import { twMerge } from "tailwind-merge";' >> lib/utils.ts
RUN echo '' >> lib/utils.ts
RUN echo 'export function cn(...inputs: ClassValue[]) {' >> lib/utils.ts
RUN echo '  return twMerge(clsx(inputs));' >> lib/utils.ts
RUN echo '}' >> lib/utils.ts

# 6.9) Create symlinks for app directory
RUN ln -sf @/components/ui/button.tsx app/components/ui/button.tsx
RUN ln -sf ../../lib/utils.ts app/lib/utils.ts

# 6.10) Verify created files
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