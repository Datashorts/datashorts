import { getAnyPool } from './pool';
import { RowDataPacket } from 'mysql2';

export interface QueryResult {
  success: boolean;
  rows?: any[];
  rowCount?: number;
  error?: string;
}

export async function executeSQLQuery(connectionId: string, sqlQuery: string): Promise<QueryResult> {
  try {
    console.log(`Executing SQL query for connection ${connectionId}`);
    
    const poolInfo = await getAnyPool(connectionId);
    if (!poolInfo) {
      throw new Error('No pool available for this connection');
    }

    const { pool, type } = poolInfo;

    if (type === 'postgres') {
      // PostgreSQL query execution
      const result = await pool.query(sqlQuery);
      console.log('PostgreSQL query executed successfully');
      
      return {
        success: true,
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } else if (type === 'mysql') {
      // MySQL query execution
      const mysqlPool = pool as any; // Type assertion for MySQL pool
      const [rows, fields] = await mysqlPool.execute(sqlQuery);
      console.log('MySQL query executed successfully');
      
      // Handle different MySQL result types
      if (Array.isArray(rows)) {
        return {
          success: true,
          rows: rows as RowDataPacket[],
          rowCount: rows.length
        };
      } else {
        // For INSERT, UPDATE, DELETE queries
        return {
          success: true,
          rows: [],
          rowCount: (rows as any).affectedRows || 0
        };
      }
    } else {
      throw new Error(`Unsupported database type: ${type}`);
    }
  } catch (error) {
    console.error('Error executing SQL query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Helper function to validate and sanitize queries
export function validateQuery(query: string, dbType: 'postgres' | 'mysql'): { valid: boolean; error?: string } {
  // Basic validation
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }

  // Remove comments and trim
  const cleanQuery = query
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .trim();

  // Check for dangerous operations (customize based on your security requirements)
  const dangerousPatterns = [
    /DROP\s+DATABASE/i,
    /CREATE\s+DATABASE/i,
    /ALTER\s+DATABASE/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cleanQuery)) {
      return { valid: false, error: 'This operation is not allowed' };
    }
  }

  // Database-specific validations
  if (dbType === 'mysql') {
    // MySQL-specific validations
    // Check for PostgreSQL-specific syntax that won't work in MySQL
    if (/\$\d+/.test(cleanQuery)) {
      return { valid: false, error: 'PostgreSQL-style placeholders ($1, $2, etc.) are not supported in MySQL' };
    }
  } else if (dbType === 'postgres') {
    // PostgreSQL-specific validations
    // Check for MySQL-specific syntax that won't work in PostgreSQL
    if (/`/.test(cleanQuery)) {
      return { valid: false, error: 'MySQL-style backticks are not supported in PostgreSQL. Use double quotes instead.' };
    }
  }

  return { valid: true };
}