'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, MapPin, Globe, Zap, Shield, Star, Crown, Rocket } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface Benefit {
  text: string;
  checked: boolean;
}

interface PriceCardProps {
  tier: string;
  price: string;
  originalPrice?: string;
  bestFor: string;
  priceId: string;
  isPopular?: boolean;
  savings?: string;
  locationIcon: React.ReactNode;
  locationText: string;
  benefits: Benefit[];
  onPayment: (priceId: string) => void;
  loading: boolean;
}

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

export default function PaymentsPage() {
  const { user } = useUser();
  const [userLocation, setUserLocation] = useState<'india' | 'global' | 'loading'>('loading');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await detectLocation();
        setUserLocation(location);
      } catch (error) {
        const fallbackLocation = detectLocationByTimezone();
        setUserLocation(fallbackLocation);
      }
    }

    getUserLocation();
  }, []);

  const handlePayment = async (priceId: string) => {
    if (!user) {
      alert('Please sign in to make a payment');
      return;
    }

    setLoading(priceId);
    
    try {
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
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
                setLoading(null);
              }
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        };
        document.body.appendChild(script);
      } else {
        console.error('Error creating order:', data.error);
        alert('Error creating payment order: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Error creating payment session: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(null);
    }
  };

  const getPricingData = () => {
    if (userLocation === 'india') {
      return {
        tier: "DataShorts Pro",
        price: "₹149",
        originalPrice: "₹299",
        bestFor: "Special pricing for India",
        priceId: "india_149_inr",
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
      };
    } else {
      return {
        tier: "DataShorts Pro",
        price: "$6.49",
        originalPrice: "$12.99",
        bestFor: "For users worldwide",
        priceId: "global_649_usd",
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
      };
    }
  };

  const pricingData = getPricingData();

  if (userLocation === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your personalized pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
            Choose Your <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">Plan</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Get 150 credits to start chatting with your database. No subscription required - pay once and use your credits.
          </p>
          
          {/* Location indicator */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
            {pricingData.locationIcon}
            <span className="text-blue-400 font-medium">{pricingData.locationText}</span>
          </div>
        </div>

        {/* Main pricing card */}
        <div className="flex justify-center mb-12">
          <PriceCard
            {...pricingData}
            onPayment={handlePayment}
            loading={loading === pricingData.priceId}
          />
        </div>

        {/* Features section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Lightning Fast"
            description="Get insights from your database in seconds, not hours"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Secure & Private"
            description="Your data never leaves your servers. Enterprise-grade security"
          />
          <FeatureCard
            icon={<Star className="w-8 h-8" />}
            title="No SQL Required"
            description="Ask questions in plain English and get beautiful visualizations"
          />
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FAQItem
              question="How many queries can I make with 150 credits?"
              answer="Each database query costs 1 credit, so 150 credits = 150 queries. That's enough for most users for several weeks or months."
            />
            <FAQItem
              question="What happens when I run out of credits?"
              answer="You can purchase more credits anytime. Your data and connections are saved, so you can continue right where you left off."
            />
            <FAQItem
              question="Do you offer refunds?"
              answer="Yes, we offer refunds for unused credits. Contact our support team for assistance with any billing questions."
            />
            <FAQItem
              question="Is my data secure?"
              answer="Absolutely. We use enterprise-grade encryption and never store your actual data. Your connection strings are encrypted and your queries are processed securely."
            />
          </div>
        </div>

        {/* Location toggle */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-sm mb-4">
            Want to see pricing for other regions? 
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
        </div>
      </div>
    </div>
  );
}

function PriceCard({ 
  tier, 
  price, 
  originalPrice, 
  bestFor, 
  priceId, 
  isPopular, 
  savings, 
  locationIcon, 
  locationText, 
  benefits, 
  onPayment, 
  loading 
}: PriceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl"
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
            <Crown className="w-4 h-4 fill-current" />
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

      <div className="text-center">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {locationIcon}
            <span className="text-blue-400 font-medium">{locationText}</span>
          </div>
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

        {/* Payment Button */}
        <button
          onClick={() => onPayment(priceId)}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-4 rounded-lg transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-blue-500/25 active:scale-95 hover:scale-102 disabled:scale-100"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </div>
          ) : (
            `Get Started - ${price}`
          )}
        </button>

        {/* Trust indicators */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield className="w-3 h-3" />
            <span>Secure Payment • 150 Credits • Cancel Anytime</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
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
          <Check className="w-3 h-3 text-gray-500" />
        </div>
      )}
      <span className="text-gray-200 text-sm">{text}</span>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-white/10 text-center">
      <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400 flex items-center justify-center w-16 h-16 mx-auto mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-300 text-sm">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-white/10">
      <h4 className="font-semibold text-white mb-3">{question}</h4>
      <p className="text-gray-300 text-sm leading-relaxed">{answer}</p>
    </div>
  );
}
