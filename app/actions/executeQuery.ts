'use server'

import { executeSQLQuery } from '@/app/lib/db/executeQuery'

export async function executeQuery(connectionId: string, sqlQuery: string) {
  try {
    const result = await executeSQLQuery(connectionId, sqlQuery)
    return { success: true, data: result }
  } catch (error) {
    console.error('Error executing query:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to execute query' 
    }
  }
} 