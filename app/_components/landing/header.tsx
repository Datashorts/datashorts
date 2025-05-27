'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import BetaTestForm from "./beta-test-form"

export default function Header() {
  const { user } = useUser();
  const [showBetaForm, setShowBetaForm] = useState(false);
  const [showBetaButton, setShowBetaButton] = useState(true);
  const [loading, setLoading] = useState(true);


  const adminUsers = [
    'user_2vGWjztVmYNM9zTMg9qHghGuSbI',
    'user_2vp5iU5LkPu3SIhsxNYLjkXaN86'
  ];

  useEffect(() => {
    const checkBetaStatus = async () => {
      if (!user) {
        setShowBetaButton(true);
        setLoading(false);
        return;
      }


      if (adminUsers.includes(user.id)) {
        setShowBetaButton(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/beta-test/status');
        if (response.ok) {
          const data = await response.json();

          setShowBetaButton(!data.hasApplied);
        }
      } catch (error) {
        console.error('Error checking beta status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBetaStatus();
  }, [user]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[#121212]/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold">
                <span className="text-blue-500">Data</span>Shorts
              </span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm hover:text-blue-500 transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm hover:text-blue-500 transition-colors">
              How It Works
            </Link>
            <Link href="#demo" className="text-sm hover:text-blue-500 transition-colors">
              Demo
            </Link>
            <Link href="#testimonials" className="text-sm hover:text-blue-500 transition-colors">
              Testimonials
            </Link>
            <Link href="#pricing" className="text-sm hover:text-blue-500 transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm hover:text-blue-500 transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <SignedIn>
              {!loading && showBetaButton && (
                <Button 
                  onClick={() => setShowBetaForm(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Join Beta
                </Button>
              )}
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverCard: "bg-[#1a1a1a] border border-gray-800",
                    userButtonPopoverActionButton: "text-gray-200 hover:bg-gray-800",
                    userButtonPopoverActionButtonText: "text-gray-200",
                    userButtonPopoverFooter: "border-t border-gray-800"
                  }
                }}
              />
            </SignedIn>
            <SignedOut>
              <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
            </SignedOut>
          </div>
        </div>
      </header>
      {showBetaForm && <BetaTestForm onClose={() => setShowBetaForm(false)} />}
    </>
  )
}

