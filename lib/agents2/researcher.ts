import { grokClient } from '@/app/lib/clients';
import { executeSQLQuery } from '@/app/lib/db/executeQuery';
import { generateSQLQuery } from '@/app/actions/pipeline2Query';

interface SchemaTable {
  tableName: string;
  columns: string;
  score: number;
}

interface QueryResult {
  success: boolean;
  rows: any[];
  rowCount: number;
  error?: string;
}

interface ResearcherResponse {
  summary: string;
  details: string[];
  metrics: {
    [key: string]: number | string;
  };
  sqlQuery?: string;
  queryResult?: QueryResult;
}

export async function researcher(
  userQuery: string,
  reconstructedSchema: SchemaTable[],
  connectionId: string
): Promise<ResearcherResponse> {
  console.log('\n=== Researcher Agent Started ===');
  console.log('User Query:', userQuery);
  console.log('Connection ID:', connectionId);
  console.log('Schema Tables:', JSON.stringify(reconstructedSchema, null, 2));

  const systemPrompt = {
    role: 'system',
    content: `You are a data analyst that provides direct answers to data queries. Return results in this strict JSON format:
{
  "summary": string,    // A concise summary of the analysis
  "details": string[],  // Array of detailed insights and observations
  "metrics": {         // Key metrics and their values
    [key: string]: number | string
  }
}

Guidelines:
1. For simple questions:
   - Provide direct, factual answers
   - Focus on specific numbers and values
   - Keep explanations brief and clear

2. For complex analysis:
   - Break down the analysis into clear points
   - Highlight key trends and patterns
   - Provide context for the numbers
   - Explain any significant findings

3. For metrics:
   - Include relevant numerical values
   - Add percentages where appropriate
   - Include time periods if relevant
   - Format numbers appropriately

4. For details:
   - Each point should be a complete thought
   - Focus on actionable insights
   - Explain the significance of findings
   - Connect related data points

Consider the provided database schema and query results when making your analysis:
- Verify data accuracy
- Check for any anomalies
- Consider data relationships
- Look for patterns and trends

Return JSON format.`
  };

  try {
    console.log('\n--- Generating SQL Query ---');
    const sqlQuery = await generateSQLQuery(reconstructedSchema, userQuery);
    console.log('Generated SQL Query:', sqlQuery);

    console.log('\n--- Executing SQL Query ---');
    const queryResult = await executeSQLQuery(connectionId, sqlQuery);
    console.log('SQL Query Execution Result:', JSON.stringify(queryResult, null, 2));

    if (!queryResult.success) {
      console.error('SQL Query Execution Failed:', queryResult.error);
      throw new Error(queryResult.error || 'Failed to execute SQL query');
    }

    console.log('\n--- Preparing Analysis Prompt ---');
    const prompt = `User Query: ${userQuery}

Database Schema:
${reconstructedSchema.map(table => `
Table: "${table.tableName}"
Columns: ${table.columns}
`).join('\n')}

Query Results:
${JSON.stringify(queryResult, null, 2)}`;

    console.log('\n--- Sending to Grok for Analysis ---');
    const response = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [
        systemPrompt,
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    console.log('\n--- Processing Grok Response ---');
    const result = JSON.parse(response.choices[0].message.content);
    console.log('Analysis Result:', JSON.stringify(result, null, 2));

    const finalResponse = {
      ...result,
      sqlQuery,
      queryResult
    } as ResearcherResponse;

    console.log('\n=== Researcher Agent Completed ===');
    console.log('Final Response:', JSON.stringify(finalResponse, null, 2));

    return finalResponse;
  } catch (error) {
    console.error('\n=== Researcher Agent Error ===');
    console.error('Error Details:', error);
    // Return a basic response in case of error
    const errorResponse = {
      summary: 'Unable to complete analysis due to an error',
      details: ['Please try rephrasing your query or try again later'],
      metrics: {
        error: 'Analysis failed'
      }
    };
    console.log('Error Response:', JSON.stringify(errorResponse, null, 2));
    return errorResponse;
  }
} 