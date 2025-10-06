import { db } from '@/configs/db'
import { users } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order details from Razorpay to extract metadata
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.fetch(orderId);
    const userId = order.notes?.userId;
    const priceId = order.notes?.priceId;
    const creditsToAdd = order.notes?.credits || 150; // Default to 150 credits

    if (userId && creditsToAdd > 0) {
      const [user] = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.clerk_id, userId));

      if (user) {
        await db
          .update(users)
          .set({ 
            credits: user.credits + creditsToAdd 
          })
          .where(eq(users.clerk_id, userId));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed and credits added successfully'
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
