"use client"
import Link from "next/link"
import { LineChart } from "lucide-react"

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-black py-12 overflow-hidden">
      {/* Stars Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      {/* Background gradients */}
      <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl opacity-70" />
      <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-purple-500/5 blur-3xl opacity-70" />

      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <LineChart className="h-6 w-6 text-blue-500" />
              <span className="text-2xl font-bold text-white">
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">Data</span>Shorts
              </span>
            </div>
            <p className="text-gray-300 max-w-sm">
              Chat with your database in natural language. No SQL required.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#features" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/stats" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Get in Touch</h3>
            <div className="space-y-3">
              <p className="text-gray-300">
                📧 datashorts15@gmail.com
              </p>
              <p className="text-gray-300">
                💬 Questions? We'd love to help!
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} DataShorts. Made with ❤️ for data professionals.
          </p>
          
          <div className="flex items-center gap-6">
            <Link href="#" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .stars, .stars2, .stars3 {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: transparent;
        }

        .stars {
          background-image: 
            radial-gradient(2px 2px at 20px 30px, #eee, transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 90px 40px, #eee, transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.5), transparent),
            radial-gradient(2px 2px at 160px 30px, #eee, transparent);
          background-repeat: repeat;
          background-size: 200px 100px;
          animation: zoom 20s infinite;
          opacity: 0.2;
        }

        .stars2 {
          background-image: 
            radial-gradient(1px 1px at 40px 60px, #eee, transparent),
            radial-gradient(1px 1px at 80px 10px, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 120px 50px, #eee, transparent);
          background-repeat: repeat;
          background-size: 250px 120px;
          animation: zoom 25s infinite;
          opacity: 0.15;
        }

        .stars3 {
          background-image: 
            radial-gradient(1px 1px at 60px 20px, #eee, transparent),
            radial-gradient(1px 1px at 100px 80px, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 140px 40px, #eee, transparent);
          background-repeat: repeat;
          background-size: 300px 150px;
          animation: zoom 30s infinite;
          opacity: 0.1;
        }

        @keyframes zoom {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </footer>
  )
}