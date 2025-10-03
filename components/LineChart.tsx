// components/LineChart.tsx - Enhanced with multiple trend lines support
import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface LineChartProps {
  data: Array<{
    label: string;
    value?: number;
    [key: string]: any; // Support for multiple data series
  }>;
  config?: {
    xAxisLabel?: string;
    yAxisLabel?: string;
    showPoints?: boolean;
    smooth?: boolean;
    showArea?: boolean;
    tension?: number;
    showGridLines?: boolean;
    // Multiple lines configuration
    multiLine?: boolean;
    dataKeys?: string[]; // Array of keys to plot as separate lines
    lineColors?: string[]; // Colors for each line
    lineNames?: string[]; // Display names for each line
  };
}

// Default color palette for multiple lines
const DEFAULT_COLORS = [
  '#4dabf7', // Blue
  '#51cf66', // Green
  '#ff6b6b', // Red
  '#ffd43b', // Yellow
  '#a78bfa', // Purple
  '#ff8787', // Light Red
  '#5fc3e4', // Cyan
  '#ffa94d', // Orange
];

const LineChart: React.FC<LineChartProps> = ({ data, config = {} }) => {
  const {
    xAxisLabel = 'X Axis',
    yAxisLabel = 'Y Axis',
    showPoints = true,
    smooth = true,
    showArea = false,
    tension = 0.4,
    showGridLines = true,
    multiLine = false,
    dataKeys = ['value'],
    lineColors,
    lineNames,
  } = config;

  // Transform data to have proper keys for recharts
  const chartData = data.map(item => ({
    name: item.label,
    ...item, // Spread all other properties for multi-line support
  }));

  // Detect if we have multiple data series
  const hasMultipleSeries = multiLine || dataKeys.length > 1;
  
  // Get the actual data keys from the first data point if not specified
  const actualDataKeys = hasMultipleSeries 
    ? dataKeys 
    : (data.length > 0 && data[0].value !== undefined ? ['value'] : 
       Object.keys(data[0] || {}).filter(key => key !== 'label' && typeof data[0][key] === 'number'));

  // Assign colors to each line
  const colors = lineColors || DEFAULT_COLORS;
  
  // Assign names to each line
  const names = lineNames || actualDataKeys.map(key => 
    key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-gray-300 font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-semibold">{entry.name}:</span>{' '}
            {typeof entry.value === 'number' 
              ? entry.value.toLocaleString() 
              : entry.value}
          </p>
        ))}
      </div>
    );
  };

  const ChartComponent = showArea && !hasMultipleSeries ? AreaChart : RechartsLineChart;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        {showGridLines && (
          <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.3} />
        )}
        
        <XAxis
          dataKey="name"
          label={{
            value: xAxisLabel,
            position: 'insideBottom',
            offset: -10,
            fill: '#aaa',
            fontSize: 12,
          }}
          tick={{ fill: '#aaa', fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={80}
          stroke="#666"
        />
        
        <YAxis
          label={{
            value: yAxisLabel,
            angle: -90,
            position: 'insideLeft',
            fill: '#aaa',
            fontSize: 12,
          }}
          tick={{ fill: '#aaa', fontSize: 11 }}
          stroke="#666"
        />
        
        <Tooltip content={<CustomTooltip />} />
        
        <Legend
          wrapperStyle={{ color: '#eee', paddingTop: '20px' }}
          iconType="line"
        />
        
        {showArea && !hasMultipleSeries ? (
          <>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type={smooth ? 'monotone' : 'linear'}
              dataKey={actualDataKeys[0]}
              stroke={colors[0]}
              strokeWidth={2}
              fill="url(#colorValue)"
              fillOpacity={1}
              name={names[0] || yAxisLabel}
              dot={showPoints ? { fill: colors[0], strokeWidth: 0, r: 4 } : false}
              activeDot={{ fill: colors[0], stroke: '#fff', strokeWidth: 2, r: 6 }}
            />
          </>
        ) : (
          // Render multiple lines or single line
          actualDataKeys.map((key, index) => (
            <Line
              key={key}
              type={smooth ? 'monotone' : 'linear'}
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              name={names[index] || key}
              dot={showPoints ? { 
                fill: colors[index % colors.length], 
                strokeWidth: 0, 
                r: 4 
              } : false}
              activeDot={{ 
                fill: colors[index % colors.length], 
                stroke: '#fff', 
                strokeWidth: 2, 
                r: 6 
              }}
            />
          ))
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

export default LineChart;