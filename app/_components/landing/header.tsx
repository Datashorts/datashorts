import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[#121212]/80 backdrop-blur-sm">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold">
              <span className="text-blue-500">Data</span>Chat
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
        <div>
          <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
        </div>
      </div>
    </header>
  )
}

