import { grokClient } from '@/app/lib/clients';
import { generateSQLQuery } from '@/app/actions/pipeline2Query';
import { executeSQLQuery } from '@/app/lib/db/executeQuery';

interface SchemaTable {
  tableName: string;
  columns: string;
  score: number;
}

interface PredictiveResponse {
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

/**
 * Predictive analytics agent for generating forecasts based on historical data
 * @param userQuery User's query text asking for predictions
 * @param reconstructedSchema The database schema information
 * @param connectionId The database connection ID
 * @returns Prediction data with visualization configuration
 */
export async function predictive(
  userQuery: string,
  reconstructedSchema: SchemaTable[],
  connectionId: string
): Promise<PredictiveResponse> {
  console.log("\n=== Predictive Agent Started ===");
  console.log("User Query:", userQuery);
  console.log("Connection ID:", connectionId);
  console.log("Schema Tables:", JSON.stringify(reconstructedSchema, null, 2));

  const systemPrompt: { role: 'system'; content: string } = {
    role: 'system',
    content: `You are a predictive analytics agent that generates predictions based on historical data using statistical methods.

For the given query and database schema, you will:
1. Identify time-series or sequential data that can be used for prediction
2. Determine appropriate prediction methods based on the data
3. Generate forecasts with confidence intervals if possible
4. Explain the prediction methodology and limitations

Return results in this strict JSON format:
{
  "content": {
    "title": string, // Title of the prediction
    "summary": string, // Brief summary of the prediction
    "details": string[], // Detailed explanation of the prediction
    "metrics": {
      [key: string]: number | string // Key metrics (e.g., predicted values, confidence intervals)
    },
    "method": string // The prediction method used (e.g., "Linear Regression", "Moving Average")
  },
  "prediction": {
    "data": [
      {
        "label": string, // Time point or category (e.g., date, month)
        "value": number, // Predicted value
        "confidenceInterval": { "lower": number, "upper": number } // Optional confidence interval
      }
    ],
    "config": {
      "title": string, // Title for visualization
      "description": string, // Description of the prediction
      "xAxis": {
        "label": string,
        "type": "category" | "time" | "linear"
      },
      "yAxis": {
        "label": string,
        "type": "number"
      }
    }
  }
}

Return JSON format.`,
  };

  try {
    // 1. Generate SQL query to retrieve historical data
    const sqlQuery = await generateSQLQuery(reconstructedSchema, `Get historical data for ${userQuery}`);
    console.log("Generated SQL Query:", sqlQuery);

    // 2. Execute the query to get historical data
    const queryResult = await executeSQLQuery(connectionId, sqlQuery);
    console.log("Query Result:", JSON.stringify(queryResult, null, 2));

    if (!queryResult.success) {
      throw new Error(queryResult.error || "Failed to execute SQL query");
    }

    if (!queryResult.rows || queryResult.rows.length === 0) {
      throw new Error("No historical data found for prediction");
    }

    // 3. Analyze time-series data from the query results
    // Get the column names from the first row
    const columns = Object.keys(queryResult.rows[0]);
    
    // Determine which columns might contain time/date information and which contain numeric values
    let timeColumns = columns.filter(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time') || 
      col.toLowerCase().includes('year') || 
      col.toLowerCase().includes('month')
    );
    
    let valueColumns = columns.filter(col => {
      // Check if the column contains numeric values
      const firstValue = queryResult.rows[0][col];
      return typeof firstValue === 'number' || !isNaN(Number(firstValue));
    });

    // If no obvious time columns found, try to infer from data patterns
    if (timeColumns.length === 0) {
      for (const col of columns) {
        // Check if the column values look like dates or sequential numbers
        const values = queryResult.rows.map(row => row[col]);
        const couldBeTimeColumn = values.every((val, i) => {
          if (i === 0) return true;
          // Check if values are increasing (like dates or sequential IDs)
          const prev = new Date(values[i-1]).getTime() || Number(values[i-1]);
          const curr = new Date(val).getTime() || Number(val);
          return !isNaN(prev) && !isNaN(curr) && curr >= prev;
        });
        
        if (couldBeTimeColumn) {
          timeColumns.push(col);
        }
      }
    }

    // 4. Generate prediction using Grok
    const prompt = `
User Query: ${userQuery}

Database Schema:
${reconstructedSchema.map(table => `
Table: "${table.tableName}"
Columns: ${table.columns}
`).join("\n")}

Historical Data from Query:
${JSON.stringify(queryResult.rows.slice(0, 10), null, 2)}
${queryResult.rows.length > 10 ? `\n... and ${queryResult.rows.length - 10} more rows` : ''}

Time/Date Columns: ${timeColumns.join(', ')}
Value Columns: ${valueColumns.join(', ')}

Based on this historical data, generate a prediction that answers the user's query: "${userQuery}"
`;

    console.log("\n--- Sending to Grok for Prediction ---");
    const response = await grokClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [
        systemPrompt,
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in prediction response');
    }
    
    const result = JSON.parse(content);
    console.log("Prediction Result:", JSON.stringify(result, null, 2));

    // 5. Return the prediction results with the original query data
    return {
      ...result,
      sqlQuery,
      queryResult: {
        success: true,
        rows: queryResult.rows,
        rowCount: queryResult.rowCount
      }
    };
    
  } catch (error) {
    console.error("Error in predictive agent:", error);
    
    // Return a fallback response in case of errors
    return {
      content: {
        title: "Prediction Error",
        summary: "Unable to generate prediction due to an error",
        details: [
          error instanceof Error ? error.message : "An unknown error occurred",
          "The data may not contain sufficient historical information for forecasting",
          "Try rephrasing your query to specify the time period and metrics more clearly"
        ],
        metrics: {
          error: "Prediction failed"
        },
        method: "none"
      },
      prediction: {
        data: [{ label: "Error", value: 0 }],
        config: {
          title: "Error Prediction",
          description: "An error occurred while generating the prediction",
          xAxis: { label: "", type: "category" },
          yAxis: { label: "", type: "number" }
        }
      }
    };
  }
}

// Make sure we're exporting the function correctly
export default predictive;