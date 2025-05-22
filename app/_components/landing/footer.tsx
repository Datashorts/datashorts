import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-[#121212] py-12">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                <span className="text-blue-500">Data</span>Shorts
              </span>
            </div>
            <p className="text-gray-400 max-w-sm">
              Chat with your database in natural language. No SQL required.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#features" className="text-gray-400 hover:text-blue-500 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-gray-400 hover:text-blue-500 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/stats" className="text-gray-400 hover:text-blue-500 transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Get in Touch</h3>
            <div className="space-y-3">
              <p className="text-gray-400">
                📧 datashorts15@gmail.com
              </p>
              <p className="text-gray-400">
                💬 Questions? We'd love to help!
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} DataShorts. Made with ❤️ for data professionals.
          </p>
          
          <div className="flex items-center gap-6">
            <Link href="#" className="text-sm text-gray-400 hover:text-blue-500 transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-gray-400 hover:text-blue-500 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}