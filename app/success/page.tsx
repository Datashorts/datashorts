"use client"

import Link from "next/link";
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id');
  const [creditsAdded, setCreditsAdded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const addCredits = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/stripe/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId }),
        });

        const data = await response.json();
        
        if (data.success) {
          setCreditsAdded(true);
        } else {
          console.error('Failed to add credits:', data.error);
        }
      } catch (error) {
        console.error('Error adding credits:', error);
      } finally {
        setLoading(false);
      }
    };

    addCredits();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-gray-300 mb-4">
            Thank you for your purchase. {loading ? 'Processing...' : '150 credits have been added to your account.'}
          </p>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
            <p className="text-green-400 text-sm">
              {loading ? (
                <>⏳ Processing payment...</>
              ) : creditsAdded ? (
                <>✅ Credits added successfully<br/>💳 Payment verified and processed</>
              ) : (
                <>❌ Error adding credits. Please contact support.</>
              )}
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/dashboard"
            className="block w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg transition-all duration-300 font-semibold"
          >
            Go to Dashboard
          </Link>
          
          <Link 
            href="/"
            className="block w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-lg transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
