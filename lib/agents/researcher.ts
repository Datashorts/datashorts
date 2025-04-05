import { grokClient } from '@/app/lib/clients';
export const researcher = async function researcher(messages) {
  // Check if it's a simple data query
  const userMessage = messages[messages.length - 1].content.toLowerCase();
  const isSimpleQuery = userMessage.includes('group') || 
                       userMessage.includes('count') || 
                       userMessage.includes('show') || 
                       userMessage.includes('list') || 
                       userMessage.includes('tell') ||
                       userMessage.includes('how many') ||
                       userMessage.includes('what is') ||
                       userMessage.includes('describe');

  const systemPrompt = {
    role: 'system',
    content: `You are a data analyst that provides direct answers to data queries. Return results in this strict JSON format:
    {
      "summary": string,
      "details": string[],
      "metrics": {
        [key: string]: number | string
      }
    }
    
    For simple questions like "how many tables are there" or "what is the schema", provide a direct answer.
    Focus on providing clear, concise information without visualizations.
    
    Return JSON format.`
  };

  try {
    // Use standard OpenAI client instead of Instructor for now
    const fallbackResponse = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [systemPrompt, ...messages],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });
    
    return fallbackResponse.choices[0].message.content;
  } catch (error) {
    console.error("Error in researcher agent:", error);
    
    // Return a simple error response in the expected format
    return JSON.stringify({
      summary: "Error processing your request",
      details: ["There was an error processing your request. Please try again."],
      metrics: {}
    });
  }
};