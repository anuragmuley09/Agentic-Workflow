"use client";

import React, { useState } from "react";
import { UploadCloud, CheckCircle, AlertTriangle, FileText, RefreshCw } from "lucide-react";

interface ImportedTransaction {
  date: string;
  description: string;
  amount: number;
  direction: string;
}

export default function StatementUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    imported_count: number;
    transactions: ImportedTransaction[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("user_id", "user_pune_2026");
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/v1/statements/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
        setFile(null);
        // Force layout update
        window.dispatchEvent(new Event("dashboard-update"));
      } else {
        setError(data.detail || "Failed to process bank statement.");
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">Upload Statements</h1>
        <p className="text-sm text-[var(--text-sub)]">Upload PDF or CSV monthly bank statements for parsing, normalization, and ingestion.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Upload Form Box (Left 1 Column) */}
        <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 shadow flex flex-col gap-4 h-fit">
          <div className="flex items-center gap-2 border-b border-[var(--border-app)] pb-2 text-[var(--text-accent)]">
            <UploadCloud className="h-5 w-5" />
            <h3 className="font-bold text-sm tracking-wider uppercase text-[var(--text-main)]">Import Statement</h3>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            {/* File Selection Zone */}
            <div className="border-2 border-dashed border-[var(--border-app)] hover:border-blue-500/50 bg-[var(--bg-app)]/50 rounded-xl p-6 text-center cursor-pointer transition-all relative">
              <input
                type="file"
                accept=".csv,.pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                required
              />
              <UploadCloud className="h-10 w-10 text-[var(--text-sub)] mx-auto mb-2 opacity-70" />
              <p className="text-xs font-semibold text-[var(--text-main)]">
                {file ? file.name : "Select CSV or PDF file"}
              </p>
              <p className="text-[10px] text-[var(--text-sub)] mt-1 font-medium">Supports standard CSV sheets or PDF statements</p>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full bg-blue-600 text-white hover:bg-blue-500 p-2.5 rounded-lg font-bold transition-all disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing file...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Parse & Ingest</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg flex items-start gap-2 text-xs text-rose-500">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Import Results Box (Right 2 Columns) */}
        <div className="md:col-span-2 space-y-4">
          {result ? (
            <div className="rounded-xl border border-[var(--border-app)] bg-[var(--bg-card)] p-5 shadow flex flex-col gap-4">
              <div className="flex items-center gap-2 text-blue-500 border-b border-[var(--border-app)] pb-2">
                <CheckCircle className="h-5 w-5" />
                <h3 className="font-bold text-sm tracking-wider uppercase text-[var(--text-main)]">Import Report</h3>
              </div>

              <div className="flex items-center justify-between bg-[var(--bg-app)] border border-[var(--border-app)] p-4 rounded-xl">
                <div>
                  <p className="text-xs text-[var(--text-sub)] font-semibold">Status</p>
                  <p className="text-sm font-bold text-blue-500">Successfully Ingested</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--text-sub)] font-semibold">Imported Transactions</p>
                  <p className="text-sm font-bold text-[var(--text-main)]">{result.imported_count} new entries</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--text-sub)] uppercase tracking-wider mb-2.5">Imported Records:</h4>
                <div className="max-h-60 overflow-y-auto border border-[var(--border-app)] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs text-[var(--text-sub)]">
                    <thead className="bg-[var(--bg-app)] text-[var(--text-main)] uppercase tracking-wider text-[9px] font-bold">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Merchant / Description</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Direction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-app)]">
                      {result.transactions.length > 0 ? (
                        result.transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-[var(--bg-hover)] transition-colors">
                            <td className="p-2.5 whitespace-nowrap">{tx.date}</td>
                            <td className="p-2.5 font-semibold text-[var(--text-main)]">{tx.description}</td>
                            <td className="p-2.5 font-bold text-[var(--text-main)]">₹{tx.amount.toLocaleString()}</td>
                            <td className="p-2.5">
                              <span className={`text-[10px] font-bold uppercase ${tx.direction === "credit" ? "text-blue-500" : "text-rose-500"}`}>
                                {tx.direction}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-[var(--text-sub)]">
                            No new transactions imported (all matched existing duplicates).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-app)] bg-[var(--bg-card)]/30 p-16 text-center h-full flex flex-col items-center justify-center shadow-sm">
              <FileText className="h-12 w-12 text-[var(--text-sub)] opacity-55 mb-3" />
              <h3 className="font-bold text-[var(--text-main)]">Statement parsing report</h3>
              <p className="text-xs text-[var(--text-sub)] mt-1 max-w-sm">
                Once a bank statement is uploaded, details of the parsed transactions, counts, and import logs will be rendered here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
