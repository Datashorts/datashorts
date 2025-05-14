import { grokClient } from '@/app/lib/clients';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

export const inquire = async function inquire(messages: Message[]) {
  const systemPrompt = {
    role: 'system' as const,
    content: `You are an AI assistant that generates follow-up questions to gather necessary details from users.

Your role is to analyze the provided database context and user query to generate relevant follow-up questions that will help gather missing information needed to fulfill the user's request.

Your response should be a JSON object with the following structure:
{
  "question": string,     // The main follow-up question
  "context": string,      // Brief explanation of why this information is needed
  "options": string[],    // 3-4 most relevant suggested options based on the database schema and sample data
  "allowCustomInput": boolean,  // Whether to allow free-form input besides options
  "inputType": string     // Suggested input type: "select", "text", "number", "date"
}

Guidelines:
1. Questions should be specific and focused on gathering missing information
2. Options should be derived from the database schema and sample data when possible
3. Provide context that explains why the information is needed in relation to the user's query
4. Use appropriate input types based on the expected response and data types in the schema
5. Consider the database structure when suggesting options (e.g., use actual column values for filtering)
6. If the user's query is ambiguous, ask for clarification about specific tables or columns
7. If time-based analysis is needed, ask for specific date ranges
8. If aggregation is involved, ask about grouping preferences

Return JSON format.`
  };

  try {

    const fallbackResponse = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [systemPrompt, ...messages],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });
    
    return JSON.parse(fallbackResponse.choices[0].message.content);
  } catch (error) {
    console.error("Error in inquire agent:", error);
    
    // Return a simple error response in the expected format
    return {
      question: "Could you please provide more details?",
      context: "I need more information to process your request correctly.",
      options: ["Yes, I'll provide more details", "Let me rephrase my question", "I need help understanding what information you need"],
      allowCustomInput: true,
      inputType: "text"
    };
  }
};