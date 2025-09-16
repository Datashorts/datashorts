import { db } from '@/configs/db'
import { users } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-05-28.basil'
})

export async function POST(req: Request) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') as string
    const webHookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webHookSecret) {
        return new Response('Webhook secret not present or expired buddy', { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(body, signature, webHookSecret)

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const priceId = session.metadata?.priceId


        const creditMap: Record<string, number> = {
            'price_1S7bEoSKyTkuBUG2Pu5stctC': 150, 
            'price_1S7bFGSKyTkuBUG2ekAw27zs': 150  
        }

        const creditsToAdd = creditMap[priceId || ''] || 0

        if (userId && creditsToAdd > 0) {

            const [user] = await db
                .select({ credits: users.credits })
                .from(users)
                .where(eq(users.clerk_id, userId))

            if (user) {

                await db
                    .update(users)
                    .set({ 
                        credits: user.credits + creditsToAdd 
                    })
                    .where(eq(users.clerk_id, userId))
            }
        }
    }

    return new Response('OK', { status: 200 })
}
