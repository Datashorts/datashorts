"use client"

import * as React from "react"
import dynamic from 'next/dynamic'

// Dynamically import providers with no SSR to completely avoid prerendering issues
const ClerkProviderWrapper = dynamic(
  () => import('@clerk/nextjs').then(mod => {
    const { ClerkProvider } = mod
    return function ClerkWrapper({ children }: { children: React.ReactNode }) {
      return <ClerkProvider>{children}</ClerkProvider>
    }
  }),
  { ssr: false }
)

const ThemeProviderWrapper = dynamic(
  () => import('next-themes').then(mod => {
    const { ThemeProvider } = mod
    return function ThemeWrapper({ children }: { children: React.ReactNode }) {
      return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      )
    }
  }),
  { ssr: false }
)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProviderWrapper>
      <ThemeProviderWrapper>
        {children}
      </ThemeProviderWrapper>
    </ClerkProviderWrapper>
  )
}
