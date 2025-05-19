import { grokClient } from "@/app/lib/clients";
import { generateSQLQuery } from "@/app/actions/pipeline2Query";
import { executeSQLQuery } from "@/app/lib/db/executeQuery";

export const visualizer = async function visualizer(
  messages: any[],
  reconstructedSchema: any[],
  connectionId: string
) {
  const systemPrompt = {
    role: "system",
    content: `You are a data visualization expert that creates meaningful visualizations based on database query results.
    
Your role is to analyze the query results and create appropriate visualizations. Return a JSON object with the following structure:
{
  "visualization": {
    "chartType": string,    // Type of chart: "bar" | "line" | "pie" | "scatter"
    "data": any[],         // Data points for visualization
    "config": {            // Chart configuration
      "title": string,     // Chart title
      "description": string, // Brief description
      "xAxis": string,     // X-axis label
      "yAxis": string,     // Y-axis label
      "legend": boolean,   // Whether to show legend
      "pieConfig": {       // Specific to pie charts
        "labels": string[], // Labels for pie segments
        "values": number[]  // Values for pie segments
      }
    }
  },
  "content": {
    "title": string,      // Title of the analysis
    "summary": string,    // Brief summary of findings
    "details": string[],  // List of specific insights
    "metrics": {          // Key metrics
      "total": number,    // Total count or sum
      "average": number,  // Average value
      "min": number,      // Minimum value
      "max": number       // Maximum value
    }
  }
}

Focus on:
1. Choosing appropriate chart types for the data
2. Clear and meaningful visualizations
3. Proper data formatting
4. Informative titles and labels
5. Relevant metrics and insights

Return JSON format.`,
  };

  try {
    // Get the last user message
    const lastUserMessage =
      messages.filter((m) => m.role === "user").pop()?.content || "";

    // Analyze conversation context
    const contextAnalysis = await grokClient.chat.completions.create({
      model: "grok-2-latest",
      messages: [
        {
          role: "system",
          content: `You are a context analyzer. Analyze the conversation and determine if the current request is a follow-up to a previous query.
Return a JSON object with:
{
  "isFollowUp": boolean,    // Whether this is a follow-up request
  "previousQuery": string,  // The previous query to reference, if any
  "reason": string         // Brief explanation of your decision
}`,
        },
        ...messages,
        { role: "user", content: lastUserMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = contextAnalysis.choices[0].message.content;
    if (!content) {
      throw new Error("No content in context analysis response");
    }
    const contextResult = JSON.parse(content);
    console.log("Context analysis:", contextResult);

    let sqlQuery;
    if (contextResult.isFollowUp) {
      // For follow-up requests, look for the last successful query in the conversation history
      const lastAssistantMessage = messages
        .filter((m) => m.role === "assistant")
        .reverse()
        .find((m) => {
          try {
            const response = JSON.parse(m.content);
            return response.sqlQuery && response.queryResults;
          } catch (e) {
            return false;
          }
        });

      if (lastAssistantMessage) {
        try {
          const lastResponse = JSON.parse(lastAssistantMessage.content);
          if (lastResponse.sqlQuery) {
            sqlQuery = lastResponse.sqlQuery;
            console.log("Using previous query:", sqlQuery);
          }
        } catch (e) {
          console.log("Could not parse last assistant message");
        }
      }
    }

    // If no previous query found or not a follow-up, generate new query
    if (!sqlQuery) {
      const generatedQuery = await generateSQLQuery(
        reconstructedSchema,
        lastUserMessage
      );
      // Validate that the generated query is actually SQL
      if (
        typeof generatedQuery === "string" &&
        generatedQuery.trim().toLowerCase().startsWith("select") &&
        !generatedQuery.toLowerCase().includes("error") &&
        !generatedQuery.toLowerCase().includes("sorry")
      ) {
        sqlQuery = generatedQuery;
        console.log("Generated new query:", sqlQuery);
      } else {
        throw new Error(
          "Failed to generate valid SQL query. Please try rephrasing your question."
        );
      }
    }

    // Execute the query
    const queryResult = await executeSQLQuery(connectionId, sqlQuery);
    console.log("Query results:", queryResult);

    if (!queryResult.success) {
      throw new Error(queryResult.error || "Failed to execute query");
    }

    // Validate query results
    if (
      !queryResult.rows ||
      !Array.isArray(queryResult.rows) ||
      queryResult.rows.length === 0
    ) {
      throw new Error(
        "No data found for visualization. Please try a different query."
      );
    }

    // Process the query results for visualization
    const determineChartType = (message: string, data: { rows: any[] }) => {
      // First check explicit user preference
      if (message.toLowerCase().includes("pie")) return "pie";
      if (message.toLowerCase().includes("bar")) return "bar";

      // If no explicit preference, analyze the data
      if (data?.rows?.length > 0) {
        const columns = Object.keys(data.rows[0]);
        const valueColumn = columns[1]; // Assuming second column is the value

        // Check if data is suitable for pie chart
        const total = data.rows.reduce(
          (sum: number, row: any) => sum + Math.abs(Number(row[valueColumn])),
          0
        );
        const hasReasonableDistribution = data.rows.every((row: any) => {
          const value = Math.abs(Number(row[valueColumn]));
          const percentage = (value / total) * 100;
          return percentage >= 5; // Each slice should be at least 5% of total
        });

        // If data has reasonable distribution and not too many categories, use pie
        if (hasReasonableDistribution && data.rows.length <= 8) {
          return "pie";
        }
      }

      // Default to bar chart
      return "bar";
    };

    const chartType = determineChartType(lastUserMessage, queryResult);
    const processedData = processQueryResults(queryResult, chartType);

    const response = await grokClient.chat.completions.create({
      model: "grok-2-latest",
      messages: [
        systemPrompt,
        ...messages,
        {
          role: "system",
          content: `Query Results: ${JSON.stringify(processedData)}
Context: ${contextResult.reason}
Chart Type: ${chartType}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error("No content in visualization response");
    }
    const result = JSON.parse(responseContent);

    // Ensure the chart type matches what we processed
    result.visualization.chartType = chartType;
    result.visualization.data = processedData;

    return {
      ...result,
      sqlQuery,
      tablesUsed: reconstructedSchema.map((table) => table.tableName),
      queryResults: queryResult.rows,
    };
  } catch (error) {
    console.error("Error in visualizer:", error);
    return {
      visualization: {
        chartType: "bar",
        data: [],
        config: {
          title: "Error in Visualization",
          description: "Failed to generate visualization",
          xAxis: "",
          yAxis: "",
          legend: false,
        },
      },
      content: {
        title: "Error",
        summary:
          "Sorry, I encountered an error while creating the visualization.",
        details: ["Please try rephrasing your question or try again later."],
        metrics: {},
      },
      sqlQuery: "",
      tablesUsed: [],
      queryResults: [],
    };
  }
};

function processQueryResults(queryResult: any, chartType: "bar" | "pie") {
  if (!queryResult || !queryResult.rows || !Array.isArray(queryResult.rows)) {
    return [];
  }

  const columns = Object.keys(queryResult.rows[0]);
  const labelColumn = columns[0];
  const valueColumn = columns[1];

  const colors = [
    "#4CAF50",
    "#2196F3",
    "#FFC107",
    "#F44336",
    "#9C27B0",
    "#00BCD4",
    "#FF9800",
    "#795548",
    "#607D8B",
    "#E91E63",
  ];

  if (chartType === "pie") {
    const total = queryResult.rows.reduce(
      (sum: number, row: any) => sum + Math.abs(Number(row[valueColumn])),
      0
    );

    return queryResult.rows
      .map((row: any, index: number) => {
        const value = Math.abs(Number(row[valueColumn]));
        const percentage = total > 0 ? (value / total) * 100 : 0;

        return {
          label: String(row[labelColumn]),
          value: value,
          percentage: percentage.toFixed(1),
          color: colors[index % colors.length],
        };
      })
      .sort((a: { value: number }, b: { value: number }) => b.value - a.value);
  } else {
    return queryResult.rows
      .map((row: any, index: number) => {
        let value = Number(row[valueColumn]);
        let label = String(row[labelColumn]);

        if (
          labelColumn.toLowerCase().includes("date") ||
          labelColumn.toLowerCase().includes("time")
        ) {
          try {
            const date = new Date(label);
            if (!isNaN(date.getTime())) {
              label = date.toLocaleDateString();
            }
          } catch (e) {
            console.log("Not a valid date:", label);
          }
        }

        if (!isNaN(Number(label))) {
          label = `${label}`;
        }

        if (value < 0) {
          value = Math.abs(value);
          label = `${label} (negative)`;
        }

        return {
          label: label,
          value: value,
          color: colors[index % colors.length],
        };
      })
      .sort((a: { value: number }, b: { value: number }) => b.value - a.value);
  }
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(1);
}

function isTimeSeriesData(rows: any[], labelColumn: string): boolean {
  if (rows.length < 2) return false;

  try {
    const firstDate = new Date(rows[0][labelColumn]);
    const secondDate = new Date(rows[1][labelColumn]);
    return !isNaN(firstDate.getTime()) && !isNaN(secondDate.getTime());
  } catch (e) {
    return false;
  }
}

function groupTimeSeriesData(
  rows: any[],
  labelColumn: string,
  valueColumn: string,
  period: "day" | "week" | "month" | "year" = "day"
) {
  const groupedData = new Map();

  rows.forEach((row) => {
    const date = new Date(row[labelColumn]);
    let key: string;

    switch (period) {
      case "day":
        key = date.toLocaleDateString();
        break;
      case "week":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toLocaleDateString();
        break;
      case "month":
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        break;
      case "year":
        key = date.getFullYear().toString();
        break;
    }

    if (!groupedData.has(key)) {
      groupedData.set(key, 0);
    }
    groupedData.set(key, groupedData.get(key) + Number(row[valueColumn]));
  });

  return Array.from(groupedData.entries()).map(([key, value]) => ({
    label: key,
    value: value,
  }));
}
