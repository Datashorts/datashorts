import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { executeQuery } from '@/app/actions/executeQuery';

interface DynamicResearcherResponseProps {
  initialResponse: {
    summary: string;
    details: string[];
    metrics: {
      [key: string]: number | string;
    };
    sqlQuery: string;
    queryResult: any;
  };
  connectionId: string;
  userQuery: string;
  reconstructedSchema: any[];
  refreshInterval?: number;
}

const REFRESH_OPTIONS = [
  { value: 5000, label: '5 seconds' },
  { value: 10000, label: '10 seconds' },
  { value: 30000, label: '30 seconds' },
  { value: 60000, label: '1 minute' },
  { value: 300000, label: '5 minutes' },
];

const getStorageKey = (connectionId: string, sqlQuery: string) => {
  return `researcher_refresh_${connectionId}_${sqlQuery}`;
};

const DynamicResearcherResponse: React.FC<DynamicResearcherResponseProps> = ({
  initialResponse,
  connectionId,
  userQuery,
  reconstructedSchema,
  refreshInterval = 5000
}) => {
  const [currentResponse, setCurrentResponse] = useState(initialResponse);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize selectedInterval from localStorage or default
  const [selectedInterval, setSelectedInterval] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(getStorageKey(connectionId, initialResponse.sqlQuery));
      return stored ? parseInt(stored, 10) : refreshInterval;
    }
    return refreshInterval;
  });

  // Debug log for initial props
  useEffect(() => {
    console.log('DynamicResearcherResponse mounted with props:', {
      hasInitialResponse: !!initialResponse,
      connectionId,
      userQuery,
      hasSchema: !!reconstructedSchema?.length,
      initialResponseKeys: initialResponse ? Object.keys(initialResponse) : [],
      initialResponseSqlQuery: initialResponse?.sqlQuery
    });
  }, []);

  // Update localStorage when interval changes
  const handleIntervalChange = (value: string) => {
    const newInterval = Number(value);
    console.log('Interval changed to:', newInterval);
    setSelectedInterval(newInterval);
    localStorage.setItem(getStorageKey(connectionId, initialResponse.sqlQuery), newInterval.toString());
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchData = async () => {
      console.log('Fetching data...', {
        connectionId,
        userQuery,
        hasSchema: !!reconstructedSchema?.length,
        interval: selectedInterval,
        initialResponseSqlQuery: initialResponse?.sqlQuery
      });

      if (!connectionId || !initialResponse?.sqlQuery) {
        console.error('Missing required parameters:', { 
          connectionId, 
          hasSqlQuery: !!initialResponse?.sqlQuery,
          initialResponseKeys: initialResponse ? Object.keys(initialResponse) : []
        });
        setError('Missing required parameters');
        return;
      }

      try {
        setIsLoading(true);
        
        // Execute the SQL query using the server action
        const result = await executeQuery(connectionId, initialResponse.sqlQuery);
        
        if (!isMounted) return;

        if (!result.success) {
          console.error('Failed to execute query:', result.error);
          setError(result.error || 'Failed to execute query');
          return;
        }

        // Create a new response with the updated query result
        const newResponse = {
          ...currentResponse,
          queryResult: result.data,
          // Update metrics if they depend on the query result
          metrics: {
            ...currentResponse.metrics,
            // Add any metrics that should be updated based on the query result
            // For example, if the query is a SUM, update that metric
            ...(result.data?.rows?.[0] || {})
          }
        };

        console.log('Received new data:', newResponse);
        
        // Only update if the data has changed
        const hasChanged = JSON.stringify(newResponse) !== JSON.stringify(currentResponse);
        console.log('Data changed:', hasChanged);
        
        if (hasChanged) {
          console.log('Updating response with new data');
          setCurrentResponse(newResponse);
        }
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error in DynamicResearcherResponse:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const startPolling = () => {
      console.log('Starting polling with interval:', selectedInterval);
      fetchData();
      timeoutId = setTimeout(startPolling, selectedInterval);
    };

    // Start polling immediately
    startPolling();

    return () => {
      console.log('Cleaning up polling');
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [connectionId, initialResponse?.sqlQuery, selectedInterval, currentResponse]);

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end space-x-2">
        <span className="text-sm text-gray-500">Refresh every:</span>
        <Select
          value={selectedInterval.toString()}
          onValueChange={handleIntervalChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select interval" />
          </SelectTrigger>
          <SelectContent>
            {REFRESH_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-[#2a2a2a] p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Summary</h3>
        <p className="text-gray-300">{currentResponse.summary}</p>

        {currentResponse.details?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Details</h4>
            <ul className="list-disc pl-5 space-y-1">
              {currentResponse.details.map((detail: string, index: number) => (
                <li key={index} className="text-gray-300 text-sm">{detail}</li>
              ))}
            </ul>
          </div>
        )}

        {currentResponse.metrics && Object.keys(currentResponse.metrics).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(currentResponse.metrics).map(([key, value], index) => (
                <div key={index} className="bg-[#333] p-3 rounded">
                  <p className="text-sm text-gray-400">{key}</p>
                  <p className="text-lg font-medium">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicResearcherResponse; 