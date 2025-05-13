import { grokClient } from '@/app/lib/clients';

interface SchemaTable {
  tableName: string;
  columns: string;
  score: number;
}

interface TaskManagerResponse {
  next: 'researcher' | 'visualizer';
  reason: string;
}

export async function taskManager(userQuery: string, reconstructedSchema: SchemaTable[]): Promise<TaskManagerResponse> {
  const systemPrompt = {
    role: 'system',
    content: `You are an AI task manager that determines whether a user's query should be handled by a researcher or visualizer agent.

Your role is to analyze the user's request along with the provided database schema to return a JSON object with the following structure:
{
  "next": string,    // The next action to take: "researcher" | "visualizer"
  "reason": string   // Brief explanation of why this action was chosen
}

Decision Logic:
1. Route to visualizer if the request involves:
   - Data visualization
   - Charts, graphs, or plots
   - Trends over time
   - Comparisons that would benefit from visual representation
   - Distribution analysis
   - Spatial data
   - Pattern recognition
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

Return JSON format.`
  };

  try {
    const prompt = `User Query: ${userQuery}

Database Schema:
${reconstructedSchema.map(table => `
Table: "${table.tableName}"
Columns: ${table.columns}
`).join('\n')}`;

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

    const result = JSON.parse(response.choices[0].message.content);
    return result as TaskManagerResponse;
  } catch (error) {
    console.error('Error in task manager:', error);
    // Default to researcher if there's an error
    return {
      next: 'researcher',
      reason: 'Defaulting to researcher due to error in task determination'
    };
  }
} 