"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Shield, Cpu, Activity } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-blue-500 selection:text-slate-950">
      {/* Top navbar */}
      <header className="flex h-20 items-center justify-between px-6 border-b border-slate-900 bg-slate-950/60 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-lg text-blue-400">
          <Sparkles className="h-6 w-6" />
          <span>BudgetBuddy</span>
        </div>
        <Link 
          href="/login" 
          className="rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold tracking-wide text-slate-200 transition-all"
        >
          Sign In
        </Link>
      </header>

      {/* Hero section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 max-w-4xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/5 px-4 py-1.5 text-xs font-medium text-blue-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Bridging the Personal Finance Action Gap</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
          An Agentic AI-Powered <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500">
            Smart Budgeting Assistant
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Transition from passive reporting dashboards to active co-pilots. BudgetBuddy autonomously analyzes statement sheets, tracks goals pacing, and issues real-time behavioral nudges.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 px-6 py-3 text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            <span>Launch Core App</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-slate-900 bg-slate-900/10 py-16 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <h2 className="text-center text-xl font-semibold uppercase tracking-wider text-slate-400">Features Built on Agentic AI</h2>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* Semantic Analyzer */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-4">
              <div className="rounded-lg bg-blue-500/10 text-blue-400 p-2.5 w-fit">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-200">Semantic Analyzer</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Classifies raw bank transactions into semantic budgeting categories using localized Large Language Model inference, bypassing rigid keyword match rules.
              </p>
            </div>

            {/* Goal Pacing */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-4">
              <div className="rounded-lg bg-teal-500/10 text-teal-400 p-2.5 w-fit">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-200">Goal Tracking & Alerts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Computes budget variances and checks saving trajectories in parallel, detecting duplicate transactions and budget compromises instantly.
              </p>
            </div>

            {/* Privacy first */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-4">
              <div className="rounded-lg bg-blue-500/10 text-blue-400 p-2.5 w-fit">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-200">Privacy-First Core</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Operates locally utilizing PostgreSQL (pgvector) and local Ollama integrations, ensuring sensitive financial datasets never leave your server environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-center text-xs text-slate-600">
        <span>© 2026 BudgetBuddy AI Technologies. Designed in compliance with Savitribai Phule Pune University.</span>
      </footer>
    </div>
  );
}
