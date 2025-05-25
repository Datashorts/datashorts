// File path: lib/agents2/researcher.ts

import { executeSQLQuery } from '@/app/lib/db/executeQuery';
import { generateSQLQuery } from '@/app/actions/generateSQLQuery';

export async function researcher(
  userQuery: string,
  reconstructedSchema: any[],
  connectionId: string
): Promise<{
  summary: string;
  details: string[];
  metrics: Record<string, number | string>;
  sqlQuery?: string;
  queryResult?: any;
}> {
  console.log("\n=== Researcher Agent Started ===");
  console.log("User Query:", userQuery);
  console.log("Schema Tables:", reconstructedSchema.map(s => s.tableName));
  console.log("Connection ID:", connectionId);

  try {
    console.log("\n--- Generating SQL Query ---");
    const sqlQuery = await generateSQLQuery(reconstructedSchema, userQuery, connectionId);
    console.log("Generated SQL Query:", sqlQuery);

    console.log("\n--- Executing SQL Query ---");
    const queryResult = await executeSQLQuery(connectionId, sqlQuery);
    console.log("Query Result:", {
      success: queryResult.success,
      rowCount: queryResult.rowCount,
      error: queryResult.error
    });

    if (!queryResult.success) {
      console.error("SQL Query Execution Failed:", queryResult.error);
      return {
        summary: `Unable to execute query: ${queryResult.error}`,
        details: [
          "The query could not be executed due to an error.",
          "Please check your query and try again."
        ],
        metrics: {
          error: queryResult.error || "Unknown error"
        },
        sqlQuery,
        queryResult
      };
    }

    console.log("\n--- Analyzing Results ---");
    const rows = queryResult.rows || [];
    console.log(`Total rows returned: ${rows.length}`);

    // Analyze the results
    let summary = "";
    let details: string[] = [];
    let metrics: Record<string, number | string> = {};

    if (rows.length === 0) {
      summary = "No data found matching your query.";
      details = [
        "The query executed successfully but returned no results.",
        "This could mean the data doesn't exist or the query criteria are too specific."
      ];
      metrics = {
        rowCount: 0,
        status: "No results"
      };
    } else if (rows.length === 1) {
      summary = `Found 1 record matching your query.`;
      details = [`The query returned a single result.`];
      
      // Add key fields to details
      const firstRow = rows[0];
      const importantFields = Object.entries(firstRow)
        .filter(([key, value]) => value !== null && value !== undefined)
        .slice(0, 5); // Show first 5 non-null fields
      
      importantFields.forEach(([key, value]) => {
        details.push(`${key}: ${value}`);
      });
      
      metrics = {
        rowCount: 1,
        ...firstRow
      };
    } else {
      summary = `Found ${rows.length} records matching your query.`;
      
      // Analyze data patterns
      const columns = Object.keys(rows[0]);
      details.push(`Returned columns: ${columns.join(", ")}`);
      
      // Calculate basic statistics for numeric columns
      columns.forEach(col => {
        const values = rows.map(row => row[col]).filter(v => typeof v === 'number');
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);
          
          if (values.length === rows.length) { // All values are numeric
            details.push(`${col}: Min=${min}, Max=${max}, Avg=${avg.toFixed(2)}`);
            metrics[`${col}_min`] = min;
            metrics[`${col}_max`] = max;
            metrics[`${col}_avg`] = parseFloat(avg.toFixed(2));
          }
        }
      });
      
      metrics.rowCount = rows.length;
    }

    console.log("\n=== Researcher Agent Completed ===");
    console.log("Summary:", summary);
    console.log("Metrics:", metrics);

    return {
      summary,
      details,
      metrics,
      sqlQuery,
      queryResult
    };
  } catch (error) {
    console.error("\n=== Researcher Agent Error ===");
    console.error("Error Details:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorResponse = {
      summary: "Unable to complete analysis due to an error",
      details: [
        "Please try rephrasing your query or try again later"
      ],
      metrics: {
        error: "Analysis failed"
      }
    };
    
    console.error("Error Response:", errorResponse);
    return errorResponse;
  }
}