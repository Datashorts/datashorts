import React from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  ScatterChart, 
  Scatter, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface PredictiveResponseProps {
  content: {
    title: string;
    summary: string;
    details: string[];
    metrics: Record<string, number | string>;
    method: string;
  };
  prediction: {
    data: Array<{
      label: string;
      value: number;
      confidenceInterval?: { lower: number; upper: number };
      color?: string;
    }>;
    config: {
      title: string;
      description: string;
      chartType: "line" | "bar" | "scatter" | "pie";
      xAxis: {
        label: string;
        type: "category" | "time" | "linear";
      };
      yAxis: {
        label: string;
        type: "number";
      };
    };
  };
  sqlQuery?: string;
  queryResult?: any;
}

const MetricCard: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <div className="bg-[#333] p-3 rounded">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="text-lg font-medium">{formatValue(value)}</p>
  </div>
);

// Helper function to format values and handle Date objects properly
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

// Helper function to safely process the data array for chart rendering
function processChartData(data: any[], chartType: string): any[] {
  if (!Array.isArray(data)) return [];
  
  return data.map((item, index) => {
    const processedItem: any = {};
    
    Object.keys(item).forEach(key => {
      const value = item[key];
      
      if (key === 'confidenceInterval' && value) {
        processedItem.confidenceInterval = {
          lower: Number(value.lower) || 0,
          upper: Number(value.upper) || 0
        };
      } 
      else if (key === 'label') {
        processedItem.label = formatValue(value);
        // For pie charts, we also need 'name' property
        if (chartType === 'pie') {
          processedItem.name = formatValue(value);
        }
      }
      else if (key === 'value') {
        processedItem.value = Number(value) || 0;
      }
      else {
        processedItem[key] = value;
      }
    });
    
    return processedItem;
  });
}

// Custom tooltip for different chart types
const CustomTooltip = ({ active, payload, label, chartType }: any) => {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-[#333] p-3 border border-gray-700 rounded shadow-lg text-white">
      <p className="font-bold text-lg">{label || data.name}</p>
      <p className="text-blue-300">{`Value: ${formatValue(data.value)}`}</p>
      {data.confidenceInterval && (
        <>
          <p className="text-green-300">{`Upper: ${formatValue(data.confidenceInterval.upper)}`}</p>
          <p className="text-yellow-300">{`Lower: ${formatValue(data.confidenceInterval.lower)}`}</p>
        </>
      )}
      {chartType === 'pie' && (
        <p className="text-green-300">{`Percentage: ${((data.value / payload[0].payload.total) * 100).toFixed(1)}%`}</p>
      )}
    </div>
  );
};

