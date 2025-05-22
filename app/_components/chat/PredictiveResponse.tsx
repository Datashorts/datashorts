import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    }>;
    config: {
      title: string;
      description: string;
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
  
  // Handle Date objects
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  
  // Handle objects by converting to JSON string
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Return strings and numbers as is
  return String(value);
}

// Helper function to safely process the data array for chart rendering
function processChartData(data: any[]): any[] {
  if (!Array.isArray(data)) return [];
  
  return data.map(item => {
    // Create a new object with processed values
    const processedItem: any = {};
    
    // Process each property
    Object.keys(item).forEach(key => {
      const value = item[key];
      
      // For nested objects like confidenceInterval
      if (key === 'confidenceInterval' && value) {
        processedItem.confidenceInterval = {
          lower: Number(value.lower) || 0,
          upper: Number(value.upper) || 0
        };
      } 
      // Handle the label property
      else if (key === 'label') {
        processedItem.label = formatValue(value);
      }
      // Handle the value property and ensure it's a number
      else if (key === 'value') {
        processedItem.value = Number(value) || 0;
      }
      // Copy over any other properties
      else {
        processedItem[key] = value;
      }
    });
    
    return processedItem;
  });
}

const PredictiveResponse: React.FC<PredictiveResponseProps> = ({ 
  content, 
  prediction,
  sqlQuery,
  queryResult
}) => {
  // Process the prediction data to ensure dates are properly formatted
  const chartData = processChartData(prediction.data);
  
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
                contentStyle={{ backgroundColor: '#333', borderColor: '#555', color: '#eee' }}
                labelStyle={{ color: '#eee' }}
                itemStyle={{ color: '#4dabf7' }}
                formatter={(value) => formatValue(value)}
                labelFormatter={(label) => formatValue(label)}
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
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-sm text-gray-400">
          <span className="font-medium">Prediction Method:</span> {content.method}
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