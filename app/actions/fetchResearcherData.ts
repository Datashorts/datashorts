'use server'

import { researcher } from '@/lib/agents2/researcher'

export async function fetchResearcherData(
  userQuery: string,
  reconstructedSchema: any[],
  connectionId: string
) {
  try {
    const result = await researcher(userQuery, reconstructedSchema, connectionId)
    return { success: true, data: result }
  } catch (error) {
    console.error('Error fetching researcher data:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch data' 
    }
  }
} 