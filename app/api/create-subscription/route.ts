import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    const body = await request.json();
    const { metadata } = body;

    if (!metadata?.userId) {
      return NextResponse.json({ error: 'Missing user ID in metadata' }, { status: 400 });
    }

    const response = await fetch(`https://test.dodopayments.com/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
      },
      body: JSON.stringify({
        product_id: 'pdt_ptJEmF0igoMy9Bn63jyax',
        quantity: 1,
        payment_link: true,
        customer: {
          email: body.email || 'customer@example.com', 
          name: body.name || 'Customer Name' 
        },
        metadata: {
          userId: metadata.userId
        },
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        billing: {
          country: 'US', 
          state: 'CA',
          city: 'San Francisco',
          street: '123 Main St',
          zipcode: '94105'
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Dodo API error:', error);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 