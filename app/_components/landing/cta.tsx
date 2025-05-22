"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Zap, TrendingUp, Users, CheckCircle } from "lucide-react"
import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

export default function CTA() {
  const { user } = useUser()
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  const handleGetStarted = () => {
    router.push(user ? "/stats" : "#features")
  }

  const stats = [
    { icon: Users, value: "10,000+", label: "Data Professionals" },
    { icon: Zap, value: "5x", label: "Faster Queries" },
    { icon: TrendingUp, value: "99%", label: "Uptime" },
  ]

  const benefits = [
    "No SQL knowledge required",
    "Instant visualizations",
    "Secure data connections",
    "Real-time insights"
  ]

  return (
    <section className="relative py-24 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">Ready to Transform Your Data Experience?</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent"
          >
            Start Chatting with Your Data
            <br />
            <span className="text-blue-400">in Minutes</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-300 max-w-3xl mx-auto mb-12"
          >
            Join thousands of data professionals who've already simplified their workflow. 
            Get instant insights from your database without writing a single line of SQL.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-12"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-full mb-3">
                  <stat.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Main CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-2xl border border-blue-500/20 p-8 md:p-12 overflow-hidden">
            {/* Card background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left Side - Benefits */}
              <div className="space-y-6">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
                  Everything you need to unlock your data's potential
                </h3>
                
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-200">{benefit}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4">
                  <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-green-400 text-sm font-medium">14-day free trial • No credit card required</span>
                  </div>
                </div>
              </div>

              {/* Right Side - CTA */}
              <div className="text-center lg:text-left">
                <div className="space-y-6">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <motion.button
                        className="group relative w-full lg:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-105"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="text-lg">Start Free Trial</span>
                        <motion.div
                          animate={{ x: isHovered ? 5 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </motion.div>
                      </motion.button>
                    </SignInButton>
                  </SignedOut>

                  <SignedIn>
                    <motion.button
                      onClick={handleGetStarted}
                      className="group relative w-full lg:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={() => setIsHovered(false)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="text-lg">Go to Dashboard</span>
                      <motion.div
                        animate={{ x: isHovered ? 5 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </motion.div>
                    </motion.button>
                  </SignedIn>

                  <div className="text-center lg:text-left">
                    <p className="text-sm text-gray-400 mb-4">
                      Trusted by data teams at
                    </p>
                    <div className="flex items-center justify-center lg:justify-start gap-6 opacity-60">
                      <div className="text-gray-500 font-semibold">Microsoft</div>
                      <div className="text-gray-500 font-semibold">Google</div>
                      <div className="text-gray-500 font-semibold">Amazon</div>
                      <div className="text-gray-500 font-semibold">Spotify</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Message */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-gray-400 text-sm">
            Questions? <a href="#contact" className="text-blue-400 hover:text-blue-300 underline">Contact our team</a> for a personalized demo.
          </p>
        </motion.div>
      </div>
    </section>
  )
}