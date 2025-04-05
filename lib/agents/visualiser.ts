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
    const response = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [systemPrompt, ...messages],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error in visualiser agent:", error);
    

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
        data: [],
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