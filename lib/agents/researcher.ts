import { grokClient } from '@/app/lib/clients';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Type guard to check if content part is text
function isTextContent(part: any): part is { text: string } {
  return part && typeof part.text === 'string';
}

export const researcher = async function researcher(messages: ChatCompletionMessageParam[]) {
  // Check if it's a simple data query
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || !lastMessage.content) {
    throw new Error('No valid message content found');
  }

  // Ensure content is a string
  const content = typeof lastMessage.content === 'string' 
    ? lastMessage.content 
    : Array.isArray(lastMessage.content)
      ? lastMessage.content.map(part => {
          if (typeof part === 'string') return part;
          if (isTextContent(part)) return part.text;
          return '';
        }).join(' ')
      : '';

  if (!content) {
    throw new Error('No valid text content found in message');
  }
  
  const userMessage = content.toLowerCase();
  const isSimpleQuery = userMessage.includes('group') || 
    userMessage.includes('count') || 
    userMessage.includes('sum') || 
    userMessage.includes('average') || 
    userMessage.includes('min') || 
    userMessage.includes('max');

  const systemPrompt: ChatCompletionMessageParam = {
    role: 'system',
    content: `You are a researcher agent that analyzes data and provides insights.

Your role is to analyze the provided database context and user query to generate meaningful insights and analysis.

Your response should be a JSON object with the following structure:
{
  "summary": string,      // A concise summary of the analysis
  "details": string[],    // Detailed points from the analysis
  "metrics": {           // Optional: Key metrics and their values
    "metric1": value1,
    "metric2": value2
  }
}

Guidelines:
1. Focus on providing clear, actionable insights
2. Use appropriate statistical methods when needed
3. Consider trends and patterns in the data
4. Highlight significant findings
5. Provide context for your analysis

Return JSON format.`
  };

  try {
    const response = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [systemPrompt, ...messages],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No content in response');
    }
    
    return JSON.parse(responseContent);
  } catch (error) {
    console.error("Error in researcher:", error);
    return {
      summary: "Error processing your request",
      details: ["There was an error processing your request. Please try again."],
      metrics: {}
    };
  }
};