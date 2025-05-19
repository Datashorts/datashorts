import React, { useEffect, useState } from 'react';
import VisualizationRenderer from '@/components/VisualizationRenderer';
import { fetchVisualizationData } from '@/app/actions/fetchVisualizationData';

interface DynamicVisualizationProps {
  visualization: {
    chartType: 'bar' | 'pie';
    data: Array<any>;
    config: {
      title: string;
      description: string;
      pieConfig?: {
        donut?: boolean;
        innerRadius?: number;
        outerRadius?: number;
        showPercentages?: boolean;
      };
      barConfig?: {
        barThickness?: number;
        barPercentage?: number;
        categoryPercentage?: number;
        horizontal?: boolean;
      };
      stacked?: boolean;
      xAxis?: {
        gridLines?: boolean;
        label?: string;
      };
      yAxis?: {
        label?: string;
      };
    };
  };
  connectionId: string;
  sqlQuery: string;
  refreshInterval?: number;
}

const DynamicVisualization: React.FC<DynamicVisualizationProps> = ({
  visualization,
  connectionId,
  sqlQuery,
  refreshInterval = 5000 
}) => {
  const [currentVisualization, setCurrentVisualization] = useState(visualization);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchData = async () => {
      if (!connectionId || !sqlQuery) {
        setError('Missing required parameters');
        return;
      }

      try {
        setIsLoading(true);
        const result = await fetchVisualizationData(connectionId, sqlQuery, visualization.chartType);
        
        if (!isMounted) return;

        if (!result.success) {
          setError(result.error || 'Failed to fetch data');
          return;
        }

        if (!result.data || result.data.length === 0) {
          setError('No data available for visualization');
          return;
        }

        // Update visualization with new data
        setCurrentVisualization(prev => ({
          ...prev,
          data: result.data
        }));
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error in DynamicVisualization:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const startPolling = () => {
      fetchData();
      timeoutId = setTimeout(startPolling, refreshInterval);
    };

    startPolling();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [connectionId, sqlQuery, refreshInterval, visualization.chartType]);

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading visualization...
      </div>
    );
  }

  if (!currentVisualization || !currentVisualization.data || currentVisualization.data.length === 0) {
    return (
      <div className="text-yellow-500 p-4 bg-yellow-50 rounded-lg">
        No data available for visualization
      </div>
    );
  }

  return <VisualizationRenderer visualization={currentVisualization} />;
};

export default DynamicVisualization; 