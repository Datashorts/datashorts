'use client'

import React from 'react';
import BarChart from './BarChart';
import PieChart from './PieChart';

interface VisualizationRendererProps {
  visualization: {
    chartType: 'bar' | 'pie';
    data: Array<{
      label: string;
      value: number;
      color?: string;
      group?: string;
    }>;
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
}

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({ visualization }) => {
  console.log("VisualizationRenderer received:", visualization);
  
  if (!visualization) {
    console.error("No visualization data provided");
    return <div>No visualization data available</div>;
  }
  
  const { chartType, data, config } = visualization;

  if (!data || data.length === 0) {
    console.error("No data available for visualization");
    return <div>No data available for visualization</div>;
  }

  // Ensure data has the correct format
  const formattedData = data.map(item => {
    // If data already has label/value format
    if (item.label !== undefined && item.value !== undefined) {
      return {
        label: item.label,
        value: Number(item.value) || 0,
        color: item.color
      };
    }
    
    // If data has different keys, use first key as label and second as value
    const keys = Object.keys(item);
    if (keys.length >= 2) {
      return {
        label: item[keys[0]],
        value: Number(item[keys[1]]) || 0,
        color: item.color
      };
    }
    
    return null;
  }).filter(Boolean);

  console.log("Formatted data for chart:", formattedData);

  if (!formattedData.length) {
    console.error("No valid data after formatting");
    return <div>No valid data available for visualization</div>;
  }

  return (
    <div className="visualization-container">
      <h3 className="text-xl font-bold mb-2">{config.title}</h3>
      <p className="text-gray-600 mb-4">{config.description}</p>
      
      {chartType === 'pie' ? (
        <PieChart 
          data={formattedData} 
          config={config.pieConfig || {}} 
        />
      ) : (
        <BarChart 
          data={formattedData} 
          config={{
            barThickness: config.barConfig?.barThickness,
            horizontal: config.barConfig?.horizontal,
            stacked: config.stacked,
            showGridLines: config.xAxis?.gridLines,
            xAxisLabel: config.xAxis?.label,
            yAxisLabel: config.yAxis?.label
          }}
        />
      )}
    </div>
  );
};

export default VisualizationRenderer; 