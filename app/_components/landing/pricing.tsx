"use client"

import React, { useRef } from "react"
import { Check, X } from "lucide-react"
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion"

interface Benefit {
  text: string
  checked: boolean
}

interface PriceCardProps {
  tier: string
  price: string
  bestFor: string
  CTA: React.ReactNode
  benefits: Benefit[]
}

// 3D Tilt constants
const ROTATION_RANGE = 20
const HALF_ROTATION_RANGE = ROTATION_RANGE / 2

export default function Pricing() {
  return (
    <section className="relative py-20 bg-black overflow-hidden" id="pricing">
      {/* Natural Stars Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Background gradients */}
      <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl opacity-70" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-purple-500/5 blur-3xl opacity-70" />

      <div className="relative z-10 container mx-auto max-w-6xl px-4 md:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Simple <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">Pricing</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Start free and scale with your team. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8" style={{ perspective: '1000px' }}>
          <PriceCard
            tier="Starter"
            price="Free"
            bestFor="Perfect for individuals"
            CTA={
              <button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-lg transition-colors">
                Get Started Free
              </button>
            }
            benefits={[
              { text: "5 queries per day", checked: true },
              { text: "Basic visualizations", checked: true },
              { text: "1 database connection", checked: true },
              { text: "Email support", checked: true },
              { text: "Advanced analytics", checked: false },
              { text: "Priority support", checked: false },
            ]}
          />
          
          <PriceCard
            tier="Pro"
            price="$29/mo"
            bestFor="Best for small teams"
            CTA={
              <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-4 py-2 rounded-lg transition-colors">
                Start 14-Day Free Trial
              </button>
            }
            benefits={[
              { text: "Unlimited queries", checked: true },
              { text: "Advanced visualizations", checked: true },
              { text: "5 database connections", checked: true },
              { text: "Priority email support", checked: true },
              { text: "Advanced analytics", checked: true },
              { text: "Team collaboration", checked: true },
            ]}
          />
          
          <PriceCard
            tier="Enterprise"
            price="Custom"
            bestFor="For large organizations"
            CTA={
              <button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-lg transition-colors">
                Contact Sales
              </button>
            }
            benefits={[
              { text: "Everything in Pro", checked: true },
              { text: "Unlimited databases", checked: true },
              { text: "Custom integrations", checked: true },
              { text: "24/7 phone support", checked: true },
              { text: "SSO & SAML", checked: true },
              { text: "Dedicated success manager", checked: true },
            ]}
          />
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-semibold text-white mb-8">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h4 className="font-medium text-white mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-300 text-sm">Yes, you can cancel your subscription at any time. No questions asked.</p>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-white mb-2">Do you offer refunds?</h4>
              <p className="text-gray-300 text-sm">We offer a 30-day money-back guarantee for all paid plans.</p>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-white mb-2">What databases do you support?</h4>
              <p className="text-gray-300 text-sm">We support PostgreSQL,more databases are coming soon.</p>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-white mb-2">Is my data secure?</h4>
              <p className="text-gray-300 text-sm">Yes, we use enterprise-grade security and never store your actual data.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PriceCard({ tier, price, bestFor, CTA, benefits }: PriceCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const xSpring = useSpring(x, { stiffness: 300, damping: 30 })
  const ySpring = useSpring(y, { stiffness: 300, damping: 30 })
  const transform = useMotionTemplate`rotateX(${xSpring}deg) rotateY(${ySpring}deg)`

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    const mouseX = (e.clientX - rect.left) * ROTATION_RANGE
    const mouseY = (e.clientY - rect.top) * ROTATION_RANGE

    const rX = (mouseY / height - HALF_ROTATION_RANGE) * -1
    const rY = mouseX / width - HALF_ROTATION_RANGE

    x.set(rX)
    y.set(rY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      viewport={{ once: true }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
        transform,
      }}
      className="relative group cursor-pointer"
    >
      <div 
        className="bg-black/40 border border-white/10 backdrop-blur-sm p-8 rounded-2xl h-full hover:bg-black/60 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
        style={{
          transform: "translateZ(20px)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Enhanced gradient background on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Subtle 3D depth shadow */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl -z-10"
          style={{
            transform: "translateZ(-10px)",
          }}
        />
        
        <div 
          className="relative z-10"
          style={{
            transform: "translateZ(10px)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Header */}
          <div className="text-center border-b border-white/10 pb-6 mb-8">
            <h3 
              className="text-2xl font-semibold text-white mb-4"
              style={{ transform: "translateZ(15px)" }}
            >
              {tier}
            </h3>
            <div 
              className="mb-4"
              style={{ transform: "translateZ(10px)" }}
            >
              <span className="text-4xl font-bold text-white">{price}</span>
              {price !== "Free" && price !== "Custom" && (
                <span className="text-gray-400 ml-1">/month</span>
              )}
            </div>
            <p className="text-gray-300 text-sm">{bestFor}</p>
          </div>

          {/* Benefits */}
          <div 
            className="space-y-4 mb-8"
            style={{ transform: "translateZ(5px)" }}
          >
            {benefits.map((benefit, index) => (
              <Benefit key={index} text={benefit.text} checked={benefit.checked} />
            ))}
          </div>

          {/* CTA */}
          <div 
            className="mt-auto"
            style={{ transform: "translateZ(20px)" }}
          >
            {CTA}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function Benefit({ text, checked }: { text: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {checked ? (
        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-white" />
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <X className="w-3 h-3 text-gray-500" />
        </div>
      )}
      <span className="text-gray-300 text-sm">{text}</span>
    </div>
  )
}