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
  const { chartType, data, config } = visualization;

  if (!data || data.length === 0) {
    return <div>No data available for visualization</div>;
  }

  return (
    <div className="visualization-container">
      <h3 className="text-xl font-bold mb-2">{config.title}</h3>
      <p className="text-gray-600 mb-4">{config.description}</p>
      
      {chartType === 'pie' ? (
        <PieChart 
          data={data} 
          config={config.pieConfig || {}} 
        />
      ) : (
        <BarChart 
          data={data} 
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