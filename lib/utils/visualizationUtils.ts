import { isVisualizationRequest, formatPieChartData } from '../agents/visualiser';

// Helper function to check if a prompt suggests visualization
export const shouldVisualize = (prompt: string): boolean => {
  return isVisualizationRequest(prompt);
};

// Helper function to format data for different chart types
export const formatChartData = (data: any[], chartType: 'bar' | 'pie'): any[] => {
  if (chartType === 'pie') {
    return formatPieChartData(data);
  }
  
  // For bar charts, ensure data has label and value properties
  return data.map(item => {
    // If data already has label/value format
    if (item.label !== undefined && item.value !== undefined) {
      return {
        label: item.label,
        value: Number(item.value) || 0,
        color: item.color
      };
    }
    
    // If data has different keys, use first key as label and second as value
    const keys = Object.keys(item);
    if (keys.length >= 2) {
      return {
        label: item[keys[0]],
        value: Number(item[keys[1]]) || 0,
        color: item.color
      };
    }
    
    return null;
  }).filter(Boolean);
};

// Helper function to generate default colors for charts
export const generateChartColors = (count: number): string[] => {
  const defaultColors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5'
  ];
  
  // If we need more colors than available, generate random ones
  if (count > defaultColors.length) {
    const additionalColors = Array.from({ length: count - defaultColors.length }, () => 
      `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
    );
    return [...defaultColors, ...additionalColors];
  }
  
  return defaultColors.slice(0, count);
}; 