"use client"

import * as React from "react"
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR/prerendering, render children without providers to avoid useContext issues
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ClerkProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        {children}
      </NextThemesProvider>
    </ClerkProvider>
  )
}
