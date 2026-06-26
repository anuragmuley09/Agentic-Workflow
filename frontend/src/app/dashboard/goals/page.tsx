"use client";

import React, { useEffect, useState } from "react";
import { 
  Target, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Activity,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Brain,
  PiggyBank,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  variance: number;
}

interface LatestPlan {
  recommendations: string;
  create_date: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [latestPlan, setLatestPlan] = useState<LatestPlan | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form state for creating new goals
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // States for expanding card features
  const [expandedInsights, setExpandedInsights] = useState<Record<string, boolean>>({});
  const [expandedLogProgress, setExpandedLogProgress] = useState<Record<string, boolean>>({});
  const [contributionAmounts, setContributionAmounts] = useState<Record<string, string>>({});
  const [contributing, setContributing] = useState<Record<string, boolean>>({});

  const fetchGoals = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/users/user_pune_2026/dashboard");
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
        setLatestPlan(data.latest_plan || null);
      }
    } catch (e) {
      console.error("Failed to fetch goals:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const response = await fetch("http://localhost:8000/api/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "user_pune_2026",
          message: `Create a budget goal named '${goalName}' with target amount ${parseFloat(targetAmount)}`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const finalMsg = data.messages[data.messages.length - 1]?.content || "Goal created.";
        setMessage(finalMsg);
        setGoalName("");
        setTargetAmount("");
        fetchGoals();
      } else {
        setMessage("Failed to execute agent goal creation request.");
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleContribute = async (goalId: string, amountToSubmit?: number) => {
    const amtStr = amountToSubmit !== undefined ? String(amountToSubmit) : contributionAmounts[goalId];
    if (!amtStr || isNaN(parseFloat(amtStr)) || parseFloat(amtStr) <= 0) return;
    
    const amt = parseFloat(amtStr);
    setContributing(prev => ({ ...prev, [goalId]: true }));
    try {
      const response = await fetch(`http://localhost:8000/api/v1/goals/${goalId}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt })
      });
      
      if (response.ok) {
        setContributionAmounts(prev => ({ ...prev, [goalId]: "" }));
        setExpandedLogProgress(prev => ({ ...prev, [goalId]: false }));
        fetchGoals();
      } else {
        alert("Failed to record contribution progress.");
      }
    } catch (e) {
      console.error(e);
      alert("Error submitting goal contribution.");
    } finally {
      setContributing(prev => ({ ...prev, [goalId]: false }));
    }
  };

  const toggleInsights = (goalId: string) => {
    setExpandedInsights(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const toggleLogProgress = (goalId: string) => {
    setExpandedLogProgress(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const handleAmountChange = (goalId: string, val: string) => {
    setContributionAmounts(prev => ({ ...prev, [goalId]: val }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-500" />
            Budget Goals
          </h1>
          <p className="text-sm text-[var(--text-sub)]">Establish and monitor savings trajectories and expense ceilings.</p>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchGoals(); }}
          className="rounded p-2 text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] transition-colors"
          title="Refresh Goals"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin text-blue-500" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Goals List (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-[var(--text-sub)] gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Fetching budget goals...</span>
            </div>
          ) : goals.length > 0 ? (
            goals.map((goal) => {
              const progressPct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
              const isSavingsGoal = goal.name.toLowerCase().includes("save") || goal.name.toLowerCase().includes("saving");
              
              const isPacingDeviation = isSavingsGoal 
                ? goal.current_amount < goal.target_amount 
                : goal.current_amount > goal.target_amount;

              const isInsightsOpen = !!expandedInsights[goal.id];
              const isLogOpen = !!expandedLogProgress[goal.id];

              return (
                <div 
                  key={goal.id} 
                  className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 shadow transition-all hover:border-[var(--text-accent)]/20 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`rounded p-2.5 ${isPacingDeviation ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>
                        {isSavingsGoal ? <PiggyBank className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--text-main)] text-base">{goal.name}</h3>
                        <p className="text-xs text-[var(--text-sub)] mt-0.5 font-medium flex items-center gap-1.5">
                          {isSavingsGoal ? (
                            <>
                              <TrendingUp className="h-3 w-3 text-blue-500" />
                              Savings Accumulation Goal
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3 text-amber-500" />
                              Expense Ceiling Budget Goal
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isPacingDeviation 
                          ? "bg-amber-500/10 text-amber-500" 
                          : "bg-blue-500/10 text-blue-500"
                      }`}>
                        {isPacingDeviation ? (
                          <>
                            <AlertCircle className="h-3 w-3" />
                            {isSavingsGoal ? "Pacing Behind" : "Limit Exceeded"}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            On Track
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Progress Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-sub)]">
                      <span>Saved/Spent: ₹{goal.current_amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                      <span>Target Limit: ₹{goal.target_amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    </div>

                    {/* Pacing Progress Bar */}
                    <div className="h-3 w-full rounded-full bg-[var(--bg-app)] overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          isPacingDeviation ? "bg-amber-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(100, progressPct)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[var(--text-sub)] font-semibold">
                      <span>Progress: {progressPct.toFixed(1)}%</span>
                      <span>Variance: ₹{goal.variance.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 border-t border-[var(--border-app)] pt-3 text-xs">
                    <button
                      onClick={() => toggleInsights(goal.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-app)] transition-colors hover:bg-[var(--bg-hover)] ${
                        isInsightsOpen ? "bg-[var(--bg-hover)] text-blue-500 border-blue-500/30" : "text-[var(--text-sub)]"
                      }`}
                    >
                      <Brain className="h-4 w-4" />
                      <span>AI Insights</span>
                      {isInsightsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    <button
                      onClick={() => toggleLogProgress(goal.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-app)] transition-colors hover:bg-[var(--bg-hover)] ${
                        isLogOpen ? "bg-[var(--bg-hover)] text-blue-500 border-blue-500/30" : "text-[var(--text-sub)]"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isSavingsGoal ? "Log Savings" : "Log Expense"}</span>
                      {isLogOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>

                  {/* Expandable Sections */}
                  {isInsightsOpen && (
                    <div className="p-4 rounded-lg bg-[var(--bg-app)]/60 border border-[var(--border-app)] space-y-2 animate-fadeIn">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500">
                        <Sparkles className="h-4 w-4" />
                        <span>AGENT CO-PILOT ANALYSIS</span>
                      </div>
                      {latestPlan ? (
                        <p className="text-xs text-[var(--text-main)] leading-relaxed font-mono whitespace-pre-wrap">
                          {latestPlan.recommendations}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--text-sub)] italic">
                          No advisor recommendations available yet. Ask the advisor in chat or upload statements to generate insights.
                        </p>
                      )}
                    </div>
                  )}

                  {isLogOpen && (
                    <div className="p-4 rounded-lg bg-[var(--bg-app)]/60 border border-[var(--border-app)] space-y-3 animate-fadeIn">
                      <div className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                        {isSavingsGoal ? "Record Savings Contribution" : "Log Expense Paid"}
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Amount in ₹"
                          value={contributionAmounts[goal.id] || ""}
                          onChange={(e) => handleAmountChange(goal.id, e.target.value)}
                          className="flex-1 bg-[var(--bg-card)] border border-[var(--border-app)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                          disabled={contributing[goal.id]}
                        />
                        <button
                          onClick={() => handleContribute(goal.id)}
                          disabled={contributing[goal.id] || !contributionAmounts[goal.id]}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition-all disabled:bg-slate-800 disabled:text-slate-500 flex items-center gap-1"
                        >
                          {contributing[goal.id] ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <span>Submit</span>
                          )}
                        </button>
                      </div>

                      {/* Quick Contribute Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {[500, 1000, 5000].map((quickAmt) => (
                          <button
                            key={quickAmt}
                            onClick={() => handleContribute(goal.id, quickAmt)}
                            disabled={contributing[goal.id]}
                            className="bg-[var(--bg-card)] border border-[var(--border-app)] hover:border-blue-500/50 hover:text-blue-500 text-[10px] font-semibold text-[var(--text-sub)] px-2.5 py-1 rounded transition-colors"
                          >
                            +₹{quickAmt.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-app)] bg-[var(--bg-card)] p-12 text-center shadow">
              <Target className="h-10 w-10 text-[var(--text-sub)] opacity-55 mx-auto mb-3" />
              <h3 className="font-bold text-[var(--text-main)]">No goals established yet</h3>
              <p className="text-xs text-[var(--text-sub)] mt-1 max-w-sm mx-auto">
                Define a budget goal using the form on the right or chat with the financial agent to set one up automatically.
              </p>
            </div>
          )}
        </div>

        {/* Establish Goal Form (Right Column) */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 shadow flex flex-col gap-4 h-fit">
          <div className="flex items-center gap-2 border-b border-[var(--border-app)] pb-2 text-[var(--text-accent)]">
            <Plus className="h-5 w-5" />
            <h3 className="font-bold text-sm tracking-wider uppercase text-[var(--text-main)]">New Budget Goal</h3>
          </div>

          <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
            <div>
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Goal Name</label>
              <input
                type="text"
                placeholder="e.g. Save for Laptop, Max Dining Limit"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-lg p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Target Amount (₹)</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-lg p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-blue-600 text-white hover:bg-blue-500 p-2.5 rounded-lg font-bold transition-all disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Agent creating goal...</span>
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  <span>Create via Agent</span>
                </>
              )}
            </button>
          </form>

          {message && (
            <div className="p-3 bg-[var(--bg-app)] border border-[var(--border-app)] rounded mt-2">
              <span className="text-[9px] font-bold text-[var(--text-accent)] block mb-1 uppercase tracking-wider">Agent Response:</span>
              <p className="text-xs text-[var(--text-main)] leading-normal font-mono">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
