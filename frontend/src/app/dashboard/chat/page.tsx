"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Clock,
  Sparkles
} from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize and load chat sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("budgetbuddy_chat_sessions");
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions) as ChatSession[];
        if (parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved chat sessions:", e);
      }
    }
    
    // Default initial session if none exist
    const defaultSession: ChatSession = {
      id: "session-default",
      title: "Welcome Chat",
      messages: [
        { role: "assistant", content: "Hello Rohan! I am Rohan's personal finance assistant. Tell me about a financial goal you'd like to achieve, or ask me to review statement transactions!" }
      ],
      created_at: new Date().toISOString()
    };
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
    localStorage.setItem("budgetbuddy_chat_sessions", JSON.stringify([defaultSession]));
  }, []);

  // Sync scroll on message update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId, loading]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const activeMessages = activeSession ? activeSession.messages : [];

  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    localStorage.setItem("budgetbuddy_chat_sessions", JSON.stringify(updated));
  };

  const handleCreateNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "New Chat",
      messages: [
        { role: "assistant", content: "Hello! Starting a new discussion session. How can I help you optimize your savings limits or categorization today?" }
      ],
      created_at: new Date().toISOString()
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      alert("You must keep at least one active chat session.");
      return;
    }
    const updated = sessions.filter(s => s.id !== id);
    saveSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated[0].id);
    }
  };

  const handleStartEditSession = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleText(session.title);
  };

  const handleSaveSessionTitle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editTitleText.trim()) return;
    const updated = sessions.map(s => {
      if (s.id === id) {
        return { ...s, title: editTitleText.trim() };
      }
      return s;
    });
    saveSessions(updated);
    setEditingSessionId(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeSessionId) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message to active session
    let updatedMessages: Message[] = [...activeMessages, { role: "user", content: userMessage }];
    
    // Auto rename "New Chat" sessions based on first question
    let newTitle = activeSession?.title || "Chat";
    if (activeSession?.title === "New Chat") {
      newTitle = userMessage.length > 25 ? `${userMessage.substring(0, 22)}...` : userMessage;
    }

    let updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: newTitle,
          messages: updatedMessages
        };
      }
      return s;
    });
    saveSessions(updatedSessions);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "user_pune_2026",
          message: userMessage
        })
      });

      if (response.ok) {
        const data = await response.json();
        const finalMsg = data.messages[data.messages.length - 1]?.content || "Action complete.";
        
        // Append response message
        updatedMessages = [...updatedMessages, { role: "assistant", content: finalMsg }];
      } else {
        updatedMessages = [...updatedMessages, { role: "assistant", content: "Failed to establish database connection with LLM runtime." }];
      }
    } catch (err: any) {
      updatedMessages = [...updatedMessages, { role: "assistant", content: `Error: ${err.message}` }];
    } finally {
      setLoading(false);
      updatedSessions = sessions.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: newTitle,
            messages: updatedMessages
          };
        }
        return s;
      });
      saveSessions(updatedSessions);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] border border-[var(--border-app)] rounded-xl bg-[var(--bg-card)]/40 overflow-hidden shadow-lg">
      
      {/* Left panel: Chats logs list */}
      <div className="w-64 border-r border-[var(--border-app)] bg-[var(--bg-card)]/70 flex flex-col justify-between shrink-0">
        <div className="p-4 border-b border-[var(--border-app)] flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-blue-500" />
            Advisor Logs
          </span>
          <button 
            onClick={handleCreateNewChat}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            title="Start New Chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 p-2 overflow-y-auto space-y-1">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = session.id === editingSessionId;

            return (
              <div
                key={session.id}
                onClick={() => !isEditing && setActiveSessionId(session.id)}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium cursor-pointer transition-all ${
                  isActive 
                    ? "bg-blue-500/10 text-blue-500 border-l-2 border-blue-500 font-semibold" 
                    : "text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-500" : "opacity-60"}`} />
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      className="bg-[var(--bg-app)] border border-[var(--border-app)] rounded px-1.5 py-0.5 text-xs text-[var(--text-main)] focus:outline-none flex-1"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="truncate pr-1">{session.title}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                  {isEditing ? (
                    <button
                      onClick={(e) => handleSaveSessionTitle(e, session.id)}
                      className="p-1 text-emerald-500 hover:bg-[var(--bg-hover)] rounded"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleStartEditSession(e, session)}
                      className="p-1 text-[var(--text-sub)] hover:text-blue-500 hover:bg-[var(--bg-hover)] rounded"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="p-1 text-rose-500 hover:bg-[var(--bg-hover)] rounded"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action log summary */}
        <div className="p-3 border-t border-[var(--border-app)] bg-[var(--bg-app)]/50 text-[10px] text-[var(--text-sub)]">
          <p className="font-semibold flex items-center gap-1 text-[var(--text-main)]">
            <Sparkles className="h-3 w-3 text-blue-500" />
            Session Storage Sync
          </p>
          <p className="mt-1">Conversations are synced dynamically with client cookies.</p>
        </div>
      </div>

      {/* Right panel: Active Message logs workspace */}
      <div className="flex-1 flex flex-col justify-between bg-[var(--bg-app)]/10">
        
        {/* Header bar */}
        <div className="flex h-14 items-center justify-between border-b border-[var(--border-app)] bg-[var(--bg-card)]/80 px-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm tracking-wide text-[var(--text-main)]">
              {activeSession ? activeSession.title : "Select Conversation"}
            </h3>
            <span className="text-[10px] text-[var(--text-sub)] bg-[var(--bg-app)] px-2 py-0.5 rounded border border-[var(--border-app)] font-medium">
              {activeMessages.length} Messages
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-sub)] font-semibold">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            <span>Advisor Online</span>
          </div>
        </div>

        {/* Messages list viewport */}
        <div 
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto space-y-4 bg-[var(--bg-app)]/30"
        >
          {activeMessages.map((msg, index) => {
            const isAssistant = msg.role === "assistant";
            return (
              <div 
                key={index}
                className={`flex items-start gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
              >
                {isAssistant && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 border border-[var(--border-app)]">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div 
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    isAssistant 
                      ? "bg-[var(--bg-card)] border border-[var(--border-app)] text-[var(--text-main)]" 
                      : "bg-blue-600 text-white font-medium"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
                {!isAssistant && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-app)]">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start gap-3 justify-start animate-pulse">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 border border-[var(--border-app)]">
                <Bot className="h-4 w-4 animate-spin" />
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs text-[var(--text-sub)]">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span>Agent parsing logs and reasoning recommendations...</span>
              </div>
            </div>
          )}
        </div>

        {/* Message Input section */}
        <form 
          onSubmit={handleSendMessage}
          className="flex h-16 items-center gap-3 border-t border-[var(--border-app)] bg-[var(--bg-card)]/80 px-4"
        >
          <input
            type="text"
            placeholder="Ask Rohan's Co-pilot... (e.g. Set an expense goal of 12000 for Housing)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-[var(--bg-app)] border border-[var(--border-app)] rounded-xl px-4 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-sub)] focus:border-blue-500 focus:outline-none"
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all disabled:bg-slate-800 disabled:text-slate-500 shadow-md shadow-blue-500/20"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
