import { db } from '@/configs/db'
import { users } from '@/configs/schema'
import { eq } from 'drizzle-orm'

/**
 * Deduct credits from user's account
 * @param userId - The user's clerk_id
 * @param creditsToDeduct - Number of credits to deduct (default: 1)
 * @returns Promise<boolean> - true if successful, false if insufficient credits
 */
export async function deductCredits(userId: string, creditsToDeduct: number = 1): Promise<boolean> {
    try {

        const [user] = await db
            .select({ credits: users.credits })
            .from(users)
            .where(eq(users.clerk_id, userId))

        if (!user || user.credits < creditsToDeduct) {
            return false
        }


        await db
            .update(users)
            .set({ 
                credits: user.credits - creditsToDeduct 
            })
            .where(eq(users.clerk_id, userId))

        return true 
    } catch (error) {
        console.error('Error deducting credits:', error)
        return false
    }
}

/**
 * Get user's current credit balance
 * @param userId - The user's clerk_id
 * @returns Promise<number> - Current credit balance
 */
export async function getUserCredits(userId: string): Promise<number> {
    try {
        const [user] = await db
            .select({ credits: users.credits })
            .from(users)
            .where(eq(users.clerk_id, userId))

        return user?.credits || 0
    } catch (error) {
        console.error('Error getting user credits:', error)
        return 0
    }
}

/**
 * Check if user has enough credits
 * @param userId - The user's clerk_id
 * @param requiredCredits - Number of credits required (default: 1)
 * @returns Promise<boolean> - true if user has enough credits
 */
export async function hasEnoughCredits(userId: string, requiredCredits: number = 1): Promise<boolean> {
    const currentCredits = await getUserCredits(userId)
    return currentCredits >= requiredCredits
}
