import React, { useState } from "react";
import VisualizationRenderer from "@/components/VisualizationRenderer";
import ResearcherResponse from "./ResearcherResponse";
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

const AgentResponse: React.FC<AgentResponseProps> = ({
  agentType,
  agentOutput,
  onSubmitResponse,
}) => {
  const [selected, setSelected] = useState<string>("");
  const [custom, setCustom] = useState<string>("");
  const [expand, setExpand] = useState<boolean>(false);

  const submitEnabled = selected !== "" || custom.trim() !== "";
  const choose = (opt: string) => {
    setSelected(opt);
    setCustom("");
  };
  const type = (v: string) => {
    setCustom(v);
    setSelected("");
  };
  const submit = () => onSubmitResponse?.(selected || custom);

  switch (agentType) {
    case "multi":
      return (
        <div className="space-y-6">
          {/* top overview */}
          <Card title="Overview" gradient>
            <p className="text-gray-200 leading-relaxed">
              {agentOutput.summary}
            </p>
            {agentOutput.details?.length > 0 && (
              <ul className="list-disc list-inside space-y-2 mt-3 text-gray-200">
                {agentOutput.details.map((d: string, i: number) => (
                  <li key={i} className="leading-relaxed">
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* each sub-task */}
          {agentOutput.tasks?.map((task: any, i: number) => (
            <Card
              key={i}
              title={`${task.agentType.charAt(0).toUpperCase() + task.agentType.slice(1)} Response`}
            >
              <div className="inline-block px-3 py-1 bg-blue-900/20 rounded-full mb-3">
                <p className="text-xs text-blue-300">Query: {task.query}</p>
              </div>

              {/* researcher task */}
              {task.agentType === "researcher" && (
                <ResearcherResponse
                  content={task.response}
                  visualization={task.response.visualization}
                />
              )}

              {/* visualize task */}
              {task.agentType === "visualize" && (
                <>
                  <div className="p-2 rounded-lg bg-[#0d0e10]/80 mb-4">
                    <VisualizationRenderer
                      visualization={task.response.visualization}
                    />
                  </div>
                  {task.response.content && (
                    <>
                      <p className="text-gray-200 leading-relaxed">
                        {task.response.content.summary}
                      </p>
                      {task.response.content.details?.length > 0 && (
                        <ul className="list-disc list-inside space-y-2 mt-3">
                          {task.response.content.details.map(
                            (d: string, idx: number) => (
                              <li
                                key={idx}
                                className="text-gray-200 leading-relaxed"
                              >
                                {d}
                              </li>
                            )
                          )}
                        </ul>
                      )}
                    </>
                  )}
                </>
              )}

              {/* inquire task */}
              {task.agentType === "inquire" && (
                <>
                  <p className="font-medium text-gray-100 mb-2">
                    {task.response.question}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    {task.response.context}
                  </p>

                  {task.response.options?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {task.response.options.map((opt: string) => (
                        <Button
                          key={opt}
                          onClick={() => choose(opt)}
                          selected={selected === opt}
                          size="sm"
                        >
                          {opt}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* predictive task */}
              {task.agentType === "predictive" && (
                <PredictiveResponse
                  content={task.response.content}
                  prediction={task.response.prediction}
                  sqlQuery={task.response.sqlQuery}
                  queryResult={task.response.queryResult}
                />
              )}
            </Card>
          ))}
        </div>
      );

    /* ───────────── 2. INQUIRE ───────────── */
    case "inquire":
      return (
        <Card gradient className="space-y-4">
          <p className="font-medium text-gray-100 text-lg">
            {agentOutput.question}
          </p>
          <p className="text-sm text-gray-400">{agentOutput.context}</p>

          {agentOutput.options?.length > 0 && (
            <div className="flex flex-wrap gap-2 my-4">
              {agentOutput.options.map((opt: string) => (
                <Button
                  key={opt}
                  onClick={() => choose(opt)}
                  selected={selected === opt}
                  size="sm"
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {agentOutput.allowCustomInput && (
            <div className="relative">
              <input
                type={agentOutput.inputType || "text"}
                className="w-full bg-[#1b1c1d] border border-blue-500/20 focus:border-blue-500/40 outline-none rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500 transition-colors duration-150"
                placeholder="Type your answer…"
                value={custom}
                onChange={(e) => type(e.target.value)}
              />
            </div>
          )}

          {onSubmitResponse && (
            <Button
              disabled={!submitEnabled}
              onClick={submit}
              variant="primary"
              className="w-full mt-3"
            >
              Submit Response
            </Button>
          )}
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

    /* ───────────── 4. VISUALIZE ───────────── */
    case "visualize": {
      let out = agentOutput;
      if (typeof out === "string") {
        try {
          out = JSON.parse(out);
        } catch {
          return <Card>No visualization data</Card>;
        }
      }
      if (!out.visualization) return <Card>No visualization data</Card>;

      return (
        <div className="space-y-6">
          {/* content summary/details/metrics */}
          {out.content && (
            <>
              <Card title={out.content.title || "Visualization"} gradient>
                <p className="text-gray-200 leading-relaxed">
                  {out.content.summary}
                </p>
              </Card>

              {out.content.details?.length > 0 && (
                <Card title="Details">
                  <ul className="list-disc list-inside space-y-2">
                    {out.content.details.map((d: string, i: number) => (
                      <li key={i} className="text-gray-200 leading-relaxed">
                        {d}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {out.content.metrics &&
                Object.keys(out.content.metrics).length > 0 && (
                  <Card title="Metrics">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.entries(out.content.metrics).map(([k, v]) => (
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

          {/* visualization itself */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-[#0d0e10]/80 rounded-lg">
              <VisualizationRenderer visualization={out.visualization} />
            </div>
          </Card>
        </div>
      );
    }

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
    case "pipeline2":
      return (
        <div className="space-y-6">
          {/* 5.1 Task analysis */}
          <Card title="Task Analysis" gradient>
            <p className="text-gray-200 leading-relaxed">
              {agentOutput.taskResult?.reason}
            </p>
          </Card>

          {/* 5.2 Main analysis (summary/details/metrics or visualizer branch) */}
          {agentOutput.analysisResult && (
            <>
              {agentOutput.taskResult?.next === "visualizer" ? (
                /* ---------- VISUALIZER branch ---------- */
                <>
                  <Card
                    title={agentOutput.analysisResult.content.title}
                    gradient
                  >
                    <p className="text-gray-200 leading-relaxed">
                      {agentOutput.analysisResult.content.summary}
                    </p>

                    {agentOutput.analysisResult.content.details?.length > 0 && (
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

                    {agentOutput.analysisResult.content.metrics &&
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
                  <Card
                    title={
                      agentOutput.analysisResult.visualization.config.title
                    }
                  >
                    <p className="text-gray-200 mb-4 leading-relaxed">
                      {
                        agentOutput.analysisResult.visualization.config
                          .description
                      }
                    </p>
                    <div className="p-4 bg-[#0d0e10]/80 rounded-lg">
                      {agentOutput.analysisResult.visualization.chartType ===
                      "pie" ? (
                        <PieChart
                          data={agentOutput.analysisResult.visualization.data}
                          config={{
                            donut: false,
                            showPercentages: true,
                            ...agentOutput.analysisResult.visualization.config
                              .pieConfig,
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
                              agentOutput.analysisResult.visualization.config
                                .xAxis,
                            yAxisLabel:
                              agentOutput.analysisResult.visualization.config
                                .yAxis,
                          }}
                        />
                      )}
                    </div>
                  </Card>
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
                  <Card title="Summary" gradient>
                    <p className="text-gray-200 leading-relaxed">
                      {agentOutput.analysisResult.summary}
                    </p>
                  </Card>

                  {agentOutput.analysisResult.details?.length > 0 && (
                    <Card title="Details">
                      <ul className="list-disc list-inside space-y-2">
                        {agentOutput.analysisResult.details.map(
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
                    </Card>
                  )}

                  {agentOutput.analysisResult.metrics &&
                    Object.keys(agentOutput.analysisResult.metrics).length >
                      0 && (
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
                </>
              )}

              {/* 5.3 Query Results (always visible) */}
              {agentOutput.analysisResult.queryResult && (
                <Card title="Query Results">
                  {agentOutput.analysisResult.queryResult.success ? (
                    <>
                      <div className="bg-blue-900/20 inline-block px-3 py-1 rounded-full mb-3">
                        <p className="text-blue-300 text-sm">
                          Rows returned:{" "}
                          {agentOutput.analysisResult.queryResult.rowCount}
                        </p>
                      </div>
                      {agentOutput.analysisResult.queryResult.rows?.length >
                        0 && (
                        <div className="overflow-x-auto rounded-lg border border-blue-500/20">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gradient-to-r from-[#151821] to-[#0f1015]">
                              <tr>
                                {Object.keys(
                                  agentOutput.analysisResult.queryResult.rows[0]
                                ).map((header) => (
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
                              {/* Limited to 10 rows */}
                              {agentOutput.analysisResult.queryResult.rows.slice(0, 10).map(
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
                              {/* Show 'more rows' message if there are more than 10 rows */}
                              {agentOutput.analysisResult.queryResult.rows.length > 10 && (
                                <tr>
                                  <td 
                                    colSpan={Object.keys(agentOutput.analysisResult.queryResult.rows[0]).length}
                                    className="px-4 py-3 text-center text-gray-400 italic"
                                  >
                                    ... and {agentOutput.analysisResult.queryResult.rows.length - 10} more rows
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/20">
                      <p className="text-red-400">
                        Error: {agentOutput.analysisResult.queryResult.error}
                      </p>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}

          {/* 5.4 "Show More" section (SQL + Debug) */}
          {expand && (
            <>
              {agentOutput.analysisResult?.sqlQuery && (
                <Card title="SQL Query">
                  <pre className="whitespace-pre-wrap text-xs bg-[#0d0e10] p-3 rounded-lg border border-blue-500/10 text-gray-300 overflow-x-auto">
                    {agentOutput.analysisResult.sqlQuery}
                  </pre>
                </Card>
              )}

              {agentOutput.debug && (
                <Card title="Debug Info">
                  <pre className="whitespace-pre-wrap text-xs bg-[#0d0e10] p-3 rounded-lg border border-blue-500/10 text-gray-300 overflow-x-auto">
                    {`Message:       ${agentOutput.debug.message}
Connection ID: ${agentOutput.debug.connectionId}
Query:         ${agentOutput.debug.query}
Match Count:   ${agentOutput.debug.matchCount}`}
                  </pre>
                </Card>
              )}
            </>
          )}

          {/* toggle button */}
          <Button
            onClick={() => setExpand(!expand)}
            variant="text"
            className="flex items-center space-x-1"
          >
            <span>{expand ? "Show Less" : "Show More"}</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${expand ? "rotate-180" : ""}`}
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
        </div>
      );

    /* ───────────── 6. DEFAULT ───────────── */
    default:
      return (
        <Card gradient>
          <div className="flex items-center space-x-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p className="font-medium text-gray-200">
              Processing your request…
            </p>
          </div>
        </Card>
      );
  }
};

export default AgentResponse;
