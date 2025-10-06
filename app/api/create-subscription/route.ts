import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Razorpay from 'razorpay';


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
    const user = await currentUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { priceId } = await req.json()

    // Map priceId to amount and currency
    const priceMap: Record<string, { amount: number; currency: string }> = {
        'india_149_inr': { amount: 149, currency: 'INR' },
        'global_649_usd': { amount: 649, currency: 'USD' },
        // Legacy Stripe price IDs for backward compatibility
        // 'price_1S7yMkSKyTkuBUG2eeiKydCc': { amount: 149, currency: 'INR' },
        // 'price_1S7bFGSKyTkuBUG2ekAw27zs': { amount: 649, currency: 'USD' },
        // 'price_1S7bEoSKyTkuBUG2Pu5stctC': { amount: 149, currency: 'INR' },
    }

    const priceInfo = priceMap[priceId] || { amount: 149, currency: 'INR' } // Default to India price
    const amount = priceInfo.amount
    const currency = priceInfo.currency

    try {
        // Create order options
        const options = {
            amount: Math.round(amount * 100), // Convert to paise/cents (multiply by 100)
            currency: currency,
            receipt: `rcpt_${Date.now()}`, // Keep under 40 characters
            notes: {
                userId: user.id,
                priceId: priceId,
                credits: 150 // Always 150 credits per purchase
            },
        };

        // Create order using Razorpay API
        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt,
                status: order.status,
            },
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            user: {
                name: user.fullName || 'User',
                email: user.emailAddresses[0]?.emailAddress || '',
            }
        });

    } catch (error) {
        console.error('Razorpay order creation error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to create order',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