// Render different chart types
const renderChart = (chartType: string, chartData: any[], prediction: PredictiveResponseProps['prediction']) => {
  const colors = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', '#00BCD4', '#FF9800', '#795548'];
  
  switch (chartType) {
    case 'line':
      return (
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="label" 
            label={{ 
              value: prediction.config.xAxis.label, 
              position: 'bottom',
              offset: 0,
              fill: '#aaa'
            }}
            tick={{ fill: '#aaa' }}
          />
          <YAxis 
            label={{ 
              value: prediction.config.yAxis.label, 
              angle: -90, 
              position: 'left',
              offset: -5,
              fill: '#aaa'
            }}
            tick={{ fill: '#aaa' }}
          />
          <Tooltip 
            content={(props) => <CustomTooltip {...props} chartType="line" />}
          />
          <Legend wrapperStyle={{ color: '#eee' }} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#4dabf7" 
            name="Predicted Value" 
            strokeWidth={2}
            dot={{ fill: '#4dabf7', strokeWidth: 0, r: 4 }}
            activeDot={{ fill: '#4dabf7', stroke: '#fff', strokeWidth: 2, r: 6 }}
          />
          {chartData[0]?.confidenceInterval && (
            <>
              <Line 
                type="monotone" 
                dataKey="confidenceInterval.upper" 
                stroke="#4dabf755" 
                name="Upper Bound" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="confidenceInterval.lower" 
                stroke="#4dabf755" 
                name="Lower Bound" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            </>
          )}
        </LineChart>
      );
      
    case 'bar':
      return (
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="label" 
            label={{ 
              value: prediction.config.xAxis.label, 
              position: 'bottom',
              offset: 0,
              fill: '#aaa'
            }}
            tick={{ fill: '#aaa' }}
          />
          <YAxis 
            label={{ 
              value: prediction.config.yAxis.label, 
              angle: -90, 
              position: 'left',
              offset: -5,
              fill: '#aaa'
            }}
            tick={{ fill: '#aaa' }}
          />
          <Tooltip 
            content={(props) => <CustomTooltip {...props} chartType="bar" />}
          />
          <Legend wrapperStyle={{ color: '#eee' }} />
          <Bar dataKey="value" name="Predicted Value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      );
      
    case 'scatter':
      return (
        <ScatterChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="label" 
            label={{ 
              value: prediction.config.xAxis.label, 
              position: 'bottom',
              offset: 0,
              fill: '#aaa'
            }}
            tick={{ fill: '#aaa' }}
          />
          <YAxis 
            dataKey="value"
            label={{ 
              value: prediction.config.yAxis.label, 
              angle: -90, 
              position: 'left',
              offset: -5,
              fill: '#aaa'
            }}
            tick={{ fill: '#aaa' }}
          />
          <Tooltip 
            content={(props) => <CustomTooltip {...props} chartType="scatter" />}
          />
          <Legend wrapperStyle={{ color: '#eee' }} />
          <Scatter dataKey="value" fill="#4dabf7" name="Predicted Values" />
        </ScatterChart>
      );
    
    case 'pie':
      // Calculate total for percentage calculation
      const total = chartData.reduce((sum, item) => sum + item.value, 0);
      const dataWithTotal = chartData.map(item => ({ ...item, total }));
      
      return (
        <PieChart>
          <Pie
            data={dataWithTotal}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            content={(props) => <CustomTooltip {...props} chartType="pie" />}
          />
          <Legend wrapperStyle={{ color: '#eee' }} />
        </PieChart>
      );
    
    default:
      return (
        <div className="text-center text-gray-400 py-8">
          Unsupported chart type: {chartType}
        </div>
      );
  }
};

const PredictiveResponse: React.FC<PredictiveResponseProps> = ({ 
  content, 
  prediction,
  sqlQuery,
  queryResult
}) => {
  // Process the prediction data to ensure it's properly formatted
  const chartData = processChartData(prediction.data, prediction.config.chartType);
  const chartType = prediction.config.chartType || 'line';
  
  return (
    <div className="space-y-6">
      {/* Title and Summary */}
      <div className="bg-[#2a2a2a] p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2">{content.title}</h3>
        <p className="text-gray-300">{content.summary}</p>
        
        {/* Metrics */}
        {Object.keys(content.metrics).length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {Object.entries(content.metrics).map(([key, value]) => (
              <MetricCard key={key} label={key} value={value} />
            ))}
          </div>
        )}
      </div>

      {/* Prediction Visualization */}
      <div className="bg-[#2a2a2a] p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2">{prediction.config.title}</h3>
        <p className="text-gray-400 mb-4">{prediction.config.description}</p>
        
        <div className="bg-[#222] p-4 rounded-lg h-80">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(chartType, chartData, prediction)}
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-sm text-gray-400 flex justify-between">
          <span><span className="font-medium">Prediction Method:</span> {content.method}</span>
          <span><span className="font-medium">Chart Type:</span> {chartType.charAt(0).toUpperCase() + chartType.slice(1)}</span>
        </div>
      </div>

      {/* Details */}
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

      {/* SQL Query (Optional) */}
      {sqlQuery && (
        <div className="bg-[#2a2a2a] p-4 rounded-lg">
          <h3 className="text-sm font-medium mb-2 flex items-center justify-between">
            <span>SQL Query</span>
          </h3>
          <pre className="text-xs bg-[#222] p-3 rounded overflow-x-auto text-gray-300">
            {sqlQuery}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PredictiveResponse;