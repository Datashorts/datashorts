// lib/agents2/visualizer.ts - Enhanced with multiple trend lines
import OpenAI from "openai";
import { executeSQLQuery } from "@/app/lib/db/executeQuery";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VisualizationConfig {
  chartType: "bar" | "pie" | "line";
  title: string;
  description: string;
  xAxis?: string;
  yAxis?: string;
  legend?: boolean;
  stacked?: boolean;
  pieConfig?: {
    donut?: boolean;
    innerRadius?: number;
    outerRadius?: number;
    showPercentages?: boolean;
  };
  lineConfig?: {
    showPoints?: boolean;
    smooth?: boolean;
    showArea?: boolean;
    tension?: number;
    multiLine?: boolean;
    dataKeys?: string[];
    lineColors?: string[];
    lineNames?: string[];
  };
  barConfig?: {
    barThickness?: number;
    barPercentage?: number;
    categoryPercentage?: number;
    horizontal?: boolean;
  };
}

interface Message {
  role: string;
  content: string;
}

/**
 * Detect if query requires multiple trend lines
 */
function detectMultiLineTrend(query: string): boolean {
  const multiLineKeywords = [
    'compare', 'comparison', 'versus', 'vs', 'by type', 'by category',
    'by pizza type', 'by size', 'each', 'different', 'separate',
    'breakdown', 'split by', 'grouped by', 'per category'
  ];
  
  const lowerQuery = query.toLowerCase();
  return multiLineKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Visualizer Agent - Enhanced with multiple trend lines support
 */
export async function visualizer(
  messages: Message[],
  reconstructedSchema: any[],
  connectionId: string
) {
  try {
    console.log("🎨 Visualizer Agent - Starting with multi-line support");
    console.log("📊 Available tables:", reconstructedSchema.map((s) => s.tableName));

    const userQuery = messages[messages.length - 1].content;
    console.log("🔍 User query:", userQuery);

    // Detect if multiple trend lines are needed
    const requiresMultiLine = detectMultiLineTrend(userQuery);
    console.log("📈 Multiple trend lines needed:", requiresMultiLine);

    // Enhanced prompt for chart type detection
    const chartTypePrompt = `Analyze this query and determine the best chart type (bar, pie, or line).

User Query: "${userQuery}"

Rules:
1. Use LINE chart for:
   - Time series data (dates, timestamps, months, years)
   - Trends over time
   - Continuous data progression
   - Comparisons showing change over time
   - Multiple categories over time (use multiple lines)

2. Use BAR chart for:
   - Categorical comparisons at a single point in time
   - Rankings or top N items
   - Discrete categories without time progression

3. Use PIE chart for:
   - Parts of a whole
   - Percentage distributions
   - Single point in time composition

Available tables: ${reconstructedSchema.map((s) => s.tableName).join(", ")}

Return ONLY a JSON object:
{
  "chartType": "bar" | "pie" | "line",
  "reason": "brief explanation",
  "requiresTimeSeries": true/false,
  "requiresMultiLine": true/false
}`;

    const chartTypeResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a data visualization expert. You MUST respond with valid JSON only.",
        },
        {
          role: "user",
          content: chartTypePrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 200,
    });

    const chartTypeDecision = JSON.parse(
      chartTypeResponse.choices[0]?.message?.content || '{"chartType": "bar"}'
    );
    const chartType = chartTypeDecision.chartType || "bar";
    const needsMultiLine = chartTypeDecision.requiresMultiLine || requiresMultiLine;

    console.log("📊 Chart type decision:", chartTypeDecision);

    // Enhanced SQL generation
    const sqlPrompt = `Generate a SQL query for visualization.

User Query: "${userQuery}"
Chart Type: ${chartType}
Multiple Lines Needed: ${needsMultiLine}
Available Schema: ${JSON.stringify(reconstructedSchema, null, 2)}

Requirements:
${
  chartType === "line" && needsMultiLine
    ? `MULTI-LINE CHART - Return data with multiple value columns:
- First column: x-axis (dates/time periods) - name it clearly (e.g., 'month', 'date')
- Additional columns: one for each trend line (e.g., 'Margherita', 'Pepperoni', 'Hawaiian')
- Use CASE statements or multiple SUM() with filters to create separate columns
- GROUP BY the x-axis column
- ORDER BY the x-axis column

Example for comparing pizza types over time:
SELECT 
  TO_CHAR(order_datetime, 'YYYY-MM') as month,
  SUM(CASE WHEN pizza_type = 'Margherita' THEN total_price ELSE 0 END) as Margherita,
  SUM(CASE WHEN pizza_type = 'Pepperoni' THEN total_price ELSE 0 END) as Pepperoni,
  SUM(CASE WHEN pizza_type = 'Hawaiian' THEN total_price ELSE 0 END) as Hawaiian
FROM pizza_sales
GROUP BY TO_CHAR(order_datetime, 'YYYY-MM')
ORDER BY month`
    : chartType === "line"
      ? `SINGLE-LINE CHART:
- First column: x-axis (dates/time)
- Second column: y-axis (numeric value)
- ORDER BY x-axis column
- Use TO_CHAR() for monthly grouping`
      : chartType === "bar"
        ? `BAR CHART - Categorical data:
- First column: category labels
- Second column: numeric values`
        : `PIE CHART - Parts of whole:
- First column: category labels
- Second column: numeric values`
}

Return this exact JSON structure:
{
  "sqlQuery": "SELECT statement",
  "xAxisColumn": "name of x-axis column",
  "yAxisColumn": "name of primary y-axis column",
  "additionalColumns": ["column2", "column3"],
  "xAxisLabel": "display label",
  "yAxisLabel": "display label",
  "columnLabels": {
    "column1": "Display Name 1",
    "column2": "Display Name 2"
  },
  "requiresTimeFormatting": true or false,
  "isMultiLine": true or false
}`;

    const sqlResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a SQL expert. You MUST respond with valid JSON only.",
        },
        {
          role: "user",
          content: sqlPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 400,
    });

    let sqlDecision;
    try {
      sqlDecision = JSON.parse(
        sqlResponse.choices[0]?.message?.content ||
          '{"sqlQuery": "SELECT * FROM table LIMIT 10"}'
      );
    } catch (parseError) {
      console.error("Failed to parse SQL response:", sqlResponse.choices[0]?.message?.content);
      throw new Error("Invalid SQL response format from AI");
    }

    console.log("🔍 Generated SQL:", sqlDecision.sqlQuery);
    console.log("📊 Multi-line config:", {
      isMultiLine: sqlDecision.isMultiLine,
      additionalColumns: sqlDecision.additionalColumns,
    });

    // Execute the SQL query
    const queryResult = await executeSQLQuery(connectionId, sqlDecision.sqlQuery);

    if (!queryResult.success) {
      throw new Error(`Query execution failed: ${queryResult.error}`);
    }

    console.log("✅ Query executed, rows returned:", queryResult.rows?.length || 0);

    // Transform data for visualization
    let visualizationData;
    const isMultiLine = sqlDecision.isMultiLine && chartType === "line";

    if (isMultiLine) {
      // Multi-line transformation - keep all columns
      visualizationData = queryResult.rows?.map((row: any) => {
        const keys = Object.keys(row);
        const labelKey = sqlDecision.xAxisColumn || keys[0];
        
        let label = row[labelKey];
        if (sqlDecision.requiresTimeFormatting && (label instanceof Date || !isNaN(Date.parse(label)))) {
          const date = new Date(label);
          label = date.toLocaleDateString();
        }

        // Include all numeric columns for multiple lines
        const dataPoint: any = { label: String(label) };
        keys.forEach(key => {
          if (key !== labelKey && typeof row[key] === 'number') {
            dataPoint[key] = row[key];
          }
        });

        return dataPoint;
      }) || [];
    } else {
      // Single line/bar/pie transformation
      visualizationData = queryResult.rows?.map((row: any, index: number) => {
        const keys = Object.keys(row);
        const labelKey = sqlDecision.xAxisColumn || keys[0];
        const valueKey = sqlDecision.yAxisColumn || keys[1] || keys[0];

        let label = row[labelKey];
        if (chartType === "line" && sqlDecision.requiresTimeFormatting) {
          if (label instanceof Date || !isNaN(Date.parse(label))) {
            const date = new Date(label);
            label = date.toLocaleDateString();
          }
        }

        return {
          label: String(label || `Item ${index + 1}`),
          value: Number(row[valueKey]) || 0,
        };
      }) || [];
    }

    console.log("📊 Transformed data:", visualizationData.length, "points");

    // Generate analysis
    const analysisPrompt = `Analyze this ${chartType} chart data.

User Query: "${userQuery}"
Chart Type: ${chartType}
Multi-line: ${isMultiLine}
Sample Data: ${JSON.stringify(visualizationData.slice(0, 5), null, 2)}

Provide insights in this exact JSON structure:
{
  "title": "Chart Title (max 60 chars)",
  "summary": "Brief overview",
  "details": ["insight 1", "insight 2", "insight 3"],
  "metrics": {
    "total": 0,
    "average": 0,
    "highest": "label: value",
    "lowest": "label: value"
  }
}`;

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a data analyst. You MUST respond with valid JSON only.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 600,
    });

    let analysis;
    try {
      analysis = JSON.parse(
        analysisResponse.choices[0]?.message?.content ||
          '{"title": "Data Visualization", "summary": "Chart generated", "details": [], "metrics": {}}'
      );
    } catch (parseError) {
      analysis = {
        title: "Data Visualization",
        summary: "Chart generated successfully",
        details: ["Data has been visualized"],
        metrics: {}
      };
    }

    // Create configuration
    const config: VisualizationConfig = {
      chartType: chartType as "bar" | "pie" | "line",
      title: analysis.title,
      description: analysis.summary,
      xAxis: sqlDecision.xAxisLabel || "Category",
      yAxis: sqlDecision.yAxisLabel || "Value",
      legend: true,
      stacked: false,
    };

    // Add chart-specific configurations
    if (chartType === "line") {
      // Get data keys for multiple lines
      const dataKeys = isMultiLine 
        ? Object.keys(visualizationData[0] || {}).filter(k => k !== 'label')
        : ['value'];
      
      // Get display names for each line
      const lineNames = dataKeys.map(key => 
        sqlDecision.columnLabels?.[key] || 
        key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
      );

      config.lineConfig = {
        showPoints: true,
        smooth: true,
        showArea: false,
        tension: 0.4,
        multiLine: isMultiLine,
        dataKeys: dataKeys,
        lineNames: lineNames,
      };
    } else if (chartType === "pie") {
      config.pieConfig = {
        donut: false,
        showPercentages: true,
      };
    } else if (chartType === "bar") {
      config.barConfig = {
        barThickness: 40,
        horizontal: false,
      };
    }

    return {
      content: {
        title: analysis.title,
        summary: analysis.summary,
        details: analysis.details || [],
        metrics: analysis.metrics || {},
      },
      visualization: {
        chartType: chartType,
        data: visualizationData,
        config: config,
      },
      sqlQuery: sqlDecision.sqlQuery,
      queryResult: queryResult,
    };
  } catch (error) {
    console.error("❌ Error in visualizer agent:", error);
    throw error;
  }
}