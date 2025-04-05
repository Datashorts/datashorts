import React from 'react';

interface ResearcherResponseProps {
  content: {
    summary?: string;
    details?: string[];
    metrics?: Record<string, number | string>;
    visualization?: {
      chartType: string;
      data: Array<{
        label: string;
        value: number;
      }>;
      config: {
        xAxis: {
          label: string;
          type: string;
        };
        yAxis: {
          label: string;
          type: string;
        };
        legend: boolean;
        stacked: boolean;
      };
    };
  };
  visualization?: {
    chartType: string;
    data: Array<{
      label: string;
      value: number;
    }>;
    config: {
      xAxis: {
        label: string;
        type: string;
      };
      yAxis: {
        label: string;
        type: string;
      };
      legend: boolean;
      stacked: boolean;
    };
  };
}

const ResearcherResponse: React.FC<ResearcherResponseProps> = ({
  content,
  visualization
}) => {
  if (!content) return null;

  // Use the visualization prop if provided, otherwise use content.visualization
  const displayVisualization = visualization || content.visualization;

  return (
    <div className="space-y-4">
      {/* Summary section */}
      {content.summary && (
        <div className="bg-[#2a2a2a] p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Summary</h3>
          <p className="text-gray-300">{content.summary}</p>
        </div>
      )}

      {/* Details section */}
      {content.details && content.details.length > 0 && (
        <div className="bg-[#2a2a2a] p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Details</h3>
          <ul className="list-disc pl-5 space-y-1">
            {content.details.map((detail, index) => (
              <li key={index} className="text-gray-300">{detail}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics section */}
      {content.metrics && Object.keys(content.metrics).length > 0 && (
        <div className="bg-[#2a2a2a] p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(content.metrics).map(([key, value], index) => (
              <div key={index} className="bg-[#333] p-3 rounded">
                <p className="text-sm text-gray-400">{key}</p>
                <p className="text-lg font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visualization section - only shown if visualization data is available */}
      {displayVisualization && (
        <div className="bg-[#2a2a2a] p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Visualization</h3>
          <div className="bg-[#333] p-4 rounded h-64 flex items-center justify-center">
            <p className="text-gray-400">
              Chart Type: {displayVisualization.chartType}
            </p>
          </div>
          <div className="mt-2 text-sm text-gray-400">
            <p>X-Axis: {displayVisualization.config.xAxis.label}</p>
            <p>Y-Axis: {displayVisualization.config.yAxis.label}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearcherResponse; 