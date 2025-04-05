import { grokClient } from '@/app/lib/clients';
import { orchestrator } from './orchestrator';

export const taskManager = async function taskManager(messages) {
  const systemPrompt = {
    role: 'system',
    content: `You are an AI task manager that determines the next action based on user input and database context.
    
Your role is to analyze the user's request along with the provided database schema and sample data context to return a JSON object with the following structure:
{
  "next": string,    // The next action to take: "inquire" | "visualize" | "analyze" | "multi"
  "reason": string,  // Brief explanation of why this action was chosen
  "requiresMultiAgent": boolean  // Whether the query requires multiple agents
}

Decision Logic:
1. If the request needs clarification or is too vague:
   { "next": "inquire", "reason": "Need more specific information about...", "requiresMultiAgent": false }

2. If the request involves data visualization or trends:
   { "next": "visualize", "reason": "User requested visual representation of...", "requiresMultiAgent": false }

3. For all other data analysis, insights, or information requests:
   { "next": "analyze", "reason": "User requested analysis of...", "requiresMultiAgent": false }

4. If the request requires multiple operations (e.g., "show me sales trends and analyze customer satisfaction"):
   { "next": "multi", "reason": "Request requires multiple operations", "requiresMultiAgent": true }

Consider the provided database schema and sample data when making decisions:
- Check if requested columns/tables exist in the schema
- Verify if sample data supports the requested analysis
- Request clarification if the query cannot be mapped to available data
- Look for keywords indicating multiple operations (e.g., "and", "also", "while", "along with")

Examples:
- "Show me sales trends": { "next": "visualize", "reason": "User requested visual trend analysis of sales data", "requiresMultiAgent": false }
- "What's our revenue": { "next": "analyze", "reason": "User requested revenue analysis from available data", "requiresMultiAgent": false }
- "Compare departments": { "next": "analyze", "reason": "User requested comparative analysis between departments", "requiresMultiAgent": false }
- "Growth rate": { "next": "inquire", "reason": "Need to clarify timeframe and specific metrics for growth calculation", "requiresMultiAgent": false }
- "Show me sales trends and analyze customer satisfaction": { "next": "multi", "reason": "Request requires visualization and analysis", "requiresMultiAgent": true }

Return JSON format.`
  };

  try {
    const fallbackResponse = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [systemPrompt, ...messages],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });
    
    const result = JSON.parse(fallbackResponse.choices[0].message.content);
    
    // If multi-agent is required, get the orchestration plan
    if (result.requiresMultiAgent) {
      const orchestrationPlan = await orchestrator(messages);
      return {
        ...result,
        orchestrationPlan
      };
    }
    
    return result;
  } catch (error) {
    console.error("Error in task manager:", error);
    
    return {
      next: "analyze",
      reason: "Defaulting to analysis due to error in task determination",
      requiresMultiAgent: false
    };
  }
};