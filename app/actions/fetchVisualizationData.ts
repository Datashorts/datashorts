'use server'

import { executeSQLQuery } from '@/app/lib/db/executeQuery';

function formatDataForVisualization(data: any[], chartType: 'bar' | 'pie') {
  try {
    // Example SQL result: SELECT category, sales FROM sales_table
// data = [
//     { category: "Electronics", sales: 1000 },
//     { category: "Clothing", sales: 500 },
//     { category: "Food", sales: 750 }
//   ]
    if (!Array.isArray(data) || data.length === 0) {
      console.log('No data to format');
      return [];
    }

    // Get the first row to determine the structure
    // Gets first row: { category: "Electronics", sales: 1000 }
// Checks if it's a valid object
    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object') {
      console.log('Invalid data structure:', firstRow);
      return [];
    }

    // Gets column names: ["category", "sales"]
    const keys = Object.keys(firstRow);
    if (keys.length === 0) {
      console.log('No keys in data row');
      return [];
    }

    // If we have exactly two columns, use them as label and value
    if (keys.length === 2) {
      return data.map(row => {
        if (!row || typeof row !== 'object') return null;
        return {
          label: String(row[keys[0]] || ''), //first column becomes label
          value: Number(row[keys[1]]) || 0 //second column becomes value
        };
      }).filter(Boolean);
    }

    // If we have more than two columns, use the first column as label
    // and sum the rest as value
    return data.map(row => {
      if (!row || typeof row !== 'object') return null;
      const label = String(row[keys[0]] || '');
      const value = keys.slice(1).reduce((sum, key) => {
        const num = Number(row[key]);
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
      return { label, value };
    }).filter(Boolean);
  } catch (error) {
    console.error('Error formatting visualization data:', error);
    return [];
  }
}

export async function fetchVisualizationData(connectionId: string, sqlQuery: string, chartType: 'bar' | 'pie' = 'bar') {
  if (!connectionId || !sqlQuery) {
    console.error('Missing required parameters:', { connectionId, sqlQuery });
    return {
      success: false,
      data: null,
      error: 'Missing required parameters'
    };
  }

  try {
    const result = await executeSQLQuery(connectionId, sqlQuery);
    
    if (!result || !result.success) {
      console.error('Query execution failed:', result?.error);
      return {
        success: false,
        data: null,
        error: result?.error || 'Failed to fetch data'
      };
    }

    if (!Array.isArray(result.rows)) {
      console.error('Invalid query result format:', result);
      return {
        success: false,
        data: null,
        error: 'Invalid query result format'
      };
    }

    const formattedData = formatDataForVisualization(result.rows, chartType);

    if (formattedData.length === 0) {
      console.log('No data after formatting');
      return {
        success: false,
        data: null,
        error: 'No valid data available for visualization'
      };
    }

    return {
      success: true,
      data: formattedData,
      error: null
    };
  } catch (error) {
    console.error('Error fetching visualization data:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'An error occurred'
    };
  }
} 