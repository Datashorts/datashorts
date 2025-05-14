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
  
  // Check if it's a visualization request
  const isVisualizationRequest = userMessage.includes('visualize') || 
                                userMessage.includes('visualise') || 
                                userMessage.includes('chart') || 
                                userMessage.includes('graph') || 
                                userMessage.includes('plot') || 
                                userMessage.includes('bar') || 
                                userMessage.includes('pie');

  const systemPrompt = {
    role: 'system',
    content: isVisualizationRequest ? 
      `You are a data analyst that provides visualizations based on data queries. Return results in this strict JSON format:
      {
        "type": "visualization",
        "content": {
          "title": string,
          "summary": string,
          "details": string[],
          "metrics": {
            [key: string]: number | string
          }
        },
        "visualization": {
          "chartType": "bar" | "pie",
          "data": [
            {
              "label": string,
              "value": number,
              "color": string (optional)
            }
          ],
          "config": {
            "title": string,
            "description": string,
            "xAxis": {
              "label": string,
              "type": "category" | "time" | "linear"
            },
            "yAxis": {
              "label": string,
              "type": "number" | "category"
            },
            "legend": {
              "display": boolean
            },
            "stacked": boolean,
            "barConfig": {
              "barThickness": number (optional),
              "horizontal": boolean (optional)
            }
          }
        }
      }
      
      For bar charts:
      - Use "chartType": "bar"
      - Ensure data has "label" and "value" properties
      - Set appropriate axis labels
      
      Return JSON format.` 
      : isSimpleQuery ? 
      `You are a data analyst that provides direct answers to data queries. Return results in this strict JSON format:
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
      : // Default analysis prompt
      `You are a data analyst that provides detailed analysis based on data queries. Return results in this strict JSON format:
      {
        "summary": string,
        "details": string[],
        "metrics": {
          [key: string]: number | string
        }
      }
      
      Provide a comprehensive analysis of the data, including key insights and trends.
      
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
      type: isVisualizationRequest ? "visualization" : "analysis",
      content: {
        title: "Error",
        summary: "Error processing your request",
        details: ["There was an error processing your request. Please try again."],
        metrics: {}
      },
      ...(isVisualizationRequest ? {
        visualization: {
          chartType: "bar",
          data: [
            { label: "Error", value: 0 }
          ],
          config: {
            title: "Error Visualization",
            description: "An error occurred while generating the visualization",
            xAxis: {
              label: "",
              type: "category"
            },
            yAxis: {
              label: "",
              type: "number"
            },
            legend: {
              display: false
            },
            stacked: false
          }
        }
      } : {})
    });
  }
};