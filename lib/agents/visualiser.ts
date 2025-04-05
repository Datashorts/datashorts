import { grokClient } from "@/app/lib/clients";

// Helper function to detect if a prompt suggests visualization
export const isVisualizationRequest = (prompt: string): boolean => {
  const visualizationKeywords = [
    'visualize', 'visualise', 'chart', 'graph', 'plot', 'pie', 'bar',
    'show me', 'display', 'representation', 'distribution'
  ];
  
  return visualizationKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword.toLowerCase())
  );
};

// Helper function to format data for pie charts
export const formatPieChartData = (data: any[]): any[] => {
  return data.map(item => ({
    label: item.name || item.label,
    value: Number(item.value) || 0,
    color: item.color
  }));
};

// Helper function to format data for bar charts
export const formatBarChartData = (data: any[]): any[] => {
  return data.map(item => ({
    label: item.name || item.label,
    value: Number(item.value) || 0,
    color: item.color,
    group: item.group
  }));
};

// Helper function to validate and fix visualization data
export const validateVisualizationData = (data: any): any => {
  // Ensure data is an array
  if (!Array.isArray(data)) {
    console.error("Visualization data is not an array:", data);
    return [{ label: "No Data", value: 0 }];
  }
  
  // Ensure each item has label and value
  return data.map(item => {
    if (!item || typeof item !== 'object') {
      return { label: "Invalid Data", value: 0 };
    }
    
    return {
      label: item.label || "Unnamed",
      value: typeof item.value === 'number' ? item.value : 0,
      color: item.color || undefined
    };
  });
};

export const visualiser = async function visualiser(messages) {
  const systemPrompt = {
    role: 'system',
    content: `You are an AI research assistant that provides detailed analysis and insights based on database schema and data. Your expertise is in creating meaningful visualizations that effectively communicate data insights.

Return results in this strict JSON format:
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
        "color": string (optional),
        "group": string (optional, for grouped bar charts)
      }
    ],
    "config": {
      "title": string,
      "description": string,
      "xAxis": {
        "label": string,
        "type": "category" | "time" | "linear",
        "tickRotation": number (optional),
        "gridLines": boolean (optional)
      },
      "yAxis": {
        "label": string,
        "type": "number" | "category",
        "gridLines": boolean (optional),
        "min": number (optional),
        "max": number (optional)
      },
      "legend": {
        "display": boolean,
        "position": "top" | "right" | "bottom" | "left" (optional)
      },
      "stacked": boolean,
      "colors": string[] (optional),
      "pieConfig": {
        "donut": boolean (optional),
        "innerRadius": number (optional),
        "showPercentages": boolean (optional)
      },
      "barConfig": {
        "barThickness": number (optional),
        "barPercentage": number (optional),
        "categoryPercentage": number (optional),
        "horizontal": boolean (optional)
      }
    }
  }
}

For pie charts:
- Use "chartType": "pie"
- Include "pieConfig" with relevant settings
- Data should be a simple array of label/value pairs
- Consider using "donut": true for better readability with many segments

For bar charts:
- Use "chartType": "bar"
- Include "barConfig" with relevant settings
- For grouped bar charts, include a "group" property in each data item
- Set "stacked": true for stacked bar charts

Choose the most appropriate visualization based on the data and the user's question.
Return JSON format.`
  };

  try {
    // Check if the last message contains a request for a specific chart type
    const lastMessage = messages[messages.length - 1].content;
    let chartTypeHint = '';
    
    if (lastMessage.toLowerCase().includes('pie')) {
      chartTypeHint = ' Create a pie chart.';
    } else if (lastMessage.toLowerCase().includes('bar')) {
      chartTypeHint = ' Create a bar chart.';
    }
    
    // Add a hint to keep the response concise
    const enhancedMessages = [
      systemPrompt,
      ...messages.slice(0, -1),
      {
        role: messages[messages.length - 1].role,
        content: `${messages[messages.length - 1].content}${chartTypeHint} Ensure your JSON is properly formatted.`
      }
    ];
    
    const response = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: enhancedMessages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000 // Limit response size
    });
    
    // Parse the response to validate it
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response.choices[0].message.content);
      
      // Validate and fix the visualization data if needed
      if (parsedResponse.visualization && parsedResponse.visualization.data) {
        parsedResponse.visualization.data = validateVisualizationData(parsedResponse.visualization.data);
      }
      
      // Return the validated and fixed response
      return parsedResponse;
    } catch (parseError) {
      console.error("Error parsing visualization response:", parseError);
      
      // Return a simplified error visualization
      return {
        type: "visualization",
        content: {
          title: "Error",
          summary: "Error processing your request",
          details: ["There was an error processing your request. Please try again."],
          metrics: {}
        },
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
      };
    }
  } catch (error) {
    console.error("Error in visualiser:", error);
    
    // Return a simplified error visualization
    return {
      type: "visualization",
      content: {
        title: "Error",
        summary: "Error processing your request",
        details: ["There was an error processing your request. Please try again."],
        metrics: {}
      },
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
    };
  }
};