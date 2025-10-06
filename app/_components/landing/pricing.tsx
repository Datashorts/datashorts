"use client"

import React, { useRef, useState, useEffect } from "react"
import { Check, X, Globe, MapPin, Star, Zap, Shield, Sparkles } from "lucide-react"
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion"

interface Benefit {
  text: string
  checked: boolean
}

interface PriceCardProps {
  tier: string
  price: string
  originalPrice?: string
  bestFor: string
  CTA: React.ReactNode
  benefits: Benefit[]
  priceId: string
  isPopular?: boolean
  savings?: string
}

// 3D Tilt constants
const ROTATION_RANGE = 20
const HALF_ROTATION_RANGE = ROTATION_RANGE / 2

// Function to detect user's location
const detectLocation = async (): Promise<'india' | 'global'> => {
  try {
    const response = await fetch('https://ipapi.co/json/')
    const data = await response.json()
    
    if (data.country_code === 'IN') {
      return 'india'
    }
    
    return 'global'
  } catch (error) {
    console.error('Error detecting location:', error)
    return 'global'
  }
}

// Alternative: Use timezone to detect location
const detectLocationByTimezone = (): 'india' | 'global' => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  
  if (timezone === 'Asia/Kolkata' || timezone === 'Asia/Calcutta') {
    return 'india'
  }
  
  return 'global'
}

