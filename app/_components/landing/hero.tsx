'use client'

import { useState, useRef, useEffect } from 'react'
import { useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { HeroAnimation} from './hero-animation'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { StoreUser } from "@/app/actions/user"

export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const [isHovered, setIsHovered] = useState(false)
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      StoreUser({
        id: user.id,
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName,
      });
    }
  }, [user]);

  const handleGetStarted = () => {
    router.push("/stats") // or whatever your dashboard route is
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden py-20 px-4 md:px-6">
      {/* Background animation - KEEP THIS */}
      <HeroAnimation className="opacity-60" />

      {/* Main container */}
      <div ref={ref} className="container relative z-10 mx-auto max-w-5xl pt-16">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* ───────────────────────────────── Left column */}
          <div
            className="text-center lg:text-left"
            style={{
              transform: isInView ? 'none' : 'translateY(20px)',
              opacity: isInView ? 1 : 0,
              transition: 'all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.2s',
            }}
          >
           <span
  className="
    mb-6 inline-block rounded-full
    border border-white/25
    bg-white/5
    px-4 py-1 text-sm
    font-medium text-white/80
    backdrop-blur-sm
  "
>
  What's new — Natural Language Database Queries
</span>


            <h1
              className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
              style={{
                transform: isInView ? 'none' : 'translateY(30px)',
                opacity: isInView ? 1 : 0,
                transition: 'all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.1s',
              }}
            >
              Data Insights  {'  '}
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">
                In Seconds
              </span>
            </h1>

            <p
              className="mx-auto mb-8 max-w-md text-xl text-muted-foreground md:text-2xl lg:mx-0"
              style={{
                transform: isInView ? 'none' : 'translateY(40px)',
                opacity: isInView ? 1 : 0,
                transition: 'all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.2s',
              }}
            >
              Ask questions about your data in plain English and get instant answers. No SQL required.
            </p>

            <div
              className="flex flex-col items-center gap-4 sm:flex-row lg:items-start"
              style={{
                transform: isInView ? 'none' : 'translateY(50px)',
                opacity: isInView ? 1 : 0,
                transition: 'all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.3s',
              }}
            >
              {/* Conditional button based on auth state */}
              <SignedOut>
                <SignInButton mode="modal">
                  <Button
                    size="lg"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="group relative overflow-hidden"
                  >
                    <span className="relative z-10">Get Started</span>
                    <ChevronRight
                      className={`ml-2 h-4 w-4 transition-transform duration-300 ${
                        isHovered ? 'translate-x-1' : ''
                      }`}
                    />
                    <span className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-blue-500 to-purple-500" />
                  </Button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="group relative overflow-hidden"
                >
                  <span className="relative z-10">Go to Dashboard</span>
                  <ChevronRight
                    className={`ml-2 h-4 w-4 transition-transform duration-300 ${
                      isHovered ? 'translate-x-1' : ''
                    }`}
                  />
                  <span className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-blue-500 to-purple-500" />
                </Button>
              </SignedIn>

              
            </div>
          </div>

         {/* ───────────────────────────────── Right column (larger themed SVG) */}
<div
  className="relative flex justify-center lg:justify-end"
  style={{
    transform: isInView ? 'none' : 'translateY(40px)',
    opacity: isInView ? 1 : 0,
    transition: 'all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.4s',
  }}
>
  <div className="w-[40rem] sm:w-[56rem] md:w-[72rem] lg:w-[96rem]">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 700 360"
      className="h-auto w-full"
    >
      {/* defs — gradient + glow filter */}
      <defs>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>

        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Bars */}
      <rect x="100" y="200" width="60" height="120" rx="6" fill="url(#barGrad)" filter="url(#glow)" />
      <rect x="180" y="160" width="60" height="160" rx="6" fill="url(#barGrad)" filter="url(#glow)" />
      <rect x="260" y="100" width="60" height="220" rx="6" fill="url(#barGrad)" filter="url(#glow)" />

      {/* Animated trend line */}
      <path
        d="M100 240 L180 200 L260 140 L340 100"
        stroke="url(#barGrad)"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="330"
        strokeDashoffset="330"
        filter="url(#glow)"
      >
        <animate attributeName="stroke-dashoffset" from="330" to="0" dur="1.5s" begin="0s" fill="freeze" />
      </path>

      {/* Endpoint dot */}
      <circle cx="340" cy="100" r="14" fill="#ffffff">
        <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="1.3s" fill="freeze" />
      </circle>

      {/* Brand text - adjusted positioning */}
      <text x="370" y="200" fontFamily="Inter, sans-serif" fontSize="72" fontWeight="700" fill="#ffffff">
        Data
      </text>
      <text x="370" y="280" fontFamily="Inter, sans-serif" fontSize="72" fontWeight="700" fill="#ffffff">
        Shorts
      </text>
    </svg>

    {/* Decorative blobs unchanged */}
    <div className="pointer-events-none absolute -top-6 -right-6 h-40 w-40 rounded-full bg-purple-500/10 blur-2xl"></div>
    <div className="pointer-events-none absolute -bottom-4 -left-4 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl"></div>
  </div>
</div>

        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 transform"
        style={{
          opacity: isInView ? 1 : 0,
          transition: 'opacity 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.8s',
        }}
      >
        <div className="flex h-10 w-6 justify-center rounded-full border-2 border-muted-foreground/30 p-1">
          <div className="h-2 w-1 animate-bounce rounded-full bg-muted-foreground/50" />
        </div>
      </div>
    </section>
  )
}