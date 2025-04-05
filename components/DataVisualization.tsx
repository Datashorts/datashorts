'use client'

import React, { useState } from 'react';
import { useVisualization } from '../lib/hooks/useVisualization';
import VisualizationRenderer from './VisualizationRenderer';

interface DataVisualizationProps {
  prompt: string;
  data?: any[];
  onVisualizationComplete?: (visualization: any) => void;
}

const DataVisualization: React.FC<DataVisualizationProps> = ({ 
  prompt, 
  data,
  onVisualizationComplete 
}) => {
  const { visualization, loading, error } = useVisualization({ prompt, data });
  
  // Call the callback when visualization is complete
  React.useEffect(() => {
    if (visualization && onVisualizationComplete) {
      onVisualizationComplete(visualization);
    }
  }, [visualization, onVisualizationComplete]);

  if (loading) {
    return <div className="p-4 text-center">Processing visualization...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!visualization) {
    return null;
  }

  return (
    <div className="data-visualization">
      <VisualizationRenderer visualization={visualization} />
    </div>
  );
};

export default DataVisualization; 