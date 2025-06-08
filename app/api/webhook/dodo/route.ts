import { Webhook } from "standardwebhooks";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { subscriptions, users } from '@/configs/schema';
import { eq } from 'drizzle-orm';

const webhook = new Webhook(process.env.DODO_WEBHOOK_SECRET!);

interface WebhookPayload {
  type: string;
  data: {
    payload_type?: string;
    status?: string;
    subscription_id?: string;
    customer?: {
      email: string;
      customer_id?: string;
      id?: string;
    };
    recurring_pre_tax_amount?: number;
    currency?: string;
    product_id?: string;
    quantity?: number;
    trial_period_days?: number;
    subscription_period_interval?: string;
    payment_frequency_interval?: string;
    subscription_period_count?: number;
    payment_frequency_count?: number;
    next_billing_date?: string;
    previous_billing_date?: string;
    created_at?: string;
    current_period_start?: string;
    current_period_end?: string;
    cancelled_at?: string;
    metadata?: {
      userId?: string;
    } | string;
    payment_link?: string;
  };
}

export async function POST(request: Request) {
  const headersList = await headers();
  
  console.log('=== Webhook Request Received ===');
  console.log('Time:', new Date().toISOString());
  console.log('URL:', request.url);
  console.log('Method:', request.method);
  
  try {
    const rawBody = await request.text();
    console.log('Raw body received, length:', rawBody.length);
    
    const webhookHeaders = {
      "webhook-id": headersList.get("webhook-id") || "",
      "webhook-signature": headersList.get("webhook-signature") || "",
      "webhook-timestamp": headersList.get("webhook-timestamp") || "",
    };
    
    console.log('Webhook headers:', webhookHeaders);
    

    await webhook.verify(rawBody, webhookHeaders);
    console.log("Webhook signature verified successfully");
    
    const payload = JSON.parse(rawBody) as WebhookPayload;
    console.log('Parsed payload:', JSON.stringify(payload, null, 2));
    
    if (!payload.data?.customer?.email) {
      throw new Error("Missing customer email in payload");
    }
    
    const email = payload.data.customer.email;
    const customerId = payload.data.customer.customer_id || payload.data.customer.id;
    

    let userId: string | undefined;
    let user: any = null;
    
    try {

      if (payload.data.metadata) {
        console.log('Raw metadata received:', payload.data.metadata);
        console.log('Metadata type:', typeof payload.data.metadata);
        
        let parsedMetadata: any;
        
        if (typeof payload.data.metadata === 'string') {
          try {
            console.log('Attempting to parse metadata string:', payload.data.metadata);
            parsedMetadata = JSON.parse(payload.data.metadata);
            console.log('Successfully parsed metadata string:', parsedMetadata);
          } catch (error) {
            console.error('Error parsing metadata string:', error);
            console.error('Failed metadata string:', payload.data.metadata);
            parsedMetadata = {};
          }
        } else if (typeof payload.data.metadata === 'object') {
          console.log('Metadata is already an object:', payload.data.metadata);
          parsedMetadata = payload.data.metadata;
        } else {
          console.log('Metadata is neither string nor object, type:', typeof payload.data.metadata);
          parsedMetadata = {};
        }
        
        userId = parsedMetadata.userId;
        console.log('Parsed metadata:', parsedMetadata);
        console.log('Found userId in metadata:', userId);
      } else {
        console.log('No metadata found in payload');
      }


      if (userId) {
        user = await db.query.users.findFirst({
          where: eq(users.clerk_id, userId)
        });
        
        if (user) {
          console.log('Found user by clerk_id:', user.clerk_id);
        } else {
          console.log('User not found by clerk_id:', userId);
        }
      }


      if (!user) {
        console.log('Attempting to find user by email:', email);
        user = await db.query.users.findFirst({
          where: eq(users.email, email)
        });
        
        if (user) {
          console.log('Found user by email:', user.email, 'clerk_id:', user.clerk_id);
          userId = user.clerk_id; 
        } else {
          console.error('User not found by email either:', email);
          

          console.error('Available information:', {
            metadata: payload.data.metadata,
            metadataType: typeof payload.data.metadata,
            customerEmail: payload.data.customer?.email,
            paymentLink: payload.data.payment_link,
            customerId: customerId
          });
          
          throw new Error("User not found by metadata userId or email");
        }
      }

    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }


    if (payload.data.payload_type === "Subscription") {
      console.log('Processing subscription event, status:', payload.data.status);
      
      switch (payload.data.status) {
        case "active":
          console.log('Processing active subscription');
          try {

            await db.insert(subscriptions).values({
              userId: user.clerk_id,
              planType: 'paid',
              customerId: customerId || email,
              subscriptionId: payload.data.subscription_id!,
              status: 'active',
              recurringAmount: payload.data.recurring_pre_tax_amount,
              currency: payload.data.currency,
              productId: payload.data.product_id,
              quantity: payload.data.quantity,
              trialPeriodDays: payload.data.trial_period_days,
              subscriptionPeriodInterval: payload.data.subscription_period_interval,
              paymentFrequencyInterval: payload.data.payment_frequency_interval,
              subscriptionPeriodCount: payload.data.subscription_period_count,
              paymentFrequencyCount: payload.data.payment_frequency_count,
              nextBillingDate: payload.data.next_billing_date ? new Date(payload.data.next_billing_date) : undefined,
              previousBillingDate: payload.data.previous_billing_date ? new Date(payload.data.previous_billing_date) : undefined,
              currentPeriodStart: payload.data.current_period_start ? new Date(payload.data.current_period_start) : new Date(),
              currentPeriodEnd: payload.data.current_period_end ? new Date(payload.data.current_period_end) : undefined,
              createdAt: new Date(),
              updatedAt: new Date()
            }).onConflictDoUpdate({
              target: [subscriptions.subscriptionId],
              set: {
                status: 'active',
                recurringAmount: payload.data.recurring_pre_tax_amount,
                currency: payload.data.currency,
                productId: payload.data.product_id,
                quantity: payload.data.quantity,
                trialPeriodDays: payload.data.trial_period_days,
                subscriptionPeriodInterval: payload.data.subscription_period_interval,
                paymentFrequencyInterval: payload.data.payment_frequency_interval,
                subscriptionPeriodCount: payload.data.subscription_period_count,
                paymentFrequencyCount: payload.data.payment_frequency_count,
                nextBillingDate: payload.data.next_billing_date ? new Date(payload.data.next_billing_date) : undefined,
                previousBillingDate: payload.data.previous_billing_date ? new Date(payload.data.previous_billing_date) : undefined,
                currentPeriodStart: payload.data.current_period_start ? new Date(payload.data.current_period_start) : new Date(),
                currentPeriodEnd: payload.data.current_period_end ? new Date(payload.data.current_period_end) : undefined,
                updatedAt: new Date()
              }
            });
            console.log('Active subscription processed successfully');
          } catch (dbError) {
            console.error('Database error for active subscription:', dbError);
            throw new Error('Failed to update active subscription');
          }
          break;
          
        case "cancelled":
          console.log('Processing cancelled subscription');
          try {

            await db.update(subscriptions)
              .set({
                status: 'cancelled',
                cancelledAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(subscriptions.subscriptionId, payload.data.subscription_id!));
            console.log('Cancelled subscription processed successfully');
          } catch (dbError) {
            console.error('Database error for cancelled subscription:', dbError);
            throw new Error('Failed to update cancelled subscription');
          }
          break;
          
        case "past_due":
          console.log('Processing past_due subscription');
          try {

            await db.update(subscriptions)
              .set({
                status: 'past_due',
                updatedAt: new Date()
              })
              .where(eq(subscriptions.subscriptionId, payload.data.subscription_id!));
            console.log('Past due subscription processed successfully');
          } catch (dbError) {
            console.error('Database error for past_due subscription:', dbError);
            throw new Error('Failed to update past_due subscription');
          }
          break;
          
        default:
          console.log('Processing default subscription update, status:', payload.data.status);
          try {

            await db.update(subscriptions)
              .set({
                status: payload.data.status as any || 'active',
                updatedAt: new Date()
              })
              .where(eq(subscriptions.subscriptionId, payload.data.subscription_id!));
            console.log('Default subscription update processed successfully');
          } catch (dbError) {
            console.error('Database error for default subscription update:', dbError);
            throw new Error('Failed to update subscription');
          }
          break;
      }
    } 

    else if (
      payload.data.payload_type === "Payment" &&
      payload.type === "payment.succeeded" &&
      !payload.data.subscription_id
    ) {
      console.log('Processing one-time payment');
      try {

        await db.insert(subscriptions).values({
          userId: user.clerk_id,
          planType: 'one_time',
          customerId: customerId || email,
          subscriptionId: `onetime_${Date.now()}_${customerId || email}`,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
          createdAt: new Date(),
          updatedAt: new Date()
        }).onConflictDoNothing();
        console.log('One-time payment processed successfully');
      } catch (dbError) {
        console.error('Database error for one-time payment:', dbError);
        throw new Error('Failed to process one-time payment');
      }
    }

    else if (payload.type === "payment.succeeded") {
      console.log('Processing payment.succeeded event');
      try {

        if (payload.data.subscription_id) {
          await db.update(subscriptions)
            .set({
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              updatedAt: new Date()
            })
            .where(eq(subscriptions.subscriptionId, payload.data.subscription_id));
          console.log('Payment succeeded - subscription updated');
        }
      } catch (dbError) {
        console.error('Database error for payment.succeeded:', dbError);
        throw new Error('Failed to update subscription after payment');
      }
    }
    
    console.log('Webhook processed successfully');
    return Response.json(
      { message: "Webhook processed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}