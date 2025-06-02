import React, { useState } from "react";
import PredictiveResponse from "./PredictiveResponse";
import PieChart from "@/components/PieChart";
import BarChart from "@/components/BarChart";
import { Bookmark } from "lucide-react";

// Helper function to safely format cell values
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  
  // Handle objects by converting to JSON string
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Return strings and numbers as is
  return String(value);
}

interface AgentResponseProps {
  agentType: string;
  agentOutput: any;
  onOptionClick?: (opt: string) => void;
  userQuery?: string;
  onUserQueryChange?: (v: string) => void;
  onSubmitResponse?: (v: string) => void;
  expand?: boolean;
  onExpand?: (isExpanded: boolean) => void;
  onBookmark?: () => void;
  onChoose?: (opt: string) => void;
  selected?: string;
  connectionId?: string;
}

const Card: React.FC<{
  title?: string;
  children: React.ReactNode;
  gradient?: boolean;
  className?: string;
  showBookmark?: boolean;
}> = ({
  title,
  children,
  gradient = false,
  className = "",
  showBookmark = false,
}) => (
  <div
    className={`relative bg-gradient-to-b from-[#151619] to-[#0d0e10] rounded-lg p-5 space-y-3 
                shadow-lg ${gradient ? "border border-blue-500/20" : "shadow-blue-500/10"} 
                backdrop-blur-sm ${className}`}
  >
    {gradient && (
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
    )}
    {showBookmark && (
      <div className="absolute top-3 right-3 text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">
        <Bookmark size={18} />
      </div>
    )}
    {title && (
      <h3 className="text-lg font-medium text-gray-100 flex items-center">
        <div className="w-1 h-5 bg-blue-500 rounded mr-2" />
        {title}
      </h3>
    )}
    <div className="relative z-10">{children}</div>
  </div>
);

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "text";
  size?: "sm" | "md" | "lg";
}> = ({
  children,
  onClick,
  selected = false,
  disabled = false,
  className = "",
  variant = "secondary",
  size = "md",
}) => {
  const baseClasses =
    "rounded font-medium transition-all duration-150 ease-in-out";

  const variantClasses = {
    primary:
      selected || !disabled
        ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
        : "bg-[#333] text-gray-400 cursor-not-allowed",
    secondary: selected
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : disabled
        ? "bg-[#1b1c1d] text-gray-500 cursor-not-allowed"
        : "bg-[#1b1c1d] hover:bg-[#2a2a2a] text-gray-200",
    text: disabled
      ? "text-gray-500 cursor-not-allowed"
      : "text-blue-400 hover:text-blue-300",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-2",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <div className="bg-gradient-to-br from-[#1b1c1d] to-[#161718] p-3 rounded border border-blue-500/10 hover:border-blue-500/20 transition-colors duration-150">
    <p className="text-xs text-gray-400 capitalize mb-1">{label}</p>
    <p className="font-medium text-gray-200">{formatValue(value)}</p>
  </div>
);

// New component for showing query results with pagination
const QueryResultTable: React.FC<{
  queryResult: any;
  initialRowCount?: number;
}> = ({ queryResult, initialRowCount = 10 }) => {
  const [showAllRows, setShowAllRows] = useState(false);
  const [rowsToShow, setRowsToShow] = useState(initialRowCount);
  
  if (!queryResult) {
    return (
      <div className="bg-yellow-900/20 inline-block px-3 py-2 rounded-lg mb-3">
        <p className="text-yellow-300 text-sm">No query results available</p>
      </div>
    );
  }
  
  if (!queryResult.success) {
    return (
      <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/20">
        <p className="text-red-400">
          Error: {queryResult.error || "Failed to execute query"}
        </p>
      </div>
    );
  }
  
  if (!queryResult.rows || queryResult.rows.length === 0) {
    return (
      <div className="bg-blue-900/20 inline-block px-3 py-2 rounded-lg mb-3">
        <p className="text-blue-300 text-sm">Query returned no results</p>
      </div>
    );
  }
  
  const totalRows = queryResult.rows.length;
  const hasMoreRows = totalRows > rowsToShow;
  
  const handleShowMore = () => {
    if (showAllRows) {
      setRowsToShow(initialRowCount);
      setShowAllRows(false);
    } else {
      setRowsToShow(totalRows);
      setShowAllRows(true);
    }
  };

  return (
    <>
      <div className="bg-blue-900/20 inline-block px-3 py-1 rounded-full mb-3">
        <p className="text-blue-300 text-sm">
          Rows returned: {queryResult.rowCount}
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-blue-500/20">
        <table className="min-w-full text-sm">
          <thead className="bg-gradient-to-r from-[#151821] to-[#0f1015]">
            <tr>
              {Object.keys(queryResult.rows[0]).map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left font-medium text-gray-100 border-b border-blue-500/20"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-500/10">
            {queryResult.rows.slice(0, rowsToShow).map(
              (row: any, i: number) => (
                <tr
                  key={i}
                  className="hover:bg-blue-500/5 transition-colors duration-150"
                >
                  {Object.values(row).map(
                    (val: any, j: number) => (
                      <td
                        key={j}
                        className="px-4 py-3 whitespace-nowrap text-gray-300"
                      >
                        {formatValue(val)}
                      </td>
                    )
                  )}
                </tr>
              )
            )}
            {/* Show 'more rows' message if there are more than the limit */}
            {hasMoreRows && !showAllRows && (
              <tr>
                <td 
                  colSpan={Object.keys(queryResult.rows[0]).length}
                  className="px-4 py-3 text-center text-gray-400 italic"
                >
                  ... and {totalRows - rowsToShow} more rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalRows > initialRowCount && (
        <Button
          onClick={handleShowMore}
          variant="text"
          className="mt-2 flex items-center space-x-1"
        >
          <span>{showAllRows ? "Show Less" : `Show All (${totalRows} rows)`}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${showAllRows ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>
      )}
    </>
  );
};

const AgentResponse: React.FC<AgentResponseProps> = ({
  agentType,
  agentOutput,
  onOptionClick,
  userQuery,
  onUserQueryChange,
  onSubmitResponse,
  expand,
  onExpand,
  onBookmark,
  onChoose,
  selected,
  connectionId,
}) => {
  const [isExpanded, setIsExpanded] = useState(expand);
  const [custom, setCustom] = useState<string>("");

  const submitEnabled = selected !== "" || custom.trim() !== "";
  const choose = (opt: string) => {
    onChoose?.(opt);
    setCustom("");
  };
  const type = (v: string) => {
    setCustom(v);
    onChoose?.(v);
  };
  const submit = () => onSubmitResponse?.(selected || custom);

  switch (agentType) {
    /* ───────────── 1. ERROR ───────────── */
    case "error":
      return (
        <Card gradient>
          <div className="flex items-center space-x-2 mb-3">
            <div className="animate-pulse w-2 h-2 rounded-full bg-red-500" />
            <p className="text-sm text-red-400 font-medium">Error</p>
          </div>
          <p className="font-medium text-gray-200 leading-relaxed">
            {agentOutput.message || "An error occurred"}
          </p>
        </Card>
      );

    /* ───────────── 2. LOADING ───────────── */
    case "loading":
      return (
        <Card gradient>
          <div className="flex items-center space-x-2 mb-3">
            <div className="animate-pulse w-2 h-2 rounded-full bg-blue-500" />
            <p className="text-sm text-blue-400 font-medium">Processing</p>
          </div>
          <p className="font-medium text-gray-200 leading-relaxed">
            {agentOutput.message || "Processing your request..."}
          </p>
        </Card>
      );

    /* ───────────── 3. ANALYZE ───────────── */
    case "analyze":
      return (
        <Card gradient>
          <div className="flex items-center space-x-2 mb-3">
            <div className="animate-pulse w-2 h-2 rounded-full bg-blue-500" />
            <p className="text-sm text-blue-400 font-medium">Analysis</p>
          </div>
          <p className="font-medium text-gray-200 leading-relaxed">
            {agentOutput.analysis || "Analysis in progress…"}
          </p>
        </Card>
      );

    /* ───────────── PREDICTIVE AGENT ───────────── */
    case "predictive":
      return (
        <PredictiveResponse
          content={agentOutput.content}
          prediction={agentOutput.prediction}
          sqlQuery={agentOutput.sqlQuery}
          queryResult={agentOutput.queryResult}
        />
      );

    /* ───────────── 5. PIPELINE2 (detailed) ───────────── */
    case "pipeline2": {
      return (
        <div className="space-y-6">
          {/* 5.1 Task analysis */}
          <Card title="Task Analysis" gradient>
            <p className="text-gray-200 leading-relaxed">
              {agentOutput.taskResult?.reason}
            </p>
          </Card>

          {/* SQL Query */}
          {agentOutput.analysisResult?.sqlQuery && (
            <Card title="SQL Query">
              <pre className="whitespace-pre-wrap text-xs bg-[#0d0e10] p-3 rounded-lg border border-blue-500/10 text-gray-300 overflow-x-auto">
                {agentOutput.analysisResult.sqlQuery}
              </pre>
            </Card>
          )}
          
          {/* Query Results */}
          {agentOutput.analysisResult?.queryResult && (
            <Card title="Query Results">
              <QueryResultTable 
                queryResult={agentOutput.analysisResult.queryResult} 
                initialRowCount={10}
              />
            </Card>
          )}

          {/* 5.2 Main analysis (summary/details/metrics or visualizer branch) */}
          {agentOutput.analysisResult && (
            <>
              {agentOutput.taskResult?.next === "visualizer" ? (
                /* ---------- VISUALIZER branch ---------- */
                <>
                  <Card
                    title={agentOutput.analysisResult.content?.title || "Visualization"}
                    gradient
                  >
                    <p className="text-gray-200 leading-relaxed">
                      {agentOutput.analysisResult.content?.summary || "Visualization analysis"}
                    </p>

                    {agentOutput.analysisResult.content?.details?.length > 0 && (
                      <ul className="list-disc list-inside space-y-2 mt-3">
                        {agentOutput.analysisResult.content.details.map(
                          (d: string, i: number) => (
                            <li
                              key={i}
                              className="text-gray-200 leading-relaxed"
                            >
                              {d}
                            </li>
                          )
                        )}
                      </ul>
                    )}

                    {agentOutput.analysisResult.content?.metrics &&
                      Object.keys(agentOutput.analysisResult.content.metrics)
                        .length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                          {Object.entries(
                            agentOutput.analysisResult.content.metrics
                          ).map(([k, v]) => (
                            <MetricCard
                              key={k}
                              label={k}
                              value={
                                typeof v === "string" || typeof v === "number"
                                  ? v
                                  : String(v)
                              }
                            />
                          ))}
                        </div>
                      )}
                  </Card>

                  {/* chart */}
                  {agentOutput.analysisResult.visualization && (
                    <Card
                      title={
                        agentOutput.analysisResult.visualization.config?.title || "Visualization"
                      }
                    >
                      <div className="p-4 bg-[#0d0e10]/80 rounded-lg">
                        {agentOutput.analysisResult.visualization.chartType ===
                        "pie" ? (
                          <PieChart
                            data={agentOutput.analysisResult.visualization.data}
                            config={{
                              donut: false,
                              showPercentages: true,
                              ...(agentOutput.analysisResult.visualization.config?.pieConfig || {})
                            }}
                          />
                        ) : (
                          <BarChart
                            data={agentOutput.analysisResult.visualization.data}
                            config={{
                              barThickness: 40,
                              horizontal: false,
                              showGridLines: true,
                              xAxisLabel:
                                agentOutput.analysisResult.visualization.config?.xAxis,
                              yAxisLabel:
                                agentOutput.analysisResult.visualization.config?.yAxis,
                            }}
                          />
                        )}
                      </div>
                    </Card>
                  )}
                </>
              ) : agentOutput.taskResult?.next === "predictive" ? (
                /* ---------- PREDICTIVE branch ---------- */
                <PredictiveResponse
                  content={agentOutput.analysisResult.content}
                  prediction={agentOutput.analysisResult.prediction}
                  sqlQuery={agentOutput.analysisResult.sqlQuery}
                  queryResult={agentOutput.analysisResult.queryResult}
                />
              ) : (
                /* ---------- RESEARCHER branch ---------- */
                <>
                  <Card title={agentOutput.analysisResult.content?.title || "Summary"} gradient>
                    <p className="text-gray-200 leading-relaxed">
                      {agentOutput.analysisResult.summary || agentOutput.analysisResult.content?.summary || "Analysis"}
                    </p>
                  </Card>

                  {agentOutput.analysisResult.details?.length > 0 && (
                    <Card title="Details">
                      <ul className="list-disc list-inside space-y-2">
                        {agentOutput.analysisResult.details.map(
                          (d: string, i: number) => (
                            <li key={i} className="text-gray-200 leading-relaxed">
                              {d}
                            </li>
                          )
                        )}
                      </ul>
                    </Card>
                  )}
                  
                  {agentOutput.analysisResult.content?.details?.length > 0 && (
                    <Card title="Details">
                      <ul className="list-disc list-inside space-y-2">
                        {agentOutput.analysisResult.content.details.map(
                          (d: string, i: number) => (
                            <li key={i} className="text-gray-200 leading-relaxed">
                              {d}
                            </li>
                          )
                        )}
                      </ul>
                    </Card>
                  )}

                  {agentOutput.analysisResult.metrics &&
                    Object.keys(agentOutput.analysisResult.metrics).length > 0 && (
                      <Card title="Metrics">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {Object.entries(
                            agentOutput.analysisResult.metrics
                          ).map(([k, v]) => (
                            <MetricCard
                              key={k}
                              label={k}
                              value={
                                typeof v === "string" || typeof v === "number"
                                  ? v
                                  : String(v)
                              }
                            />
                          ))}
                        </div>
                      </Card>
                    )}
                    
                  {agentOutput.analysisResult.content?.metrics &&
                    Object.keys(agentOutput.analysisResult.content.metrics).length > 0 && (
                      <Card title="Metrics">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {Object.entries(
                            agentOutput.analysisResult.content.metrics
                          ).map(([k, v]) => (
                            <MetricCard
                              key={k}
                              label={k}
                              value={
                                typeof v === "string" || typeof v === "number"
                                  ? v
                                  : String(v)
                              }
                            />
                          ))}
                        </div>
                      </Card>
                    )}
                </>
              )}
            </>
          )}

          {/* 5.4 Debug Info (only when expanded) */}
          {isExpanded && agentOutput.debug && (
            <Card title="Debug Info">
              <pre className="whitespace-pre-wrap text-xs bg-[#0d0e10] p-3 rounded-lg border border-blue-500/10 text-gray-300 overflow-x-auto">
                {`Message:       ${agentOutput.debug.message}
Connection ID: ${agentOutput.debug.connectionId}
Query:         ${agentOutput.debug.query}
Match Count:   ${agentOutput.debug.matchCount}`}
              </pre>
            </Card>
          )}

          {/* toggle button for debug info */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setIsExpanded(!isExpanded);
                onExpand?.(!isExpanded);
              }}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              {isExpanded ? "Hide Debug Info" : "Show Debug Info"}
            </button>
          </div>
        </div>
      );
    }

    /* ───────────── 6. DEFAULT ───────────── */
    default:
      return (
        <Card gradient>
          <p className="text-gray-200 leading-relaxed">
            {typeof agentOutput === "string"
              ? agentOutput
              : JSON.stringify(agentOutput, null, 2)}
          </p>
        </Card>
      );
  }
};

export default AgentResponse;