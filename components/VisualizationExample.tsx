'use client'

import React, { useState } from 'react';
import DataVisualization from './DataVisualization';

// Example data for pie chart
const pieChartData = [
  { name: "Group A", value: 400 },
  { name: "Group B", value: 300 },
  { name: "Group C", value: 300 },
  { name: "Group D", value: 200 },
  { name: "Group E", value: 278 },
  { name: "Group F", value: 189 }
];

// Example data for bar chart
const barChartData = [
  { name: "Group A", value: 2400 },
  { name: "Group B", value: 4567 },
  { name: "Group C", value: 1398 },
  { name: "Group D", value: 9800 },
  { name: "Group E", value: 3908 },
  { name: "Group F", value: 4800 }
];

const VisualizationExample: React.FC = () => {
  const [visualizationType, setVisualizationType] = useState<'pie' | 'bar'>('pie');
  const [prompt, setPrompt] = useState<string>('');
  
  const handleVisualizationComplete = (visualization: any) => {
    console.log('Visualization complete:', visualization);
  };
  
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Data Visualization Example</h2>
      
      <div className="mb-4">
        <label className="block mb-2">Select Visualization Type:</label>
        <select 
          className="border p-2 rounded"
          value={visualizationType}
          onChange={(e) => setVisualizationType(e.target.value as 'pie' | 'bar')}
        >
          <option value="pie">Pie Chart</option>
          <option value="bar">Bar Chart</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">Enter a prompt (optional):</label>
        <input
          type="text"
          className="border p-2 rounded w-full"
          placeholder="e.g., 'Show me a pie chart of this data'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>
      
      <div className="border p-4 rounded">
        <DataVisualization
          prompt={prompt || `Show me a ${visualizationType} chart of this data`}
          data={visualizationType === 'pie' ? pieChartData : barChartData}
          onVisualizationComplete={handleVisualizationComplete}
        />
      </div>
    </div>
  );
};

export default VisualizationExample; 