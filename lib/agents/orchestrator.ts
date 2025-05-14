import { grokClient } from '@/app/lib/clients';
import { researcher } from './researcher';
import { visualiser } from './visualiser';
import { inquire } from './inquire';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

interface AgentTask {
  agentType: 'researcher' | 'visualize' | 'inquire';
  query: string;
  priority: number;
}

interface OrchestratorResponse {
  tasks: AgentTask[];
  combinedResponse: {
    summary: string;
    details: string[];
    visualizations?: any[];
    metrics?: Record<string, any>;
  };
}

export const orchestrator = async function orchestrator(messages: ChatCompletionMessageParam[]): Promise<OrchestratorResponse> {
  const systemPrompt: ChatCompletionMessageParam = {
    role: 'system',
    content: `You are an AI orchestrator that splits complex queries into multiple tasks for different specialized agents.

Your role is to analyze the user's request and break it down into multiple tasks that can be handled by different agents:
- researcher: For data analysis, insights, and information gathering
- visualize: For creating charts, graphs, and visual representations
- inquire: For asking follow-up questions and gathering more information

Return a JSON object with the following structure:
{
  "tasks": [
    {
      "agentType": "researcher" | "visualize" | "inquire",
      "query": "The specific query for this agent",
      "priority": number (1 being highest priority)
    }
  ],
  "combinedResponse": {
    "summary": "A brief summary of what will be done",
    "details": ["Detail 1", "Detail 2", ...],
    "visualizations": [], // Optional array of visualization requests
    "metrics": {} // Optional metrics to track
  }
}

Guidelines:
1. Split complex queries into logical subtasks
2. Assign appropriate agent types based on the task requirements
3. Maintain context and dependencies between tasks
4. Prioritize tasks based on their importance and dependencies
5. Ensure the combined response provides a clear overview of all tasks

Example:
User: "Show me sales trends and analyze customer satisfaction"
Response: {
  "tasks": [
    {
      "agentType": "visualize",
      "query": "Show me sales trends over time",
      "priority": 1
    },
    {
      "agentType": "researcher",
      "query": "Analyze customer satisfaction metrics and trends",
      "priority": 2
    }
  ],
  "combinedResponse": {
    "summary": "Analyzing sales trends and customer satisfaction",
    "details": [
      "Creating visualization of sales trends",
      "Analyzing customer satisfaction metrics"
    ]
  }
}

Return JSON format.`
  };

  try {
    const response = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [systemPrompt, ...messages],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error in orchestrator:", error);
    return {
      tasks: [],
      combinedResponse: {
        summary: "Error processing your request",
        details: ["There was an error processing your request. Please try again."]
      }
    };
  }
};

export const executeTasks = async function executeTasks(tasks: AgentTask[], messages: ChatCompletionMessageParam[]): Promise<OrchestratorResponse> {
  const systemPrompt: ChatCompletionMessageParam = {
    role: 'system',
    content: `You are an AI orchestrator that coordinates multiple agents to complete complex tasks.

Your role is to analyze the user's request and create a plan for executing multiple tasks in sequence or parallel.

Your response should be a JSON object with the following structure:
{
  "orchestrationPlan": {
    "tasks": [
      {
        "agentType": string,  // The type of agent to use
        "query": string,      // The specific query for this task
        "dependencies": string[]  // Optional: IDs of tasks this depends on
      }
    ],
    "combinedResponse": {
      "summary": string,      // Overall summary of the results
      "details": string[]     // Detailed points from each task
    }
  }
}

Guidelines:
1. Break down complex requests into smaller, manageable tasks
2. Consider dependencies between tasks
3. Use appropriate agents for each task type
4. Provide clear instructions for each task
5. Plan how to combine results into a coherent response

Return JSON format.`
  };

  try {
    const response = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [systemPrompt, ...messages],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error in orchestrator:", error);
    return {
      tasks: [],
      combinedResponse: {
        summary: "Error creating orchestration plan",
        details: ["Failed to process the request. Please try again."]
      }
    };
  }
}; 