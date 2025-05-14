import { grokClient } from '@/app/lib/clients';
import { researcher } from './researcher';
import { visualiser } from './visualiser';
import { inquire } from './inquire';

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

export const orchestrator = async function orchestrator(messages: any[]): Promise<OrchestratorResponse> {
  const systemPrompt = {
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

    return JSON.parse(response.choices[0].message.content);
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

export const executeTasks = async function executeTasks(tasks: AgentTask[], messages: any[]) {
  const results = [];
  
  // Sort tasks by priority
  const sortedTasks = [...tasks].sort((a, b) => a.priority - b.priority);
  
  // Process tasks in parallel with individual timeouts
  const taskPromises = sortedTasks.map(async (task) => {
    try {
      // Set a timeout for each individual task - longer timeout for visualization tasks
      const timeoutDuration = task.agentType === 'visualize' ? 45000 : 20000;
      
      const taskPromise = new Promise(async (resolve, reject) => {
        try {
          let agentResponse;
          
          switch (task.agentType) {
            case 'researcher':
              agentResponse = await researcher([
                ...messages,
                { role: 'user', content: task.query }
              ]);
              break;
            case 'visualize':
              // For visualization tasks, add a hint to keep responses concise
              const visualizeQuery = `${task.query} (Keep the response concise and focused on the visualization data)`;
              agentResponse = await visualiser([
                ...messages,
                { role: 'user', content: visualizeQuery }
              ]);
              break;
            case 'inquire':
              agentResponse = await inquire([
                ...messages,
                { role: 'user', content: task.query }
              ]);
              break;
            default:
              console.error(`Unknown agent type: ${task.agentType}`);
              agentResponse = {
                type: 'error',
                content: {
                  title: 'Error',
                  summary: `Unknown agent type: ${task.agentType}`,
                  details: ['The requested agent type is not supported.']
                }
              };
          }
          
          resolve({
            agentType: task.agentType,
            query: task.query,
            response: agentResponse
          });
        } catch (error) {
          reject(error);
        }
      });
      
      // Set a timeout for each task
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Task execution timed out for ${task.agentType}`)), timeoutDuration)
      );
      
      // Race between the task and the timeout
      const result = await Promise.race([taskPromise, timeoutPromise]);
      
      // Ensure the response is properly formatted
      let formattedResponse = result.response;
      
      // If the response is a string, try to parse it as JSON
      if (typeof result.response === 'string') {
        try {
          if (result.response.startsWith('{') || result.response.startsWith('[')) {
            formattedResponse = JSON.parse(result.response);
          } else {
            // If it's not JSON, wrap it in a proper structure
            formattedResponse = {
              type: task.agentType,
              content: {
                summary: result.response,
                details: [result.response]
              }
            };
          }
        } catch (e) {
          console.error(`Error parsing response for ${task.agentType}:`, e);
          formattedResponse = {
            type: task.agentType,
            content: {
              summary: result.response,
              details: [result.response]
            }
          };
        }
      }
      
      return {
        agentType: task.agentType,
        query: task.query,
        response: formattedResponse
      };
    } catch (error) {
      console.error(`Error executing task for ${task.agentType}:`, error);
      
      // For visualization tasks that time out, provide a fallback visualization
      if (task.agentType === 'visualize' && error.message.includes('timed out')) {
        console.log(`Providing fallback visualization for timed out task: ${task.query}`);
        return {
          agentType: task.agentType,
          query: task.query,
          response: {
            type: 'visualization',
            content: {
              title: 'Simplified Visualization',
              summary: 'A simplified visualization due to processing constraints',
              details: ['The full visualization could not be generated within the time limit. This is a simplified version.']
            },
            visualization: {
              chartType: 'bar',
              data: [
                { label: 'Sample Data', value: 100 }
              ],
              config: {
                title: 'Simplified Chart',
                description: 'This is a simplified visualization due to processing constraints',
                xAxis: {
                  label: 'Category',
                  type: 'category'
                },
                yAxis: {
                  label: 'Value',
                  type: 'number'
                },
                legend: {
                  display: false
                },
                stacked: false
              }
            }
          }
        };
      }
      
      // Return an error response for this task
      return {
        agentType: task.agentType,
        query: task.query,
        response: {
          type: 'error',
          content: {
            title: 'Error',
            summary: `Error processing ${task.agentType} task`,
            details: [error.message || 'An unknown error occurred']
          }
        }
      };
    }
  });
  
  // Wait for all tasks to complete (or fail)
  const taskResults = await Promise.all(taskPromises);
  
  // Sort results by original task priority
  return taskResults.sort((a, b) => {
    const aIndex = sortedTasks.findIndex(t => t.agentType === a.agentType && t.query === a.query);
    const bIndex = sortedTasks.findIndex(t => t.agentType === b.agentType && t.query === b.query);
    return aIndex - bIndex;
  });
}; 