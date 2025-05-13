'use client'

import React from 'react';
import BarChart from '@/components/BarChart';
import PieChart from '@/components/PieChart';

interface Pipeline2VisualizationProps {
  analysisResult: {
    visualization: {
      chartType: 'bar' | 'pie' | 'line' | 'scatter';
      data: Array<{
        label: string;
        value: number;
        color?: string;
        percentage?: string;
      }>;
      config: {
        title: string;
        description: string;
        xAxis: string;
        yAxis: string;
        legend: boolean;
        pieConfig?: {
          labels: string[];
          values: number[];
        };
      };
    };
    content: {
      title: string;
      summary: string;
      details: string[];
      metrics: {
        total?: number;
        average?: number;
        min?: number;
        max?: number;
        [key: string]: number | undefined;
      };
    };
    sqlQuery?: string;
    queryResults?: any[];
  };
}

const Pipeline2Visualization: React.FC<Pipeline2VisualizationProps> = ({ analysisResult }) => {
  console.log("Pipeline2Visualization received:", analysisResult);

  if (!analysisResult || !analysisResult.visualization) {
    console.error("No visualization data provided");
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-600">No visualization data available</p>
      </div>
    );
  }

  const { visualization, content } = analysisResult;
  const { chartType, data, config } = visualization;

  if (!data || data.length === 0) {
    console.error("No data available for visualization");
    return (
      <div className="bg-yellow-50 p-4 rounded-lg">
        <p className="text-yellow-600">No data available for visualization</p>
      </div>
    );
  }

  // Format data for visualization
  const formattedData = data.map(item => ({
    label: item.label,
    value: Number(item.value) || 0,
    color: item.color,
    percentage: item.percentage
  }));

  console.log("Formatted data for chart:", formattedData);

  return (
    <div className="space-y-6">
      {/* Content Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold mb-4">{content.title}</h2>
        <p className="text-gray-600 mb-4">{content.summary}</p>

        {/* Details */}
        {content.details && content.details.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Key Insights</h3>
            <ul className="list-disc list-inside space-y-2">
              {content.details.map((detail, index) => (
                <li key={index} className="text-gray-600">{detail}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics */}
        {content.metrics && Object.keys(content.metrics).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(content.metrics).map(([key, value]) => (
              value !== undefined && (
                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 capitalize">{key}</p>
                  <p className="text-xl font-semibold">{value}</p>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Visualization Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-xl font-bold mb-2">{config.title}</h3>
        <p className="text-gray-600 mb-4">{config.description}</p>

        <div className="visualization-container">
          {chartType === 'pie' ? (
            <PieChart 
              data={formattedData} 
              config={{
                donut: false,
                showPercentages: true,
                ...config.pieConfig
              }} 
            />
          ) : (
            <BarChart 
              data={formattedData} 
              config={{
                barThickness: 40,
                horizontal: false,
                showGridLines: true,
                xAxisLabel: config.xAxis,
                yAxisLabel: config.yAxis
              }}
            />
          )}
        </div>
      </div>

      {/* SQL Query Section */}
      {analysisResult.sqlQuery && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">SQL Query</h3>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
            <code>{analysisResult.sqlQuery}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default Pipeline2Visualization; 