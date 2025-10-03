// components/VisualizationRenderer.tsx
import React from 'react';
import BarChart from '@/components/BarChart';
import PieChart from '@/components/PieChart';
import LineChart from '@/components/LineChart';

interface VisualizationRendererProps {
  visualization: {
    chartType: 'bar' | 'pie' | 'line';
    data: Array<{
      label: string;
      value?: number;
      [key: string]: any; // Support for multiple data series
    }>;
    config: {
      title: string;
      description: string;
      xAxis?: {
        label?: string;
        gridLines?: boolean;
      } | string;
      yAxis?: {
        label?: string;
      } | string;
      legend?: boolean;
      stacked?: boolean;
      pieConfig?: {
        donut?: boolean;
        innerRadius?: number;
        outerRadius?: number;
        showPercentages?: boolean;
      };
      lineConfig?: {
        showPoints?: boolean;
        smooth?: boolean;
        showArea?: boolean;
        tension?: number;
        showGridLines?: boolean;
        multiLine?: boolean;
        dataKeys?: string[];
        lineColors?: string[];
        lineNames?: string[];
      };
      barConfig?: {
        barThickness?: number;
        barPercentage?: number;
        categoryPercentage?: number;
        horizontal?: boolean;
      };
    };
  };
}

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({ visualization }) => {
  const { chartType, data, config } = visualization;

  // Normalize axis config - handle both object and string formats
  const getAxisLabel = (axis: any): string => {
    if (typeof axis === 'string') return axis;
    if (typeof axis === 'object' && axis?.label) return axis.label;
    return 'Axis';
  };

  const xAxisLabel = getAxisLabel(config.xAxis);
  const yAxisLabel = getAxisLabel(config.yAxis);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900/20 rounded-lg border border-gray-700">
        <p className="text-gray-400">No data available for visualization</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart Title and Description */}
      {(config.title || config.description) && (
        <div className="mb-4">
          {config.title && (
            <h3 className="text-lg font-semibold text-gray-200 mb-1">
              {config.title}
            </h3>
          )}
          {config.description && (
            <p className="text-sm text-gray-400">{config.description}</p>
          )}
        </div>
      )}

      {/* Chart Container */}
      <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
        <div className="h-80">
          {chartType === 'pie' ? (
            <PieChart
              data={data.map((item) => ({ ...item, value: item.value ?? 0 }))}
              config={{
                donut: config.pieConfig?.donut || false,
                showPercentages: config.pieConfig?.showPercentages ?? true,
                innerRadius: config.pieConfig?.innerRadius,
                outerRadius: config.pieConfig?.outerRadius,
              }}
            />
          ) : chartType === 'line' ? (
            <LineChart
              data={data}
              config={{
                xAxisLabel,
                yAxisLabel,
                showPoints: config.lineConfig?.showPoints ?? true,
                smooth: config.lineConfig?.smooth ?? true,
                showArea: config.lineConfig?.showArea ?? false,
                tension: config.lineConfig?.tension ?? 0.4,
                showGridLines: config.lineConfig?.showGridLines ?? true,
                multiLine: config.lineConfig?.multiLine ?? false,
                dataKeys: config.lineConfig?.dataKeys,
                lineColors: config.lineConfig?.lineColors,
                lineNames: config.lineConfig?.lineNames,
              }}
            />
          ) : (
            <BarChart
              data={data.map((item) => ({ ...item, value: item.value ?? 0 }))}
              config={{
                barThickness: config.barConfig?.barThickness || 40,
                horizontal: config.barConfig?.horizontal || false,
                showGridLines: true,
                xAxisLabel,
                yAxisLabel,
              }}
            />
          )}
        </div>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/50">
          <p className="text-gray-400 mb-1">Data Points</p>
          <p className="text-lg font-semibold text-gray-200">{data.length}</p>
        </div>
        <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/50">
          <p className="text-gray-400 mb-1">Total Value</p>
          <p className="text-lg font-semibold text-gray-200">
            {data.reduce((sum, item) => {
              // Handle both single value and multi-line data
              if (item.value !== undefined) {
                return sum + item.value;
              }
              // Sum all numeric values for multi-line
              return sum + Object.values(item).reduce((acc: number, val: any) => {
                return typeof val === 'number' ? acc + val : acc;
              }, 0);
            }, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/50">
          <p className="text-gray-400 mb-1">Average</p>
          <p className="text-lg font-semibold text-gray-200">
            {(() => {
              const total = data.reduce((sum, item) => {
                if (item.value !== undefined) {
                  return sum + item.value;
                }
                return sum + Object.values(item).reduce((acc: number, val: any) => {
                  return typeof val === 'number' ? acc + val : acc;
                }, 0);
              }, 0);
              return (total / data.length).toFixed(2);
            })()}
          </p>
        </div>
        <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/50">
          <p className="text-gray-400 mb-1">Chart Type</p>
          <p className="text-lg font-semibold text-gray-200 capitalize">{chartType}</p>
        </div>
      </div>
    </div>
  );
};

export default VisualizationRenderer;