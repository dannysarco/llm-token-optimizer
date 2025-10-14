import React, { useState, useEffect } from "react";

const BACKEND_URL = "http://localhost:5001/api";

// Claude Sonnet 4.5 pricing (as of Oct 2024)
const INPUT_COST_PER_MTK = 3.00; // $3 per million tokens
const OUTPUT_COST_PER_MTK = 15.00; // $15 per million tokens
const INPUT_COST_PER_TOKEN = INPUT_COST_PER_MTK / 1_000_000;
const OUTPUT_COST_PER_TOKEN = OUTPUT_COST_PER_MTK / 1_000_000;

type UsageStat = {
  timestamp: number;
  prompt: string;
  optimized: string;
  origTokens: number;
  optTokens: number;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  savedTokens: number;
  savedCost: number;
};

function formatUSD(n: number) {
  if (n < 0.01) return `$${n.toFixed(6)}`; // Show more decimals for tiny amounts
  return `$${n.toFixed(4)}`;
}

function loadUsageHistory(): UsageStat[] {
  const s = localStorage.getItem("claude_usage_history");
  if (!s) return [];
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

function saveUsageHistory(stats: UsageStat[]) {
  localStorage.setItem("claude_usage_history", JSON.stringify(stats));
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [origTokens, setOrigTokens] = useState<number | null>(null);
  const [optimized, setOptimized] = useState("");
  const [optTokens, setOptTokens] = useState<number | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState<UsageStat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [countingTokens, setCountingTokens] = useState(false);

  // On mount, load history from localStorage
  useEffect(() => {
    setSessionStats(loadUsageHistory());
  }, []);

  // After each change, persist session stats
  useEffect(() => {
    saveUsageHistory(sessionStats);
  }, [sessionStats]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    setError(null);
  };

  // Live token counting as user types
  useEffect(() => {
    if (!prompt) {
      setOrigTokens(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCountingTokens(true);
      try {
        const tc = await getTokenCount(prompt);
        setOrigTokens(tc);
      } catch (e) {
        console.error("Token count error:", e);
      }
      setCountingTokens(false);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [prompt]);

  const getTokenCount = async (text: string) => {
    const resp = await fetch(`${BACKEND_URL}/count_tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });
    if (!resp.ok) throw new Error("Failed to count tokens");
    const data = await resp.json();
    return data.tokens;
  };

  const optimizePrompt = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt to optimize");
      return;
    }

    setLoading(true);
    setError(null);
    setOptimized("");
    setOptTokens(null);
    setUsage(null);

    try {
      const tc = origTokens || await getTokenCount(prompt);
      setOrigTokens(tc);

      const resp = await fetch(`${BACKEND_URL}/optimize_prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Failed to optimize prompt");
      }

      const data = await resp.json();
      if (!data.optimized) throw new Error("No optimized prompt received");
      
      setOptimized(data.optimized);
      setOptTokens(data.optimizedTokens || await getTokenCount(data.optimized));

      // Calculate API usage and cost
      const inputTokens = data.usage?.input_tokens || 0;
      const outputTokens = data.usage?.output_tokens || 0;
      const inputCost = inputTokens * INPUT_COST_PER_TOKEN;
      const outputCost = outputTokens * OUTPUT_COST_PER_TOKEN;
      const totalCost = inputCost + outputCost;

      const savedTokens = tc - (data.optimizedTokens || 0);
      const savedCost = savedTokens * INPUT_COST_PER_TOKEN; // Savings based on input token cost

      setUsage({
        inputTokens,
        outputTokens,
        inputCost,
        outputCost,
        totalCost,
        savedTokens,
        savedCost,
      });

      // Add to session stats/history
      const entry: UsageStat = {
        timestamp: Date.now(),
        prompt,
        optimized: data.optimized,
        origTokens: tc,
        optTokens: data.optimizedTokens || 0,
        inputTokens,
        outputTokens,
        inputCost,
        outputCost,
        totalCost,
        savedTokens,
        savedCost,
      };
      setSessionStats((prev) => [...prev, entry]);
    } catch (e: any) {
      setError(e.message || "Error optimizing prompt");
    }
    setLoading(false);
  };

  // Calculate session totals
  const sessionTotalCost = sessionStats.reduce((sum, e) => sum + e.totalCost, 0);
  const sessionSaved = sessionStats.reduce((sum, e) => sum + (e.savedCost || 0), 0);
  const sessionTotalTokensSaved = sessionStats.reduce((sum, e) => sum + (e.savedTokens || 0), 0);

  // Graph data: running total cost
  const usageGraphData = sessionStats.map((e, i) => ({
    x: i + 1,
    y: sessionStats.slice(0, i + 1).reduce((sum, e) => sum + e.totalCost, 0)
  }));

  const handleCopy = () => {
    if (optimized) {
      navigator.clipboard.writeText(optimized);
    }
  };

  const handleExportHistory = () => {
    const dataStr = JSON.stringify(sessionStats, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `claude-optimizer-history-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div style={{ padding: 32, fontFamily: "Inter, Arial, sans-serif", maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Claude Sonnet 4.5 Token Optimizer</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 24 }}>
        Optimize your prompts to reduce token usage • ${INPUT_COST_PER_MTK}/MTok input • ${OUTPUT_COST_PER_MTK}/MTok output
      </p>
      
      <div style={{ position: "relative" }}>
        <textarea
          value={prompt}
          onChange={handlePromptChange}
          rows={8}
          style={{ 
            width: "100%", 
            fontSize: 16, 
            marginBottom: 8,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ddd",
            fontFamily: "inherit"
          }}
          placeholder="Paste your Claude prompt here..."
        />
        {prompt && (
          <div style={{ 
            position: "absolute", 
            bottom: 16, 
            right: 12, 
            background: "rgba(255,255,255,0.9)",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: 14,
            color: "#666"
          }}>
            {countingTokens ? "Counting..." : origTokens !== null ? `${origTokens.toLocaleString()} tokens` : ""}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button 
          onClick={optimizePrompt} 
          disabled={loading || !prompt.trim()} 
          style={{
            background: loading || !prompt.trim() ? "#ccc" : "#0066cc",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 28px",
            fontSize: 18,
            fontWeight: 600,
            cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
            transition: "background 0.2s"
          }}
        >
          {loading ? "Optimizing..." : "Optimize Prompt"}
        </button>
        
        {origTokens !== null && (
          <div style={{ fontSize: 16, color: "#333" }}>
            <b>Original:</b> {origTokens.toLocaleString()} tokens
          </div>
        )}
      </div>

      {optimized && (
        <div style={{
          background: "#f3f4f6",
          borderRadius: 12,
          padding: 16,
          marginTop: 28,
          position: "relative"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <b style={{ fontSize: 18 }}>Optimized Prompt</b>
            <button
              onClick={handleCopy}
              style={{
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 14,
                cursor: "pointer"
              }}
            >
              📋 Copy
            </button>
          </div>
          
          <pre style={{ 
            fontSize: 15, 
            whiteSpace: "pre-wrap", 
            wordBreak: "break-word",
            background: "#fff",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #e5e7eb"
          }}>
            {optimized}
          </pre>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: 16, 
            marginTop: 16,
            padding: 12,
            background: "#fff",
            borderRadius: 8
          }}>
            <div>
              <div style={{ fontSize: 14, color: "#666" }}>Optimized Tokens</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{optTokens?.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: "#666" }}>Tokens Saved</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#059669" }}>
                {usage?.savedTokens?.toLocaleString()} ({((usage?.savedTokens / (origTokens || 1)) * 100).toFixed(1)}%)
              </div>
            </div>
          </div>

          {usage && (
            <div style={{ 
              marginTop: 16,
              padding: 12,
              background: "#fff",
              borderRadius: 8,
              fontSize: 14
            }}>
              <b>API Usage (This Optimization):</b>
              <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                <div>Input Tokens: <b>{usage.inputTokens.toLocaleString()}</b> ({formatUSD(usage.inputCost)})</div>
                <div>Output Tokens: <b>{usage.outputTokens.toLocaleString()}</b> ({formatUSD(usage.outputCost)})</div>
                <div>Total API Cost: <b>{formatUSD(usage.totalCost)}</b></div>
                <div style={{ color: "#059669" }}>Estimated Savings per Use: <b>{formatUSD(usage.savedCost)}</b></div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ 
          color: "#dc2626", 
          marginTop: 18,
          padding: 12,
          background: "#fef2f2",
          borderRadius: 8,
          border: "1px solid #fecaca"
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <h2>Session Statistics</h2>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: 16,
          marginBottom: 16
        }}>
          <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: "#666" }}>Prompts Optimized</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{sessionStats.length}</div>
          </div>
          <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: "#666" }}>Total API Cost</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{formatUSD(sessionTotalCost)}</div>
          </div>
          <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: "#666" }}>Tokens Saved</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#059669" }}>
              {sessionTotalTokensSaved.toLocaleString()}
            </div>
          </div>
          <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: "#666" }}>Estimated Savings</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#059669" }}>
              {formatUSD(sessionSaved)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleExportHistory}
            disabled={sessionStats.length === 0}
            style={{
              background: "#fff",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 16,
              cursor: sessionStats.length === 0 ? "not-allowed" : "pointer",
              opacity: sessionStats.length === 0 ? 0.5 : 1
            }}
          >
            📥 Export History
          </button>
          <button
            onClick={() => {
              if (window.confirm("Clear all usage history?")) setSessionStats([]);
            }}
            disabled={sessionStats.length === 0}
            style={{
              background: "#fff",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 16,
              cursor: sessionStats.length === 0 ? "not-allowed" : "pointer",
              opacity: sessionStats.length === 0 ? 0.5 : 1
            }}
          >
            🗑️ Clear History
          </button>
        </div>
      </div>

      {sessionStats.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2>Cumulative API Cost</h2>
          <UsageGraph data={usageGraphData} />
        </div>
      )}
    </div>
  );
};

// Simple SVG line chart for cumulative API cost
function UsageGraph({ data }: { data: { x: number, y: number }[] }) {
  if (data.length < 1) return null;
  
  const width = 700;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxY = Math.max(...data.map(d => d.y)) * 1.1 || 0.01;
  const maxX = data.length;
  
  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(maxX - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - (d.y / maxY) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} style={{ background: "#f8fafc", borderRadius: 8 }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding.top + chartHeight * (1 - ratio);
        return (
          <g key={ratio}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={padding.left - 10} y={y + 4} fontSize={12} fill="#666" textAnchor="end">
              {formatUSD(maxY * ratio)}
            </text>
          </g>
        );
      })}
      
      {/* Line chart */}
      <polyline
        fill="none"
        stroke="#0066cc"
        strokeWidth="3"
        points={points}
      />
      
      {/* Data points */}
      {data.map((d, i) => {
        const x = padding.left + (i / Math.max(maxX - 1, 1)) * chartWidth;
        const y = padding.top + chartHeight - (d.y / maxY) * chartHeight;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4"
            fill="#0066cc"
          />
        );
      })}
      
      {/* X axis label */}
      <text 
        x={width / 2} 
        y={height - 10} 
        fontSize={14} 
        fill="#333" 
        textAnchor="middle"
      >
        Optimization #{maxX}
      </text>
    </svg>
  );
}

export default App;