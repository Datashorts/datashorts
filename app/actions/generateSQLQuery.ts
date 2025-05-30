import OpenAI from 'openai';
import { db } from '@/configs/db';
import { dbConnections } from '@/configs/schema';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate SQL query based on database type, schema, and user query
 */
export async function generateSQLQuery(schema: any[], userQuery: string, connectionId: string) {
  try {
    // Get database type from connection
    const [connection] = await db
      .select()
      .from(dbConnections)
      .where(eq(dbConnections.id, Number(connectionId)));

    if (!connection) {
      throw new Error('Connection not found');
    }

    const dbType = connection.dbType;

    // Analyze schema to identify relationships and key columns
    type SchemaAnalysis = {
      [key: string]: {
        columns: Array<{
          name: string;
          type: string;
          isId: boolean;
          isPrimaryKey: boolean;
          isForeignKey: boolean;
          referencesTable: string | null;
          isNameColumn: boolean;
        }>;
        primaryKey: { name: string } | undefined;
        foreignKeys: Array<{ name: string; referencesTable: string | null }>;
        nameColumns: Array<{ name: string }>;
        referencedBy: Array<{ table: string; foreignKey: string }>;
      };
    };

    const schemaAnalysis = schema.reduce<SchemaAnalysis>((acc, table) => {
      const columns = table.columns.split(',').map((col: string) => {
        const [name, type] = col.trim().split('(');
        const colName = name.trim();
        return {
          name: colName,
          type: type ? type.replace(')', '').trim() : '',
          isId: colName.toLowerCase().endsWith('id'),
          isPrimaryKey: colName.toLowerCase() === 'id',
          isForeignKey: colName.toLowerCase().endsWith('id') && colName.toLowerCase() !== 'id',
          referencesTable: colName.toLowerCase().endsWith('id') ? 
            colName.toLowerCase().slice(0, -2).trim() : null,
          isNameColumn: colName.toLowerCase().includes('name') || 
                       colName.toLowerCase().includes('title') ||
                       colName.toLowerCase().includes('description')
        };
      });

      acc[table.tableName] = {
        columns,
        primaryKey: columns.find((col: { isPrimaryKey: boolean }) => col.isPrimaryKey),
        foreignKeys: columns.filter((col: { isForeignKey: boolean }) => col.isForeignKey).map((fk: { name: string; referencesTable: string | null }) => ({
          name: fk.name,
          referencesTable: fk.referencesTable
        })),
        nameColumns: columns.filter((col: { isNameColumn: boolean }) => col.isNameColumn),
        referencedBy: []
      };
      return acc;
    }, {});

    // Populate referencedBy relationships
    Object.entries(schemaAnalysis).forEach(([tableName, analysis]) => {
      analysis.foreignKeys.forEach(fk => {
        const referencedTable = fk.referencesTable;
        if (referencedTable && schemaAnalysis[referencedTable]) {
          schemaAnalysis[referencedTable].referencedBy.push({
            table: tableName,
            foreignKey: fk.name
          });
        }
      });
    });

    // Analyze user query to identify relevant tables and relationships
    const queryAnalysis = {
      mentionedTables: Object.keys(schemaAnalysis).filter(tableName => 
        userQuery.toLowerCase().includes(tableName.toLowerCase())
      ),
      searchTerms: userQuery.toLowerCase().split(/\s+/).filter(term => 
        term.length > 3 && !['what', 'when', 'where', 'which', 'that', 'this', 'have', 'does', 'doesn\'t'].includes(term)
      )
    };

    // Database-specific SQL generation instructions
    const dbSpecificInstructions = dbType === 'mysql' ? `
MySQL-specific rules:
1. Use backticks (\`) around table and column names instead of double quotes
2. Use LIKE for case-insensitive text matching (MySQL is case-insensitive by default)
3. For text searches, use: column LIKE '%term%' to match partial text
4. Use LIMIT instead of FETCH FIRST
5. String comparisons are case-insensitive by default
6. Use DATE_FORMAT() for date formatting
7. Use CONCAT() for string concatenation
8. BOOLEAN type is treated as TINYINT(1)
9. Auto-increment columns use AUTO_INCREMENT
10. Use SHOW TABLES and DESCRIBE for metadata queries
` : `
PostgreSQL-specific rules:
1. Always use double quotes around table and column names
2. Use ILIKE for case-insensitive text matching
3. For text searches, use: column ILIKE '%term%' to match partial text
4. Use LIMIT or FETCH FIRST
5. String comparisons are case-sensitive by default
6. Use TO_CHAR() for date formatting
7. Use || for string concatenation
8. BOOLEAN is a native type
9. Auto-increment columns use SERIAL or IDENTITY
10. Use information_schema for metadata queries
`;

    const prompt = `Given the following database schema analysis and user query, generate a ${dbType.toUpperCase()} SQL query to answer the question.

${dbSpecificInstructions}

General rules:
1. Use appropriate JOINs based on the schema relationships
2. Consider common variations and typos in text searches
3. Consider all relevant table relationships when generating the query
4. Use table aliases for better readability
5. Only include necessary columns in the SELECT clause

Schema Analysis:
${Object.entries(schemaAnalysis).map(([tableName, analysis]) => `
Table: ${dbType === 'mysql' ? '`' + tableName + '`' : '"' + tableName + '"'}
- Primary Key: ${analysis.primaryKey?.name || 'None'}
- Foreign Keys: ${analysis.foreignKeys.map(fk => `${fk.name} (references ${fk.referencesTable})`).join(', ') || 'None'}
- Referenced By: ${analysis.referencedBy.map(ref => `${ref.table} (via ${ref.foreignKey})`).join(', ') || 'None'}
- Name/Text Columns: ${analysis.nameColumns.map(col => col.name).join(', ') || 'None'}
- All Columns: ${analysis.columns.map(col => `${col.name} (${col.type})`).join(', ')}
`).join('\n')}

Query Analysis:
- Mentioned Tables: ${queryAnalysis.mentionedTables.join(', ') || 'None'}
- Search Terms: ${queryAnalysis.searchTerms.join(', ') || 'None'}

User Query: ${userQuery}

Please generate a ${dbType.toUpperCase()} SQL query that will answer this question. Only return the SQL query without any explanation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a ${dbType.toUpperCase()} SQL expert. Generate only the SQL query without any explanation or additional text. 
Consider the following when generating the query:
1. Use appropriate JOINs based on the schema relationships
2. For text searches, use ${dbType === 'mysql' ? 'LIKE' : 'ILIKE'} with wildcards
3. Consider all possible relationships between tables
4. Use table aliases for better readability
5. Only include necessary columns in the SELECT clause
6. Use the actual table and column names from the schema
7. Consider both direct and indirect relationships between tables
8. Follow ${dbType.toUpperCase()}-specific syntax rules`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 300
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('No response content from OpenAI');
    }

    let sqlQuery = response.choices[0].message.content.trim();
    
    // Clean up the query
    sqlQuery = sqlQuery.replace(/```sql/gi, '').replace(/```/g, '').trim();
    
    // Validate query based on database type
    if (dbType === 'mysql') {
      // Ensure MySQL uses backticks
      if (sqlQuery.includes('"') && !sqlQuery.includes('`')) {
        // Convert PostgreSQL-style quotes to MySQL backticks
        sqlQuery = sqlQuery.replace(/"([^"]+)"/g, '`$1`');
      }
    } else if (dbType === 'postgres') {
      // Ensure PostgreSQL uses double quotes
      if (sqlQuery.includes('`') && !sqlQuery.includes('"')) {
        // Convert MySQL-style backticks to PostgreSQL quotes
        sqlQuery = sqlQuery.replace(/`([^`]+)`/g, '"$1"');
      }
    }

    console.log(`Generated ${dbType.toUpperCase()} SQL query:`, sqlQuery);
    return sqlQuery;
  } catch (error) {
    console.error('Error generating SQL query:', error);
    throw new Error('Failed to generate SQL query');
  }
}