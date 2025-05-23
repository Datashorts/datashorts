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

IMPORTANT: Priority order for routing decisions:

1. Route to "predictive" if the request involves ANY of these keywords (HIGHEST PRIORITY):
   - "predict", "predicted", "prediction", "predictions"
   - "forecast", "forecasting", "forecasts"
   - "future", "will be", "will have", "next month", "next year", "next quarter"
   - "estimate", "estimated", "estimates"
   - "project", "projected", "projections" 
   - "trend analysis", "future trends"
   - "what if", "scenario", "scenarios"
   - Words ending in "predict" (e.g., "predicted sales volume")
   
   Even if visualization is also mentioned, ALWAYS route to predictive first when these keywords are present.
   Example: "Show correlation between pizza size and predicted sales volume as scatter points" → PREDICTIVE (not visualizer)

2. Route to "visualizer" if the request involves visualization BUT NO predictive keywords:
   - Data visualization or trends (without prediction)
   - Charts, graphs, or plots (without forecasting)
   - Visual comparisons (without future analysis)
   - Pattern visualization (current data only)
   - Time series analysis (historical only, no forecasting)
   - Distribution analysis (current data)
   Example: "Show me current sales trends", "Plot historical revenue by region"

3. Route to "researcher" if the request involves:
   - Direct data analysis (current/historical)
   - Specific information retrieval
   - Calculations or aggregations
   - Text-based insights
   - Complex queries (current data)
   - Data relationships (current/historical)
   Example: "What's our total revenue", "Find top 10 customers", "Calculate average order value"

Decision Logic Examples:
- "Predict next month's sales as a bar chart" → PREDICTIVE (has "predict")
- "Show predicted pizza sales by type" → PREDICTIVE (has "predicted") 
- "Forecast delivery trends using line graph" → PREDICTIVE (has "forecast")
- "What will pizza sales look like next quarter as pie chart?" → PREDICTIVE (has "will" + future)
- "Show correlation between pizza size and predicted sales volume as scatter points" → PREDICTIVE (has "predicted")
- "Display historical sales trends as line chart" → VISUALIZER (no prediction keywords)
- "Show current pizza sales by type in bar chart" → VISUALIZER (no prediction keywords)
- "What's our total pizza revenue?" → RESEARCHER (no visualization or prediction)

Consider the provided database schema when making decisions:
- Check if requested columns/tables exist in the schema
- Verify if the data structure supports the requested analysis
- Look for keywords indicating the type of analysis needed

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