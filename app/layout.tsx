import type React from "react"
import { type Metadata } from "next"
import { Inter } from "next/font/google"
import './globals.css'
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DataChat - Chat With Your Data, Naturally",
  description: "Transform complex queries into stunning interactive charts and graphs with a single conversation.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#121212] text-white antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
