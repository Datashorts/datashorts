import { openaiClient } from '@/app/lib/clients';
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
      color?: string;
    }>;
    config: {
      title: string;
      description: string;
      chartType: "line" | "bar" | "scatter" | "pie";
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
 * Intelligently determines the appropriate chart type based on query context, domain, and data characteristics
 */
function determineChartType(userQuery: string, data: any[], schema: SchemaTable[]): "line" | "bar" | "scatter" | "pie" {
  const query = userQuery.toLowerCase();
  
  // 1. EXPLICIT CHART TYPE REQUESTS (Highest Priority)
  if (query.includes('line chart') || query.includes('line graph') || query.includes('trend line')) return 'line';
  if (query.includes('bar chart') || query.includes('bar graph') || query.includes('column chart')) return 'bar';
  if (query.includes('scatter plot') || query.includes('scatter chart') || query.includes('scatter graph')) return 'scatter';
  if (query.includes('pie chart') || query.includes('pie graph') || query.includes('donut chart')) return 'pie';
  
  // 2. DOMAIN-SPECIFIC INTELLIGENCE
  const tableName = schema[0]?.tableName?.toLowerCase() || '';
  const columns = schema[0]?.columns?.toLowerCase() || '';
  
  // Financial/Stock Data
  if (tableName.includes('stock') || tableName.includes('price') || tableName.includes('financial') || 
      columns.includes('price') || columns.includes('volume') || columns.includes('ticker')) {
    if (query.includes('correlation') || query.includes('relationship')) return 'scatter';
    if (query.includes('portfolio') || query.includes('allocation') || query.includes('distribution')) return 'pie';
    return 'line'; // Default for financial time series
  }
  
  // Sales/E-commerce Data
  if (tableName.includes('sales') || tableName.includes('order') || tableName.includes('revenue') ||
      columns.includes('quantity') || columns.includes('total_price') || columns.includes('customer')) {
    // HIGHEST PRIORITY: Categorical comparisons (even with time elements)
    if (query.includes('by category') || query.includes('by type') || query.includes('by size') || 
        query.includes('by region') || query.includes('by product') || query.includes('compare')) return 'bar';
    if (query.includes('market share') || query.includes('distribution') || query.includes('percentage')) return 'pie';
    if (query.includes('correlation') || query.includes('relationship') || query.includes('vs ')) return 'scatter';
    // LOWER PRIORITY: Time-based only if no categorical comparison
    if (query.includes('over time') || query.includes('monthly') || query.includes('daily')) return 'line';
  }
  
  // HR/Employee Data
  if (tableName.includes('employee') || tableName.includes('hr') || tableName.includes('staff') ||
      columns.includes('salary') || columns.includes('department') || columns.includes('performance')) {
    if (query.includes('by department') || query.includes('by role') || query.includes('by level')) return 'bar';
    if (query.includes('turnover') || query.includes('retention') || query.includes('over time')) return 'line';
    if (query.includes('composition') || query.includes('breakdown')) return 'pie';
  }
  
  // Healthcare Data
  if (tableName.includes('patient') || tableName.includes('medical') || tableName.includes('health') ||
      columns.includes('diagnosis') || columns.includes('treatment') || columns.includes('outcome')) {
    if (query.includes('survival') || query.includes('recovery') || query.includes('over time')) return 'line';
    if (query.includes('by condition') || query.includes('by treatment')) return 'bar';
    if (query.includes('risk factors') || query.includes('correlation')) return 'scatter';
  }
  
  // 3. QUERY PATTERN ANALYSIS (Fixed Priority Order)
  
  // Categorical comparison patterns (HIGHEST PRIORITY for predictions)
  const comparisonKeywords = ['compare', 'comparison', 'versus', 'vs', 'by category', 'by type', 
                             'by size', 'by region', 'by department', 'ranking', 'top', 'best', 'worst',
                             'which', 'rank', 'performance'];
  if (comparisonKeywords.some(keyword => query.includes(keyword))) {
    // Even if time keywords exist, prioritize categorical comparison for predictions
    return 'bar';
  }
  
  // Relationship/correlation patterns (HIGH PRIORITY)
  const correlationKeywords = ['correlation', 'relationship', 'association', 'dependency', 
                              'impact of', 'effect of', 'influence', 'between'];
  if (correlationKeywords.some(keyword => query.includes(keyword))) return 'scatter';
  
  // Distribution/proportion patterns (HIGH PRIORITY)
  const distributionKeywords = ['distribution', 'breakdown', 'composition', 'percentage', 'proportion', 
                               'share', 'allocation', 'split', 'pie'];
  if (distributionKeywords.some(keyword => query.includes(keyword))) return 'pie';
  
  // Time-based patterns (LOWER PRIORITY - only if no categorical comparison)
  const timeKeywords = ['trend', 'over time', 'monthly', 'daily', 'weekly', 'yearly', 'seasonal', 
                       'forecast', 'predict', 'future', 'next month', 'next year', 'historical'];
  if (timeKeywords.some(keyword => query.includes(keyword))) {
    // Double-check: if also asking for categorical breakdown, still use bar
    if (query.includes(' by ') && !query.includes('over time')) return 'bar';
    return 'line';
  }
  
  // 4. DATA CHARACTERISTICS ANALYSIS
  if (data && data.length > 0) {
    // Check for time-based data in labels
    const hasTimeData = data.some(item => {
      const label = String(item.label || '').toLowerCase();
      return label.includes('date') || label.includes('time') || 
             label.includes('year') || label.includes('month') ||
             label.includes('day') || label.includes('week') ||
             !isNaN(Date.parse(String(item.label)));
    });
    
    if (hasTimeData) return 'line';
    
    // Check data size and distribution for pie charts
    if (data.length >= 2 && data.length <= 8) {
      const allPositive = data.every(item => (item.value || 0) > 0);
      if (allPositive) {
        const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
        const hasReasonableDistribution = data.every(item => ((item.value || 0) / total) >= 0.03);
        if (hasReasonableDistribution) return 'pie';
      }
    }
    
    // For small categorical datasets, prefer bar charts
    if (data.length >= 2 && data.length <= 20) return 'bar';
  }
  
  // 5. PREDICTION-SPECIFIC DEFAULTS
  
  // If query contains prediction keywords but no clear pattern, analyze context
  if (query.includes('predict') || query.includes('forecast') || query.includes('future')) {
    // Categorical predictions
    if (query.includes(' by ') || query.includes('category') || query.includes('type')) return 'bar';
    // Distribution predictions
    if (query.includes('share') || query.includes('percentage') || query.includes('proportion')) return 'pie';
    // Default to line for time-based predictions
    return 'line';
  }
  
  // 6. FALLBACK LOGIC
  return 'bar'; // Most versatile for general predictions
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
    content: `You are an advanced predictive analytics agent that intelligently analyzes data across various domains and generates sophisticated forecasts using appropriate statistical methods.

CORE CAPABILITIES:
1. Domain-aware analysis (e-commerce, finance, healthcare, manufacturing, etc.)
2. Intelligent data pattern recognition
3. Context-sensitive prediction methodology selection
4. Dynamic chart type optimization
5. Comprehensive uncertainty quantification

DOMAIN-SPECIFIC INTELLIGENCE:

📊 SALES & E-COMMERCE:
- Revenue forecasting, demand planning, customer behavior
- Seasonal patterns, promotional impact, inventory optimization
- Methods: SARIMA, Prophet, regression with seasonality

💰 FINANCE & ECONOMICS:
- Stock prices, portfolio performance, risk assessment
- Economic indicators, market volatility, investment returns
- Methods: GARCH, Monte Carlo, time series econometrics

🏥 HEALTHCARE & LIFE SCIENCES:
- Patient outcomes, resource utilization, epidemic modeling
- Treatment effectiveness, capacity planning, population health
- Methods: Survival analysis, epidemiological models, Bayesian inference

🏭 MANUFACTURING & OPERATIONS:
- Production forecasting, quality control, maintenance scheduling
- Equipment reliability, supply chain optimization, capacity planning
- Methods: Control charts, reliability models, optimization algorithms

👥 HR & WORKFORCE:
- Employee turnover, recruitment needs, performance metrics
- Training effectiveness, compensation analysis, workforce planning
- Methods: Logistic regression, survival models, clustering

🌐 TECHNOLOGY & IT:
- User growth, system performance, resource utilization
- App usage, server load, network traffic, security incidents
- Methods: Growth models, anomaly detection, capacity planning

INTELLIGENT CHART TYPE SELECTION:

🔍 ANALYSIS-BASED SELECTION:
- Time Series Data → LINE (trends, forecasts, temporal patterns)
- Categorical Comparisons → BAR (performance by category, rankings)
- Correlation Analysis → SCATTER (relationships, dependencies)
- Distribution Analysis → PIE (market share, proportions)

📈 CONTEXT-AWARE DECISIONS:
- Financial data with volatility → LINE with confidence bands
- Sales by region/product → BAR for easy comparison
- Customer segments → PIE for market share view
- Performance metrics correlation → SCATTER for insights

PREDICTION METHODOLOGY SELECTION:

📊 DATA PATTERN RECOGNITION:
- Seasonal patterns → SARIMA, Prophet, Seasonal decomposition
- Linear trends → Linear regression, polynomial regression
- Non-linear patterns → Neural networks, ensemble methods
- Volatile data → GARCH, exponential smoothing
- Categorical outcomes → Classification models, decision trees

🎯 BUSINESS CONTEXT INTEGRATION:
- Short-term forecasts (days/weeks) → Simple exponential smoothing
- Medium-term forecasts (months) → SARIMA, regression models
- Long-term forecasts (years) → Prophet, structural models
- High-frequency data → ARIMA, state space models

CONFIDENCE INTERVAL CALCULATION:
- Statistical significance testing
- Bootstrap confidence intervals
- Bayesian credible intervals
- Monte Carlo simulation bounds
- Historical error-based ranges

DATA QUALITY ASSESSMENT:
- Missing data patterns and handling
- Outlier detection and treatment
- Stationarity testing for time series
- Autocorrelation analysis
- Trend and seasonality decomposition

PREDICTION VALIDATION:
- Cross-validation techniques
- Hold-out sample testing
- Walk-forward validation
- Residual analysis
- Model performance metrics (MAPE, RMSE, MAE)

BUSINESS IMPACT QUANTIFICATION:
- Revenue impact of predictions
- Risk assessment and mitigation
- Actionable insights generation
- Decision support recommendations
- ROI of predictive insights

RETURN FORMAT - Strict JSON:
{
  "content": {
    "title": string, // Domain-specific, actionable title
    "summary": string, // Business-focused summary with key insights
    "details": string[], // Methodology, assumptions, limitations, business implications
    "metrics": {
      [key: string]: number | string // Key performance indicators and prediction accuracy
    },
    "method": string // Specific algorithm with brief explanation
  },
  "prediction": {
    "data": [
      {
        "label": string, // Contextually appropriate labels
        "value": number, // Predicted values with proper scaling
        "confidenceInterval": { "lower": number, "upper": number }, // Statistical confidence bounds
        "color": string // Visually distinct colors for categories
      }
    ],
    "config": {
      "title": string, // Clear, business-relevant title
      "description": string, // Explanation of what prediction shows
      "chartType": "line" | "bar" | "scatter" | "pie", // Optimal for data and context
      "xAxis": {
        "label": string, // Descriptive axis labels
        "type": "category" | "time" | "linear" // Appropriate for data type
      },
      "yAxis": {
        "label": string, // Include units and scale
        "type": "number"
      }
    }
  }
}

CRITICAL INSTRUCTIONS:
1. Analyze the domain context from table names and column types
2. Select prediction methods appropriate for the business problem
3. Choose chart types that best communicate insights to stakeholders
4. Provide actionable business insights, not just statistical outputs
5. Include realistic confidence intervals based on data quality
6. Explain limitations and assumptions clearly
7. Focus on business value and decision-making support

Return JSON format only.`,
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
    const columns = Object.keys(queryResult.rows[0]);
    
    let timeColumns = columns.filter(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time') || 
      col.toLowerCase().includes('year') || 
      col.toLowerCase().includes('month')
    );
    
    let valueColumns = columns.filter(col => {
      const firstValue = queryResult.rows[0][col];
      return typeof firstValue === 'number' || !isNaN(Number(firstValue));
    });

    // If no obvious time columns found, try to infer from data patterns
    if (timeColumns.length === 0) {
      for (const col of columns) {
        const values = queryResult.rows.map(row => row[col]);
        const couldBeTimeColumn = values.every((val, i) => {
          if (i === 0) return true;
          const prev = new Date(values[i-1]).getTime() || Number(values[i-1]);
          const curr = new Date(val).getTime() || Number(val);
          return !isNaN(prev) && !isNaN(curr) && curr >= prev;
        });
        
        if (couldBeTimeColumn) {
          timeColumns.push(col);
        }
      }
    }

/**
 * Analyzes the domain context based on schema and query to provide intelligent predictions
 */
function analyzeDomainContext(schema: SchemaTable[], query: string) {
  const tableName = schema[0]?.tableName?.toLowerCase() || '';
  const columns = schema[0]?.columns?.toLowerCase() || '';
  const queryLower = query.toLowerCase();
  
  let domain = 'General Business';
  let businessType = 'Analytics';
  let keyMetrics: string[] = [];
  let businessCycle = 'Standard';
  let stakeholders = 'Management';
  let primaryInsight = 'Performance';
  let tableContext = 'Transactional data';
  let relationships = 'Time-based progression';
  let seasonalityHints = 'None detected';
  
  // E-commerce/Sales Domain
  if (tableName.includes('sales') || tableName.includes('order') || tableName.includes('purchase') ||
      tableName.includes('product') || tableName.includes('customer') || tableName.includes('revenue')) {
    domain = 'E-commerce & Sales';
    businessType = 'Retail/E-commerce';
    keyMetrics = ['Revenue', 'Units Sold', 'Customer Acquisition', 'Average Order Value'];
    businessCycle = 'Seasonal with promotional periods';
    stakeholders = 'Sales managers, Marketing teams, Executive leadership';
    primaryInsight = 'Sales performance and customer behavior';
    tableContext = 'Transaction and customer data';
    relationships = 'Customer purchase patterns over time';
    seasonalityHints = 'Holiday seasons, promotional periods, weekend patterns';
  }
  
  // Financial Domain
  else if (tableName.includes('stock') || tableName.includes('price') || tableName.includes('trading') ||
           tableName.includes('portfolio') || tableName.includes('investment') || tableName.includes('financial')) {
    domain = 'Finance & Investment';
    businessType = 'Financial Services';
    keyMetrics = ['Returns', 'Volatility', 'Risk Metrics', 'Portfolio Performance'];
    businessCycle = 'Market cycles with high volatility';
    stakeholders = 'Investors, Fund managers, Risk analysts';
    primaryInsight = 'Investment performance and market trends';
    tableContext = 'Market and trading data';
    relationships = 'Price movements and market correlations';
    seasonalityHints = 'Market cycles, earnings seasons, economic calendar events';
  }
  
  // HR/Employee Domain
  else if (tableName.includes('employee') || tableName.includes('hr') || tableName.includes('staff') ||
           tableName.includes('payroll') || tableName.includes('performance')) {
    domain = 'Human Resources';
    businessType = 'Workforce Management';
    keyMetrics = ['Employee Retention', 'Performance Ratings', 'Compensation', 'Productivity'];
    businessCycle = 'Annual cycles with quarterly reviews';
    stakeholders = 'HR managers, Department heads, C-suite';
    primaryInsight = 'Workforce optimization and talent management';
    tableContext = 'Employee performance and organizational data';
    relationships = 'Career progression and performance correlations';
    seasonalityHints = 'Annual review cycles, hiring seasons, bonus periods';
  }
  
  // Healthcare Domain
  else if (tableName.includes('patient') || tableName.includes('medical') || tableName.includes('health') ||
           tableName.includes('treatment') || tableName.includes('diagnosis')) {
    domain = 'Healthcare & Life Sciences';
    businessType = 'Healthcare Services';
    keyMetrics = ['Patient Outcomes', 'Treatment Effectiveness', 'Resource Utilization', 'Cost per Patient'];
    businessCycle = 'Seasonal health patterns';
    stakeholders = 'Healthcare providers, Administrators, Policy makers';
    primaryInsight = 'Patient care optimization and resource planning';
    tableContext = 'Clinical and patient care data';
    relationships = 'Treatment outcomes and patient characteristics';
    seasonalityHints = 'Flu seasons, holiday periods, demographic patterns';
  }
  
  // Manufacturing/Operations Domain
  else if (tableName.includes('production') || tableName.includes('manufacturing') || tableName.includes('inventory') ||
           tableName.includes('supply') || tableName.includes('quality')) {
    domain = 'Manufacturing & Operations';
    businessType = 'Industrial Operations';
    keyMetrics = ['Production Volume', 'Quality Metrics', 'Efficiency Rates', 'Inventory Turnover'];
    businessCycle = 'Production schedules with maintenance cycles';
    stakeholders = 'Operations managers, Quality assurance, Supply chain teams';
    primaryInsight = 'Operational efficiency and quality optimization';
    tableContext = 'Production and operational data';
    relationships = 'Process efficiency and quality correlations';
    seasonalityHints = 'Production cycles, maintenance schedules, demand seasonality';
  }
  
  // Technology/IT Domain
  else if (tableName.includes('user') || tableName.includes('app') || tableName.includes('system') ||
           tableName.includes('server') || tableName.includes('traffic') || tableName.includes('log')) {
    domain = 'Technology & IT';
    businessType = 'Technology Services';
    keyMetrics = ['User Engagement', 'System Performance', 'Resource Utilization', 'Error Rates'];
    businessCycle = 'Continuous deployment with usage patterns';
    stakeholders = 'Product managers, Engineering teams, DevOps';
    primaryInsight = 'System optimization and user experience';
    tableContext = 'Application and system performance data';
    relationships = 'Usage patterns and system performance';
    seasonalityHints = 'Business hours, weekly patterns, release cycles';
  }
  
  return {
    domain,
    businessType,
    keyMetrics,
    businessCycle,
    stakeholders,
    primaryInsight,
    tableContext,
    relationships,
    seasonalityHints
  };
}

/**
 * Provides reasoning for chart type selection based on context
 */
function getChartTypeReasoning(query: string, chartType: string, domainContext: any): string {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes(`${chartType} chart`)) {
    return `User explicitly requested ${chartType} chart`;
  }
  
  switch (chartType) {
    case 'line':
      if (queryLower.includes('trend') || queryLower.includes('over time')) {
        return `Time series analysis best shown with line chart for ${domainContext.domain} trend visualization`;
      }
      return `Line chart optimal for temporal patterns in ${domainContext.businessType} data`;
      
    case 'bar':
      if (queryLower.includes('by ') || queryLower.includes('compare')) {
        return `Categorical comparison in ${domainContext.domain} context best visualized with bar chart`;
      }
      return `Bar chart ideal for comparing discrete categories in ${domainContext.businessType}`;
      
    case 'scatter':
      return `Scatter plot optimal for analyzing relationships and correlations in ${domainContext.domain} data`;
      
    case 'pie':
      return `Pie chart best for showing proportional distribution in ${domainContext.businessType} context`;
      
    default:
      return `Chart type selected based on ${domainContext.domain} data characteristics and query analysis`;
  }
}

/**
 * Assesses data quality for better prediction confidence
 */
function assessDataQuality(data: any[]): string {
  if (!data || data.length === 0) return 'No data available';
  
  const sampleSize = data.length;
  const columns = Object.keys(data[0] || {});
  
  // Check for missing values
  let missingValueCount = 0;
  data.forEach(row => {
    columns.forEach(col => {
      if (row[col] === null || row[col] === undefined || row[col] === '') {
        missingValueCount++;
      }
    });
  });
  
  const completenessRate = ((columns.length * sampleSize - missingValueCount) / (columns.length * sampleSize)) * 100;
  
  if (sampleSize < 10) return 'Limited sample size, low confidence';
  if (sampleSize < 50) return 'Small sample size, moderate confidence';
  if (completenessRate < 80) return 'Data quality issues detected, adjusted confidence';
  if (sampleSize > 1000) return 'Large sample size, high confidence';
  
  return 'Good data quality, reliable predictions';
}

    // 4. Determine chart type based on user query, data, and domain context
    const suggestedChartType = determineChartType(userQuery, queryResult.rows, reconstructedSchema);

    // 5. Analyze domain context for better predictions
    const domainContext = analyzeDomainContext(reconstructedSchema, userQuery);

    // 6. Generate prediction using OpenAI with enhanced context
    const prompt = `
BUSINESS CONTEXT ANALYSIS:
User Query: "${userQuery}"
Domain: ${domainContext.domain}
Business Type: ${domainContext.businessType}
Key Metrics: ${domainContext.keyMetrics.join(', ')}

CHART CONFIGURATION:
Suggested Chart Type: ${suggestedChartType}
Chart Reasoning: ${getChartTypeReasoning(userQuery, suggestedChartType, domainContext)}

DATABASE SCHEMA ANALYSIS:
${reconstructedSchema.map(table => `
Table: "${table.tableName}"
Domain Context: ${domainContext.tableContext}
Columns: ${table.columns}
Key Relationships: ${domainContext.relationships}
`).join("\n")}

HISTORICAL DATA SAMPLE:
${JSON.stringify(queryResult.rows.slice(0, 10), null, 2)}
${queryResult.rows.length > 10 ? `\n... and ${queryResult.rows.length - 10} more rows` : ''}
Total Records: ${queryResult.rowCount}

DATA CHARACTERISTICS:
Time Columns: ${timeColumns.join(', ') || 'None identified'}
Value Columns: ${valueColumns.join(', ')}
Data Quality: ${assessDataQuality(queryResult.rows)}
Seasonality Indicators: ${domainContext.seasonalityHints}

PREDICTION REQUIREMENTS:
- Generate forecasts that align with ${domainContext.domain} business practices
- Use prediction methods appropriate for ${domainContext.businessType} data patterns
- Consider ${domainContext.businessCycle} business cycles and seasonality
- Provide confidence intervals based on data volatility and sample size
- Focus on actionable insights for ${domainContext.stakeholders} stakeholders

CHART TYPE INSTRUCTION:
Use chartType "${suggestedChartType}" in your response config.
Ensure the visualization effectively communicates ${domainContext.primaryInsight} insights.

Generate a prediction that provides specific, actionable business value for this ${domainContext.domain} use case.
`;

    console.log("\n--- Domain-Aware Prediction Prompt ---");
    console.log("Domain Context:", domainContext);
    console.log("Suggested Chart Type:", suggestedChartType);

    console.log("\n--- Sending to OpenAI for Prediction ---");
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
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

    // 6. Ensure the chart type is set correctly
    if (!result.prediction.config.chartType) {
      result.prediction.config.chartType = suggestedChartType;
    }

    // 7. Add colors to data points if not present (useful for bar and pie charts)
    if (!result.prediction.data[0]?.color) {
      const colors = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', '#00BCD4', '#FF9800', '#795548'];
      result.prediction.data = result.prediction.data.map((item: any, index: number) => ({
        ...item,
        color: colors[index % colors.length]
      }));
    }

    // 8. Return the prediction results with the original query data
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
          chartType: "line",
          xAxis: { label: "", type: "category" },
          yAxis: { label: "", type: "number" }
        }
      }
    };
  }
}

export default predictive;