"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("user_pune_2026@local.dev");
  const [password, setPassword] = useState("••••••••");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  };

  return (
    <div className="flex min-h-screen w-screen bg-slate-950 text-slate-100 font-sans">
      {/* Left panel (Branding image mockup) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-r border-slate-900 relative overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-lg text-blue-400">
          <Sparkles className="h-6 w-6" />
          <span>BudgetBuddy</span>
        </div>

        <div className="space-y-6 max-w-md relative z-10">
          <h2 className="text-3xl font-bold tracking-tight leading-tight text-white">
            Master your wealth <br />
            with precision.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Collaborative agent networks automatically running semantic classification and savings variance checks under your direct supervision.
          </p>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow flex flex-col gap-2">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Live Demo User ID:</span>
            <code className="text-xs text-slate-300 font-mono">user_pune_2026</code>
          </div>
        </div>

        <div className="text-xs text-slate-600">
          © 2026 BudgetBuddy Technologies. All rights reserved.
        </div>
      </div>

      {/* Right panel (Login form) */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-12 lg:px-24">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <div>
            <span className="lg:hidden flex items-center gap-2 font-bold text-lg text-blue-400 mb-6">
              <Sparkles className="h-5 w-5" />
              <span>BudgetBuddy</span>
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">Welcome Back</h2>
            <p className="mt-1.5 text-xs text-slate-400">Log in to manage your smart budgeting assistant.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-semibold">Password</label>
                <a href="#" className="text-[10px] text-blue-400 hover:underline">Forgot password?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="remember" 
                defaultChecked 
                className="accent-blue-500 h-4 w-4 bg-slate-900 border-slate-800 rounded" 
              />
              <label htmlFor="remember" className="text-slate-450 font-medium">Remember for 30 days</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white hover:bg-blue-500 p-3 rounded-lg font-bold transition-all disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Don't have an account?{" "}
            <a href="#" className="text-blue-400 hover:underline font-semibold">Create an account</a>
          </p>
        </div>
      </div>
    </div>
  );
}
