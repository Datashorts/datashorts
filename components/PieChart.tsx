'use client'

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface PieChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  config?: {
    donut?: boolean;
    innerRadius?: number;
    outerRadius?: number;
    showPercentages?: boolean;
  };
}

const PieChart = ({ data, config = {} }: PieChartProps) => {
  if (!data || !data.length) return null;

  // Format data to match Recharts format
  const formattedData = data.map(item => ({
    name: item.label,
    value: item.value,
    color: item.color
  }));

  const {
    donut = false,
    innerRadius = donut ? 60 : 0,
    outerRadius = 80,
    showPercentages = true
  } = config;

  // Generate colors if not provided
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Calculate total for percentage
  const total = formattedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={formattedData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            label={showPercentages ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : undefined}
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              const percentage = ((data.value / total) * 100).toFixed(1);
              
              return (
                <div className="bg-[#333] p-3 border border-gray-700 rounded shadow-lg text-white">
                  <p className="font-bold text-lg">{data.name}</p>
                  <p className="text-blue-300">{`Value: ${data.value}`}</p>
                  <p className="text-green-300">{`Percentage: ${percentage}%`}</p>
                </div>
              );
            }}
          />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart; 