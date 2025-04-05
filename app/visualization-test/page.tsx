'use client';

import React, { useState } from 'react';
import VisualizationRenderer from '@/components/VisualizationRenderer';

// Example data for visualization
const pieChartData = {
  chartType: 'pie',
  data: [
    { label: 'Category A', value: 30, color: '#FF6384' },
    { label: 'Category B', value: 50, color: '#36A2EB' },
    { label: 'Category C', value: 20, color: '#FFCE56' },
  ],
  config: {
    title: 'Sample Pie Chart',
    description: 'This is a sample pie chart visualization',
    legend: {
      display: true
    },
    pieConfig: {
      donut: false,
      showPercentages: true
    }
  }
};

// Bar chart data
const barChartData = {
  chartType: 'bar',
  data: [
    { label: 'Jan', value: 65, color: '#FF6384' },
    { label: 'Feb', value: 59, color: '#36A2EB' },
    { label: 'Mar', value: 80, color: '#FFCE56' },
    { label: 'Apr', value: 81, color: '#4BC0C0' },
    { label: 'May', value: 56, color: '#9966FF' },
  ],
  config: {
    title: 'Sample Bar Chart',
    description: 'This is a sample bar chart visualization',
    xAxis: {
      label: 'Month',
      type: 'category',
      gridLines: true
    },
    yAxis: {
      label: 'Value',
      type: 'number',
      gridLines: true
    },
    legend: {
      display: true
    },
    stacked: false,
    barConfig: {
      barThickness: 30,
      horizontal: false
    }
  }
};

export default function VisualizationTestPage() {
  const [activeTab, setActiveTab] = useState<'pie' | 'bar'>('pie');
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Visualization Test Page</h1>
      
      <div className="flex space-x-4 mb-4">
        <button 
          className={`px-4 py-2 rounded ${activeTab === 'pie' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('pie')}
        >
          Pie Chart
        </button>
        <button 
          className={`px-4 py-2 rounded ${activeTab === 'bar' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('bar')}
        >
          Bar Chart
        </button>
      </div>
      
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">
          {activeTab === 'pie' ? 'Pie Chart Example' : 'Bar Chart Example'}
        </h2>
        <p className="text-gray-600 mb-4">
          {activeTab === 'pie' 
            ? 'This is a sample pie chart visualization using the VisualizationRenderer component.' 
            : 'This is a sample bar chart visualization using the VisualizationRenderer component.'}
        </p>
        
        <div className="h-80">
          <VisualizationRenderer 
            visualization={activeTab === 'pie' ? pieChartData : barChartData} 
          />
        </div>
      </div>
    </div>
  );
} 