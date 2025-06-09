'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { LineChart, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [scrolled])

  return (
    <>
      <header className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        scrolled 
          ? "bg-black/80 backdrop-blur-lg border-b border-white/10" 
          : "bg-transparent"
      )}>
        <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <LineChart className="h-6 w-6 text-blue-500" />
              <span className="text-xl font-bold tracking-tight text-white">
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">Data</span>Shorts
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
           
            <Link href="#how-it-works" className="text-sm font-medium text-white/70 hover:text-blue-400 transition-colors">
              How It Works
            </Link>
            <Link href="#demo" className="text-sm font-medium text-white/70 hover:text-blue-400 transition-colors">
              Demo
            </Link>
            
            <Link href="#pricing" className="text-sm font-medium text-white/70 hover:text-blue-400 transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm font-medium text-white/70 hover:text-blue-400 transition-colors">
              FAQ
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <SignedIn>
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverCard: "bg-black/90 border border-white/20 backdrop-blur-sm",
                    userButtonPopoverActionButton: "text-white/80 hover:bg-white/10",
                    userButtonPopoverActionButtonText: "text-white/80",
                    userButtonPopoverFooter: "border-t border-white/20"
                  }
                }}
              />
            </SignedIn>
            <SignedOut>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0">
                Get Started
              </Button>
            </SignedOut>
          </div>

          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-16 z-50 bg-black/95 backdrop-blur-sm flex flex-col md:hidden">
            <nav className="container max-w-7xl mx-auto flex flex-col gap-4 p-6">
              <Link 
                href="#features" 
                className="text-lg font-medium py-2 text-white/80 hover:text-blue-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="#how-it-works" 
                className="text-lg font-medium py-2 text-white/80 hover:text-blue-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link 
                href="#demo" 
                className="text-lg font-medium py-2 text-white/80 hover:text-blue-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Demo
              </Link>
              <Link 
                href="#testimonials" 
                className="text-lg font-medium py-2 text-white/80 hover:text-blue-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Testimonials
              </Link>
              <Link 
                href="#pricing" 
                className="text-lg font-medium py-2 text-white/80 hover:text-blue-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                href="#faq" 
                className="text-lg font-medium py-2 text-white/80 hover:text-blue-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>

              <div className="mt-4 space-y-4">
                <SignedIn>
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8",
                        userButtonPopoverCard: "bg-black/90 border border-white/20 backdrop-blur-sm",
                        userButtonPopoverActionButton: "text-white/80 hover:bg-white/10",
                        userButtonPopoverActionButtonText: "text-white/80",
                        userButtonPopoverFooter: "border-t border-white/20"
                      }
                    }}
                  />
                </SignedIn>
                <SignedOut>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Button>
                </SignedOut>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}