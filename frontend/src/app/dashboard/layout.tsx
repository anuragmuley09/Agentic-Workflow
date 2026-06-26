"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Target, 
  MessageSquare, 
  UploadCloud, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Terminal,
  Activity,
  Sun,
  Moon
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [simOpen, setSimOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  // Simulator form state
  const [amount, setAmount] = useState("125000.00");
  const [merchant, setMerchant] = useState("Salary Income");
  const [category, setCategory] = useState("Other");
  const [direction, setDirection] = useState("credit");
  const [loading, setLoading] = useState(false);
  const [nudgeResult, setNudgeResult] = useState<string | null>(null);

  // Sync theme with localstorage if set
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  const menuItems = [
    { name: "Overview Dashboard", href: "/dashboard", icon: Home },
    { name: "Budget Goals", href: "/dashboard/goals", icon: Target },
    { name: "Financial Advisor Chat", href: "/dashboard/chat", icon: MessageSquare },
    { name: "Upload Statements", href: "/dashboard/upload", icon: UploadCloud },
  ];

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNudgeResult(null);
    try {
      const response = await fetch("http://localhost:8000/api/v1/plaid/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "user_pune_2026",
          amount: parseFloat(amount),
          merchant,
          category,
          direction
        })
      });
      const data = await response.json();
      setNudgeResult(data.nudge || "Webhook processed. Status: success");
      // Fire custom event to refresh data in subcomponents
      window.dispatchEvent(new Event("dashboard-update"));
    } catch (error: any) {
      setNudgeResult(`Simulation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const themeStyles = theme === "light" 
    ? {
        "--bg-app": "#f1f5f9",         // slate-100
        "--bg-card": "#ffffff",        // white
        "--border-app": "#cbd5e1",      // slate-300
        "--text-main": "#0f172a",       // slate-900
        "--text-sub": "#475569",        // slate-600
        "--bg-sidebar": "#ffffff",
        "--border-sidebar": "#cbd5e1",
        "--bg-hover": "#e2e8f0",
        "--text-accent": "#2563eb",     // blue-600
        "--bg-btn": "#e2e8f0",
        "--text-btn": "#0f172a"
      } as React.CSSProperties
    : {
        "--bg-app": "#020617",         // slate-950
        "--bg-card": "#0f172a",        // slate-900
        "--border-app": "#1e293b",      // slate-800
        "--text-main": "#f8fafc",       // slate-50
        "--text-sub": "#94a3b8",        // slate-400
        "--bg-sidebar": "#0f172a",
        "--border-sidebar": "#1e293b",
        "--bg-hover": "#1e293b",
        "--text-accent": "#3b82f6",     // blue-500
        "--bg-btn": "#1e293b",
        "--text-btn": "#f8fafc"
      } as React.CSSProperties;

  return (
    <div style={themeStyles} className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-main)] transition-colors duration-200">
      {/* Sidebar navigation */}
      <aside className={`relative flex flex-col border-r border-slate-800 bg-[#0c1329] text-slate-300 transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-white">
            <Sparkles className="h-6 w-6 text-blue-500" />
            {!collapsed && <span className="tracking-wide">BudgetBuddy</span>}
          </Link>
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Menu links */}
        <nav className="flex-1 space-y-1 p-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/10" 
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User profile identifier */}
        <div className="border-t border-slate-800 p-4 bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-sm font-bold border border-blue-500/20">
              RM
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-xs text-slate-500 font-semibold uppercase">Active User</p>
                <p className="truncate text-sm text-slate-200 font-semibold">Rohan_M</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main container page area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar header */}
        <header className="flex h-16 items-center justify-between border-b border-[var(--border-app)] bg-[var(--bg-card)]/60 px-6 backdrop-blur">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--text-accent)]" />
            <h2 className="text-sm font-semibold tracking-wide text-[var(--text-sub)] uppercase">Agentic AI Financial Co-Pilot</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="rounded-lg bg-[var(--bg-btn)] border border-[var(--border-app)] p-2 text-[var(--text-accent)] hover:opacity-80 transition-all"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="h-4 w-4 text-slate-800" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>
            <button 
              onClick={() => setSimOpen(!simOpen)}
              className="flex items-center gap-2 rounded-lg bg-[var(--bg-btn)] border border-[var(--border-app)] px-3 py-2 text-xs text-[var(--text-accent)] hover:opacity-85 transition-all font-semibold"
            >
              <Terminal className="h-4 w-4" />
              {simOpen ? "Hide Simulator" : "Show Simulator"}
            </button>
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs text-[var(--text-sub)]">Agent Connected (Ollama)</span>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--bg-app)] text-[var(--text-main)]">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Right-side Webhook Simulator slide-out panels */}
      {simOpen && (
        <aside className="w-80 border-l border-[var(--border-app)] bg-[var(--bg-sidebar)] p-5 overflow-y-auto flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-sidebar)] pb-3">
            <Terminal className="h-5 w-5 text-[var(--text-accent)]" />
            <h3 className="font-bold text-sm tracking-wider text-[var(--text-main)]">Plaid Webhook Simulator</h3>
          </div>

          <p className="text-xs text-[var(--text-sub)]">
            Simulate a real-time transaction event pushed by Plaid. This triggers the multi-agent graph to run checks, update goals, find anomalies, and emit nudges.
          </p>

          <form onSubmit={handleSimulateWebhook} className="space-y-4 text-xs mt-2">
            <div>
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Merchant / Description</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Simulated Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
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
              <label className="block text-[var(--text-sub)] mb-1 font-semibold">Transaction Type (Direction)</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded p-2 text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
              >
                <option value="credit">Credit (Add Income / Refund)</option>
                <option value="debit">Debit (Record Expense)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white hover:bg-blue-500 p-2.5 rounded font-bold transition-all disabled:bg-slate-800 disabled:text-slate-500"
            >
              {loading ? "Simulating Graph Run..." : "Trigger Simulated Webhook"}
            </button>
          </form>

          {nudgeResult && (
            <div className="mt-4 p-3 bg-[var(--bg-app)] border border-[var(--border-app)] rounded flex flex-col gap-2">
              <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">Real-Time Agent Nudge Output:</span>
              <p className="text-xs text-[var(--text-main)] leading-relaxed font-mono whitespace-pre-wrap">{nudgeResult}</p>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
