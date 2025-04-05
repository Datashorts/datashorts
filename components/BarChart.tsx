'use client'

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
    group?: string;
  }>;
  config?: {
    barThickness?: number;
    barPercentage?: number;
    categoryPercentage?: number;
    horizontal?: boolean;
    stacked?: boolean;
    showGridLines?: boolean;
    showLegend?: boolean;
    xAxisLabel?: string;
    yAxisLabel?: string;
  };
}

const BarChart = ({ data, config = {} }: BarChartProps) => {
  if (!data || !data.length) return null;

  console.log("BarChart received data:", data);

  // Format data to match Recharts format
  const formattedData = data.map(item => ({
    name: item.label,
    value: item.value,
    color: item.color
  }));

  console.log("Formatted data for Recharts:", formattedData);

  const {
    barThickness = 20,
    horizontal = false,
    stacked = false,
    showGridLines = true,
    showLegend = true,
    xAxisLabel = '',
    yAxisLabel = ''
  } = config;

  // Generate colors if not provided
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Calculate total for percentage
  const total = formattedData.reduce((sum, item) => sum + item.value, 0);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;

    return (
      <div className="bg-[#333] p-3 border border-gray-700 rounded shadow-lg text-white">
        <p className="font-bold text-lg">{data.name}</p>
        <p className="text-blue-300">{`Value: ${data.value}`}</p>
        <p className="text-green-300">{`Percentage: ${percentage}%`}</p>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barSize={barThickness}
          layout={horizontal ? 'vertical' : 'horizontal'}
        >
          <CartesianGrid strokeDasharray="3 3" display={showGridLines ? 'block' : 'none'} />
          <XAxis 
            dataKey="name" 
            type={horizontal ? 'number' : 'category'} 
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
          />
          <YAxis 
            type={horizontal ? 'category' : 'number'} 
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          <Bar 
            dataKey="value" 
            fill="#8884d8" 
            radius={[4, 4, 0, 0]}
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart; 