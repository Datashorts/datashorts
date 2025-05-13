import { grokClient } from '@/app/lib/clients';

interface TaskManagerResult {
  next: 'researcher' | 'visualizer';
  reason: string;
  requiresMultiAgent: boolean;
}

export async function taskManager(
  query: string,
  schema: any[]
): Promise<TaskManagerResult> {
  const systemPrompt = {
    role: 'system',
    content: `You are an AI task manager that determines the next action based on user input and database context.
    
Your role is to analyze the user's request along with the provided database schema and sample data context to return a JSON object with the following structure:
{
  "next": string,    // The next action to take: "researcher" | "visualizer"
  "reason": string,  // Brief explanation of why this action was chosen
  "requiresMultiAgent": boolean  // Whether the query requires multiple agents
}

Decision Logic:
1. Route to visualizer if the request involves:
   - Data visualization or trends
   - Charts, graphs, or plots
   - Visual comparisons
   - Pattern visualization
   - Time series analysis
   - Distribution analysis
   Example: "Show me sales trends", "Plot revenue by region", "Visualize customer distribution"

2. Route to researcher if the request involves:
   - Direct data analysis
   - Specific information retrieval
   - Calculations or aggregations
   - Text-based insights
   - Complex queries
   - Data relationships
   Example: "What's our total revenue", "Find top 10 customers", "Calculate average order value"

Consider the provided database schema when making decisions:
- Check if requested columns/tables exist in the schema
- Verify if the data structure supports the requested analysis
- Look for keywords indicating visualization needs (e.g., "show", "plot", "visualize", "graph")
- Look for keywords indicating research needs (e.g., "find", "calculate", "what", "how many")

Examples:
- "Show me sales trends": { "next": "visualizer", "reason": "User requested visual trend analysis of sales data", "requiresMultiAgent": false }
- "What's our revenue": { "next": "researcher", "reason": "User requested revenue analysis from available data", "requiresMultiAgent": false }
- "Compare departments": { "next": "researcher", "reason": "User requested comparative analysis between departments", "requiresMultiAgent": false }
- "Show me sales trends and analyze customer satisfaction": { "next": "visualizer", "reason": "Request requires visualization and analysis", "requiresMultiAgent": true }

Return JSON format.`
  };

  try {
    const response = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [
        systemPrompt,
        {
          role: 'user',
          content: `User Query: ${query}

Available Schema:
${schema.map(table => `
Table: "${table.tableName}"
Columns: ${table.columns}
`).join('\n')}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log('Task manager decision:', result);

    return {
      next: result.next,
      reason: result.reason,
      requiresMultiAgent: result.requiresMultiAgent || false
    };
  } catch (error) {
    console.error('Error in task manager:', error);
    // Default to researcher in case of error
    return {
      next: 'researcher',
      reason: 'Error in task management, defaulting to researcher',
      requiresMultiAgent: false
    };
  }
} 