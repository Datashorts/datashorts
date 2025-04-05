import { useState, useEffect } from 'react';
import { visualiser } from '../agents/visualiser';
import { shouldVisualize, formatChartData } from '../utils/visualizationUtils';

interface UseVisualizationProps {
  prompt: string;
  data?: any[];
}

interface VisualizationResult {
  visualization: any;
  loading: boolean;
  error: string | null;
}

export const useVisualization = ({ prompt, data }: UseVisualizationProps): VisualizationResult => {
  const [visualization, setVisualization] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processVisualization = async () => {
      // Check if the prompt suggests visualization
      if (!shouldVisualize(prompt)) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // If data is provided, use it directly
        if (data && data.length > 0) {
          // Determine chart type based on data characteristics
          const chartType = determineChartType(data);
          
          // Format data for the selected chart type
          const formattedData = formatChartData(data, chartType);
          
          // Create visualization object
          const visualizationResult = {
            chartType,
            data: formattedData,
            config: {
              title: 'Data Visualization',
              description: 'Visualization of the provided data',
              pieConfig: chartType === 'pie' ? {
                donut: data.length > 5,
                showPercentages: true
              } : undefined,
              barConfig: chartType === 'bar' ? {
                barPercentage: 0.7,
                categoryPercentage: 0.9
              } : undefined
            }
          };
          
          setVisualization(visualizationResult);
        } else {
          // Use the visualiser agent to generate visualization
          const result = await visualiser([{ role: 'user', content: prompt }]);
          setVisualization(result.visualization);
        }
      } catch (err) {
        console.error('Error in visualization processing:', err);
        setError('Failed to process visualization request');
      } finally {
        setLoading(false);
      }
    };

    processVisualization();
  }, [prompt, data]);

  return { visualization, loading, error };
};

// Helper function to determine the most appropriate chart type
const determineChartType = (data: any[]): 'bar' | 'pie' => {
  // If data has more than 10 items, bar chart is better for readability
  if (data.length > 10) {
    return 'bar';
  }
  
  // If all values are positive and sum to a meaningful total, pie chart might be appropriate
  const allPositive = data.every(item => {
    const value = item.value !== undefined ? item.value : Object.values(item)[1];
    return Number(value) > 0;
  });
  
  if (allPositive) {
    return 'pie';
  }
  
  // Default to bar chart
  return 'bar';
}; 