export default function Pricing() {
  const [userLocation, setUserLocation] = useState<'india' | 'global' | 'loading'>('loading')

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await detectLocation()
        setUserLocation(location)
      } catch (error) {
        const fallbackLocation = detectLocationByTimezone()
        setUserLocation(fallbackLocation)
      }
    }

    getUserLocation()
  }, [])

  const handleSubscription = async (priceId: string) => {
    try {
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId })
      });
      
      const data = await response.json();
      if (data.success) {
        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          const options = {
            key: data.key,
            amount: data.order.amount,
            currency: data.order.currency,
            name: 'DataShorts',
            description: 'DataShorts Pro Subscription',
            image: '/favicon.ico',
            order_id: data.order.id,
            prefill: {
              name: data.user.name,
              email: data.user.email,
            },
            theme: {
              color: '#3399cc',
            },
            callback_url: `${window.location.origin}/success?order_id=${data.order.id}`,
            handler: function (response: any) {
              // Redirect to success page immediately after payment
              window.location.href = `/success?order_id=${data.order.id}&payment_id=${response.razorpay_payment_id}`;
            },
            modal: {
              ondismiss: function() {
                console.log('Payment modal closed');
              }
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        };
        document.body.appendChild(script);
      } else {
        console.error('Error creating order:', data.error);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  }

  const getPricingData = () => {
    if (userLocation === 'india') {
      return {
        tier: "DataShorts Pro",
        price: "₹149",
        originalPrice: "₹299",
        bestFor: "Special pricing for India",
        priceId: "india_149_inr", // Custom identifier for India pricing
        isPopular: true,
        savings: "50% OFF",
        locationIcon: <MapPin className="w-5 h-5" />,
        locationText: "🇮🇳 India Special",
        benefits: [
          { text: "Unlimited natural language queries", checked: true },
          { text: "All visualization types (charts, graphs, tables)", checked: true },
          { text: "Multiple database connections", checked: true },
          { text: "Priority email & chat support", checked: true },
          { text: "Advanced analytics & insights", checked: true },
          { text: "Export to Excel, CSV, PDF, JSON", checked: true },
          { text: "Custom dashboards & bookmarks", checked: true },
          { text: "Real-time collaboration", checked: true },
        ]
      }
    } else {
      return {
        tier: "DataShorts Pro",
        price: "$6.49",
        originalPrice: "$12.99",
        bestFor: "For users worldwide",
        priceId: "global_649_usd", // Custom identifier for Global pricing
        isPopular: true,
        savings: "50% OFF",
        locationIcon: <Globe className="w-5 h-5" />,
        locationText: "🌍 Global Pricing",
        benefits: [
          { text: "Unlimited natural language queries", checked: true },
          { text: "All visualization types (charts, graphs, tables)", checked: true },
          { text: "Multiple database connections", checked: true },
          { text: "Priority email & chat support", checked: true },
          { text: "Advanced analytics & insights", checked: true },
          { text: "Export to Excel, CSV, PDF, JSON", checked: true },
          { text: "Custom dashboards & bookmarks", checked: true },
          { text: "Real-time collaboration", checked: true },
        ]
      }
    }
  }

  const pricingData = getPricingData()

  return (
    <section className="relative py-20 bg-black overflow-hidden" id="pricing">
      {/* Enhanced Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Dynamic Background Gradients */}
      <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl opacity-70 animate-pulse" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl opacity-70 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-teal-500/5 blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 container mx-auto max-w-7xl px-4 md:px-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">Limited Time Offer</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-bold mb-6 text-white"
          >
            Simple <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">Pricing</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-300 max-w-3xl mx-auto"
          >
            {userLocation === 'loading' 
              ? "Loading your personalized pricing..."
              : "Transform your data workflow with our powerful AI-driven platform. Start chatting with your database today."
            }
          </motion.p>
        </div>

        {userLocation === 'loading' ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Detecting your location for personalized pricing...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center" style={{ perspective: '1000px' }}>
            
            {/* Left Side - Features Highlight */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-4">
                {pricingData.locationIcon}
                <span className="text-blue-400 font-medium">{pricingData.locationText}</span>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-6">What you get:</h3>
              
              <div className="space-y-4">
                <FeatureHighlight
                  icon={<Zap className="w-5 h-5" />}
                  title="Lightning Fast"
                  description="Get insights from your database in seconds, not hours"
                />
                <FeatureHighlight
                  icon={<Shield className="w-5 h-5" />}
                  title="Secure & Private"
                  description="Your data never leaves your servers. Enterprise-grade security"
                />
                <FeatureHighlight
                  icon={<Star className="w-5 h-5" />}
                  title="No SQL Required"
                  description="Ask questions in plain English and get beautiful visualizations"
                />
              </div>


            </motion.div>

            {/* Center - Main Pricing Card */}
            <div className="flex justify-center">
              <PriceCard
                {...pricingData}
                CTA={
                  <button 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-4 rounded-lg transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-blue-500/25 active:scale-95 hover:scale-102"
                    onClick={() => handleSubscription(pricingData.priceId)}
                  >
                    Get Started - {pricingData.price}
                  </button>
                }
              />
            </div>
          </div>
        )}

        {/* Location Toggle */}
        {userLocation !== 'loading' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-gray-400 text-sm mb-4">
              Pricing shown for your location. Want to see other regions? 
            </p>
            <div className="inline-flex gap-2 bg-white/5 backdrop-blur-sm rounded-lg p-1">
              <button
                onClick={() => setUserLocation('india')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  userLocation === 'india' 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                🇮🇳 India (₹149)
              </button>
              <button
                onClick={() => setUserLocation('global')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  userLocation === 'global' 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                🌍 Global ($6.49)
              </button>
            </div>
          </motion.div>
        )}

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h3 className="text-3xl font-bold text-white mb-12">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <FAQItem
              question="Can I cancel anytime?"
              answer="Yes, you can cancel your subscription at any time with no cancellation fees. Your access continues until the end of your billing period."
            />
            <FAQItem
              question="Do you offer refunds?"
              answer="Yes, we offer refunds for unused portions of your subscription. Contact our support team for assistance."
            />
            <FAQItem
              question="What databases do you support?"
              answer="We currently support PostgreSQL and MongoDB, with MySQL, SQLite, and other popular databases coming soon."
            />
            <FAQItem
              question="Is my data secure?"
              answer="Absolutely. We use enterprise-grade encryption and never store your actual data. Your connection strings are encrypted and your queries are processed securely."
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function PriceCard({ tier, price, originalPrice, bestFor, CTA, benefits, isPopular, savings }: Omit<PriceCardProps, 'priceId'>) {
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
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      viewport={{ once: true }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
        transform,
      }}
      className="relative group cursor-pointer max-w-sm w-full"
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
            <Star className="w-4 h-4 fill-current" />
            MOST POPULAR
          </div>
        </div>
      )}

      {/* Savings badge */}
      {savings && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold rotate-12">
            {savings}
          </div>
        </div>
      )}

      <div 
        className="bg-black/60 border-2 border-blue-500/30 backdrop-blur-sm p-8 rounded-3xl h-full hover:bg-black/80 hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden shadow-2xl"
        style={{
          transform: "translateZ(20px)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Enhanced gradient backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-teal-500/20 opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        <div 
          className="relative z-10"
          style={{
            transform: "translateZ(10px)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Header */}
          <div className="text-center border-b border-white/20 pb-8 mb-8">
            <h3 className="text-3xl font-bold text-white mb-4">{tier}</h3>
            
            <div className="mb-4">
              {originalPrice && (
                <div className="text-lg text-gray-400 line-through mb-1">{originalPrice}</div>
              )}
              <span className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{price}</span>
              <span className="text-gray-300 ml-2">/month</span>
            </div>
            
            <p className="text-blue-200 font-medium">{bestFor}</p>
          </div>

          {/* Benefits */}
          <div className="space-y-4 mb-8">
            {benefits.map((benefit, index) => (
              <Benefit key={index} text={benefit.text} checked={benefit.checked} />
            ))}
          </div>

          {/* CTA */}
          <div className="mt-auto">
            {CTA}
          </div>

          {/* Trust indicators */}
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield className="w-3 h-3" />
              <span>Secure SSL • Cancel Anytime</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function FeatureHighlight({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
      <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-gray-300 text-sm">{description}</p>
      </div>
    </div>
  )
}

function StatCard({ number, label, icon }: { number: string; label: string; icon: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white mb-1">{number}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="text-left bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-white/10">
      <h4 className="font-semibold text-white mb-3">{question}</h4>
      <p className="text-gray-300 text-sm leading-relaxed">{answer}</p>
    </div>
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
      <span className="text-gray-200 text-sm">{text}</span>
    </div>
  )
}
