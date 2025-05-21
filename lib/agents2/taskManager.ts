import { grokClient } from '@/app/lib/clients';

type Message = 
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'function'; content: string; name: string };

interface TaskManagerResult {
  next: 'researcher' | 'visualizer' | 'predictive';
  reason: string;
  requiresMultiAgent: boolean;
}

export async function taskManager(
  query: string,
  schema: any[]
): Promise<TaskManagerResult> {
  const systemPrompt: Message = {
    role: 'system',
    content: `You are an AI task manager that determines the next action based on user input and database context.
    
Your role is to analyze the user's request along with the provided database schema and sample data context to return a JSON object with the following structure:
{
  "next": string,    // The next action to take: "researcher" | "visualizer" | "predictive"
  "reason": string,  // Brief explanation of why this action was chosen
  "requiresMultiAgent": boolean  // Whether the query requires multiple agents
}

Decision Logic:
1. Route to "visualizer" if the request involves:
   - Data visualization or trends
   - Charts, graphs, or plots
   - Visual comparisons
   - Pattern visualization
   - Time series analysis that doesn't require prediction
   - Distribution analysis
   Example: "Show me sales trends", "Plot revenue by region", "Visualize customer distribution"

2. Route to "researcher" if the request involves:
   - Direct data analysis
   - Specific information retrieval
   - Calculations or aggregations
   - Text-based insights
   - Complex queries
   - Data relationships
   Example: "What's our total revenue", "Find top 10 customers", "Calculate average order value"

3. Route to "predictive" if the request involves:
   - Future projections or forecasts
   - Trend predictions
   - Estimating future values
   - What-if scenarios
   - Forward-looking analysis
   - Words like "predict", "forecast", "will be", "estimate", "project", "future"
   Example: "Predict next month's sales", "Forecast user growth", "What will revenue be next quarter"

Consider the provided database schema when making decisions:
- Check if requested columns/tables exist in the schema
- Verify if the data structure supports the requested analysis
- Look for keywords indicating the type of analysis needed

Examples:
- "Show me sales trends": { "next": "visualizer", "reason": "User requested visual trend analysis of sales data", "requiresMultiAgent": false }
- "What's our revenue": { "next": "researcher", "reason": "User requested revenue analysis from available data", "requiresMultiAgent": false }
- "Predict next month's sales": { "next": "predictive", "reason": "User requested a forecast of future sales", "requiresMultiAgent": false }
- "Compare departments and predict future growth": { "next": "researcher", "reason": "Request requires analysis and prediction", "requiresMultiAgent": true }

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

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }
    const result = JSON.parse(content);
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