"use client";

import React, { useEffect, useState } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  FileText, 
  Plus,
  RefreshCw,
  ShoppingBag,
  Activity
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: "credit" | "debit";
  category: string;
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  variance: number;
}

interface Alert {
  id: string;
  category: string;
  threshold: number;
  trigger_date: string;
}

interface Plan {
  recommendations: string;
  create_date: string;
}

interface DashboardState {
  user_id: string;
  metrics: {
    monthly_income: number;
    total_expenses: number;
    net_cashflow: number;
  };
  transactions: Transaction[];
  goals: Goal[];
  alerts: Alert[];
  latest_plan: Plan | null;
}

export default function OverviewDashboard() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Manual Transaction Form state
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [cat, setCat] = useState("Other");
  const [dir, setDir] = useState("debit");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txSaving, setTxSaving] = useState(false);
  const [txMessage, setTxMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/users/user_pune_2026/dashboard");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();

    // Listen for custom trigger update events from Webhook Simulator
    window.addEventListener("dashboard-update", fetchDashboardData);
    return () => {
      window.removeEventListener("dashboard-update", fetchDashboardData);
    };
  }, []);

  const handleManualTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !amt || txSaving) return;
    
    setTxSaving(true);
    setTxMessage(null);
    try {
      const response = await fetch("http://localhost:8000/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "user_pune_2026",
          date: txDate,
          description: desc.trim(),
          amount: parseFloat(amt),
          direction: dir,
          category: cat
        })
      });
      
      const resData = await response.json();
      if (response.ok) {
        setTxMessage("Transaction successfully registered!");
        setDesc("");
        setAmt("");
        fetchDashboardData();
      } else {
        setTxMessage(resData.detail || "Failed to record transaction.");
      }
    } catch (error: any) {
      setTxMessage(`Error: ${error.message}`);
    } finally {
      setTxSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center gap-2 text-[var(--text-accent)] bg-[var(--bg-app)]">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span>Loading financial dataset...</span>
      </div>
    );
  }

  // Pre-calculate data for charts
  const categoryMap: Record<string, number> = {};
  data.transactions.forEach((tx) => {
    if (tx.direction === "debit") {
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    }
  });

  const COLORS = ["#3b82f6", "#60a5fa", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];
  const pieData = Object.keys(categoryMap).map((cat) => ({
    name: cat,
    value: categoryMap[cat],
  }));

  const barData = [
    { name: "Monthly Income", amount: data.metrics.monthly_income, fill: "#3b82f6" },
    { name: "Total Expenses", amount: data.metrics.total_expenses, fill: "#ef4444" },
    { name: "Net Savings", amount: data.metrics.net_cashflow, fill: "#60a5fa" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">Overview Dashboard</h1>
          <p className="text-sm text-[var(--text-sub)]">Real-time aggregate calculations from PostgreSQL database.</p>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchDashboardData(); }}
          className="rounded p-2 text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Total Income */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-sub)] font-semibold uppercase tracking-wider text-[10px]">Total Income</span>
            <div className="rounded bg-blue-500/10 p-2 text-blue-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-blue-500">₹{data.metrics.monthly_income.toLocaleString()}</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-sub)] font-semibold uppercase tracking-wider text-[10px]">Total Expenses</span>
            <div className="rounded bg-rose-500/10 p-2 text-rose-500">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-rose-500">₹{data.metrics.total_expenses.toLocaleString()}</span>
          </div>
        </div>

        {/* Net Cashflow */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-sub)] font-semibold uppercase tracking-wider text-[10px]">Net Savings</span>
            <div className="rounded bg-blue-500/10 p-2 text-blue-500">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-3xl font-bold tracking-tight ${data.metrics.net_cashflow >= 0 ? "text-blue-500" : "text-rose-500"}`}>
              ₹{data.metrics.net_cashflow.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Charts & Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cashflow Bar Chart */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 lg:col-span-2">
          <h3 className="font-bold text-sm tracking-wider text-[var(--text-main)] uppercase mb-4">Cashflow Breakdown</h3>
          <div className="h-64">
            {mounted && barData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-app)", color: "var(--text-main)" }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5">
          <h3 className="font-bold text-sm tracking-wider text-[var(--text-main)] uppercase mb-4">Expense Categories</h3>
          <div className="h-64 flex flex-col items-center justify-center">
            {mounted && pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-app)", color: "var(--text-main)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center text-[var(--text-sub)] gap-2">
                <ShoppingBag className="h-8 w-8 opacity-60" />
                <span className="text-xs">No debits categorized yet.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row: Alerts & Plan */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Latest Financial Plan */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 shadow flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[var(--text-accent)] border-b border-[var(--border-app)] pb-2">
            <FileText className="h-5 w-5" />
            <h3 className="font-bold text-sm tracking-wider uppercase text-[var(--text-main)]">AI Recommendation & Nudges</h3>
          </div>
          {data.latest_plan ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-main)] leading-relaxed italic">
                "{data.latest_plan.recommendations}"
              </p>
              <span className="text-[10px] text-[var(--text-sub)] block font-semibold">Generated on: {data.latest_plan.create_date}</span>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-sub)]">
              No financial plan generated yet. Simulate a transaction or run a query to invoke the planner.
            </p>
          )}
        </div>

        {/* Real-time Anomalies / Alerts */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 shadow flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-500 border-b border-[var(--border-app)] pb-2">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-bold text-sm tracking-wider uppercase text-[var(--text-main)]">Anomalies & Budget Warnings</h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] pr-1">
            {data.alerts.length > 0 ? (
              data.alerts.map((alert) => (
                <div key={alert.id} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-start gap-2.5">
                  <div className="mt-0.5 text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-500">{alert.category}</p>
                    <p className="text-xs text-[var(--text-main)] mt-1">Warning: Budget spike/compromise triggered at threshold ₹{alert.threshold}</p>
                    <span className="text-[10px] text-[var(--text-sub)] mt-1 block">Triggered: {alert.trigger_date}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--text-sub)]">
                All systems green. No budget spikes or overspending detected.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Transaction Ledger (Left 2 Columns) & Quick Manual Ingest (Right 1 Column) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Transaction Ledger Table */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 lg:col-span-2 shadow">
          <h3 className="font-bold text-sm tracking-wider text-[var(--text-main)] uppercase mb-4">Transaction Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--text-sub)]">
              <thead className="bg-[var(--bg-app)]/50 text-[var(--text-main)] uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Merchant / Description</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-app)]">
                {data.transactions.length > 0 ? (
                  data.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="p-3 whitespace-nowrap">{tx.date.split(" ")[0]}</td>
                      <td className="p-3 text-[var(--text-main)] font-semibold">{tx.description}</td>
                      <td className="p-3 font-bold text-[var(--text-main)]">₹{tx.amount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="inline-block px-2.5 py-0.5 rounded border border-[var(--border-app)] bg-[var(--bg-app)] text-[10px] font-medium text-[var(--text-main)]">
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold uppercase ${tx.direction === "credit" ? "text-blue-500" : "text-rose-500"}`}>
                          {tx.direction}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[var(--text-sub)]">
                      No transactions found. Upload a statement to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Log Transaction Form (Right Column) */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 shadow flex flex-col gap-4 h-fit">
          <div className="flex items-center gap-2 border-b border-[var(--border-app)] pb-2 text-[var(--text-accent)]">
            <Plus className="h-5 w-5" />
            <h3 className="font-bold text-sm tracking-wider uppercase text-[var(--text-main)]">Quick Log Transaction</h3>
          </div>

          <form onSubmit={handleManualTransactionSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Description / Merchant</label>
              <input
                type="text"
                placeholder="e.g. Salary, Rent, Swiggy"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-lg p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 1500"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-lg p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Category</label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-lg p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
              >
                <option value="Food & Dining">Food & Dining</option>
                <option value="Utilities">Utilities</option>
                <option value="Transportation">Transportation</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Shopping">Shopping</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Housing">Housing</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Transaction Date</label>
              <input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-lg p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Flow Direction</label>
              <select
                value={dir}
                onChange={(e) => setDir(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-lg p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
              >
                <option value="credit">Credit (Add Income / Refund)</option>
                <option value="debit">Debit (Record Expense)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={txSaving}
              className="w-full bg-blue-600 text-white hover:bg-blue-500 p-2.5 rounded-lg font-bold transition-all disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
            >
              {txSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  <span>Record Transaction</span>
                </>
              )}
            </button>
          </form>

          {txMessage && (
            <div className="p-3 bg-[var(--bg-app)] border border-[var(--border-app)] rounded mt-1">
              <span className="text-[9px] font-bold text-[var(--text-accent)] block mb-1 uppercase tracking-wider">System Status:</span>
              <p className="text-xs text-[var(--text-main)] font-mono">{txMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
