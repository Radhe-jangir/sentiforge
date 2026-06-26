/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";
import { 
  BarChart2, 
  Database, 
  Download, 
  FileText, 
  Lightbulb, 
  Moon, 
  RotateCcw, 
  SearchCode, 
  Smile, 
  Sun, 
  Trash2, 
  Code2, 
  Clipboard, 
  Check, 
  ChevronRight, 
  Sparkles,
  RefreshCw
} from "lucide-react";
import { jsPDF } from "jspdf";
import confetti from "canvas-confetti";
import { FLASK_PROJECT_FILES, FlaskFile } from "./flaskCode";

interface AnalysisRecord {
  id: number;
  text: string;
  polarity: number;
  subjectivity: number;
  classification: string;
  confidence: number;
  emoji: string;
  timestamp: string;
  positive_words: { text: string; value: number }[];
  negative_words: { text: string; value: number }[];
  word_cloud: { text: string; value: number }[];
}

export default function App() {
  // Navigation tabs: 'dashboard' | 'code'
  const [activeTab, setActiveTab] = useState<"dashboard" | "code">("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Core App states
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisRecord | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  
  // Auth states
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth-token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("auth-username"));
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsernameInput, setAuthUsernameInput] = useState("");
  const [authPasswordInput, setAuthPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Flask Code Viewer Selectors
  const [activeCodeFile, setActiveCodeFile] = useState<FlaskFile>(FLASK_PROJECT_FILES[0]);
  const [isCopied, setIsCopied] = useState(false);

  // Load theme and session history on component trigger
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") as "light" | "dark" || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (token) {
      fetchHistory(token);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("app-theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const fetchHistory = async (overrideToken?: string | null) => {
    const currentToken = overrideToken !== undefined ? overrideToken : token;
    if (!currentToken) {
      setHistory([]);
      return;
    }
    try {
      const res = await fetch("/api/history", {
        headers: {
          "Authorization": `Bearer ${currentToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Error communicating with Express history route:", err);
    }
  };

  const handleClearText = () => {
    setInputText("");
    setCurrentResult(null);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
      } catch (e) {
        // silent fail
      }
    }
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-username");
    setToken(null);
    setUsername(null);
    setHistory([]);
    setCurrentResult(null);
    setAuthUsernameInput("");
    setAuthPasswordInput("");
    setAuthError("");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const path = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUsernameInput, password: authPasswordInput })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("auth-token", data.token);
        localStorage.setItem("auth-username", data.username);
        setToken(data.token);
        setUsername(data.username);
        setAuthUsernameInput("");
        setAuthPasswordInput("");
        await fetchHistory(data.token);
      } else {
        setAuthError(data.error || "Authentication failed. Please try again.");
      }
    } catch (err) {
      setAuthError("Failed to communicate with authentication server.");
      console.error(err);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSubmit = inputText.trim();
    if (!textToSubmit) return;

    setIsAnalyzing(true);
    try {
      const headersInit: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headersInit["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: headersInit,
        body: JSON.stringify({ text: textToSubmit })
      });

      if (res.ok) {
        const record = await res.json();
        setCurrentResult(record);
        
        
        // Positive Sentiment triggers celebratory confetti
        if (record.classification === "Positive" && record.polarity >= 0.4) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
        
        // Refresh table listings
        // await fetchHistory();
      } else {
        alert("Server returned error evaluating sentiment.");
      }
    } catch (err) {
      console.error("Communication error evaluating string:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearSqliteHistory = async () => {
    if (!window.confirm("Purge all recorded analysis logs from persistence? This replicates a full SQL TRUNCATE table action.")) {
      return;
    }

    try {
      const headersInit: Record<string, string> = {};
      if (token) {
        headersInit["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/history/clear", { 
        method: "POST",
        headers: headersInit
      });
      if (res.ok) {
        setHistory([]);
        setCurrentResult(null);
      }
    } catch (err) {
      console.error("Could not truncate database files:", err);
    }
  };

  // CSV Export helper
  const handleExportCsv = () => {
    if (token) {
      window.open(`/api/export-csv?token=${encodeURIComponent(token)}`, "_blank");
    } else {
      window.open("/api/export-csv", "_blank");
    }
  };

  // PDF styled generator using jsPDF
  const handleExportPdf = (record: AnalysisRecord) => {
    const doc = new jsPDF();
    
    // Header Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SENTIMENT ANALYSIS REPORT", 20, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${record.timestamp} UTC (Local Persistence Engine)`, 20, 32);
    
    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 38, 190, 38);
    
    // Analyzed sentence
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Analyzed Statement Context", 20, 48);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    const splitText = doc.splitTextToSize(`"${record.text}"`, 170);
    doc.text(splitText, 20, 56);
    
    const textOffset = splitText.length * 6;
    const startMetrics = 56 + textOffset + 10;
    
    // Metrics section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("NLP Polarity & Subjectivity Details", 20, startMetrics);
    
    // Custom Table Grid
    const rowStart = startMetrics + 6;
    doc.setFillColor(248, 250, 252);
    doc.rect(20, rowStart, 170, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Metric Metric Name", 24, rowStart + 5);
    doc.text("Computed Value", 80, rowStart + 5);
    doc.text("Diagnostic Range / Description", 125, rowStart + 5);
    
    const items = [
      { key: "Classification", val: record.classification, desc: `Sentiment evaluated as ${record.classification.toLowerCase()}` },
      { key: "Polarity Score", val: `${record.polarity > 0 ? "+" : ""}${record.polarity}`, desc: "[-1.0 to +1.0] Positive (>0.05) to Negative (<-0.05)" },
      { key: "Subjectivity Score", val: record.subjectivity, desc: "[0.0 to 1.0] Factual (0.0) to Opinion-based (1.0)" },
      { key: "Certainty Confidence", val: `${record.confidence}%`, desc: "Integrity validation scoring" },
    ];
    
    items.forEach((item, idx) => {
      const y = rowStart + 8 + (idx * 10);
      doc.setDrawColor(226, 232, 240);
      doc.line(20, y, 190, y);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(item.key, 24, y + 6);
      
      doc.setFont("helvetica", "bold");
      if (item.key === "Classification") {
        if (item.val === "Positive") doc.setTextColor(16, 185, 129);
        else if (item.val === "Negative") doc.setTextColor(239, 68, 68);
        else doc.setTextColor(100, 116, 139);
      } else {
        doc.setTextColor(15, 23, 42);
      }
      doc.text(String(item.val), 80, y + 6);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(item.desc, 125, y + 6);
    });
    
    const bottomLine = rowStart + 8 + (items.length * 10);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, bottomLine, 190, bottomLine);
    
    // Educational Footer
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Understanding Python TextBlob Metric Calculations", 20, bottomLine + 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("1. Polarity score measures emotional amplitude. It parses adjective modifiers in reference directories.", 20, bottomLine + 22);
    doc.text("2. Subjectivity score checks sentence qualifiers to assess if text is factual or subjective.", 20, bottomLine + 28);
    
    // Footer signature
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Generated via SentiMind Senior Portfolio Dashboard SDK", 105, bottomLine + 45, { align: "center" });
    
    doc.save(`sentimind_sentiment_analysis_${record.id}.pdf`);
  };

  // Handle Copy to Clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCodeFile.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Recharts metric calculations
  const totalAnalyses = history.length;
  const avgPolarity = totalAnalyses > 0 ? history.reduce((sum, item) => sum + item.polarity, 0) / totalAnalyses : 0;
  const avgSubjectivity = totalAnalyses > 0 ? history.reduce((sum, item) => sum + item.subjectivity, 0) / totalAnalyses : 0;

  // Pie chart structured data
  const positiveCount = history.filter(item => item.classification === "Positive").length;
  const negativeCount = history.filter(item => item.classification === "Negative").length;
  const neutralCount = history.filter(item => item.classification === "Neutral").length;

  const pieData = [
    { name: "Positive", value: positiveCount, color: "#10b981" },
    { name: "Negative", value: negativeCount, color: "#ef4444" },
    { name: "Neutral", value: neutralCount, color: "#94a3b8" }
  ].filter(item => item.value > 0);

  // Bar chart structured data based on polarity divisions
  const barData = [
    { range: "V. Neg (-1 to -0.6)", count: history.filter(item => item.polarity <= -0.6).length, fillColor: "#991b1b" },
    { range: "Negative (-0.6 to -0.05)", count: history.filter(item => item.polarity > -0.6 && item.polarity <= -0.05).length, fillColor: "#ef4444" },
    { range: "Neutral (-0.05 to 0.05)", count: history.filter(item => item.polarity > -0.05 && item.polarity < 0.05).length, fillColor: "#94a3b8" },
    { range: "Positive (0.05 to 0.6)", count: history.filter(item => item.polarity >= 0.05 && item.polarity < 0.6).length, fillColor: "#60a5fa" },
    { range: "V. Pos (0.6 to 1.0)", count: history.filter(item => item.polarity >= 0.6).length, fillColor: "#1d4ed8" },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 immersive-radial ${theme === "dark" ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
      
      {/* Upper Navigation Bar */}
      <header className={`border-b sticky top-0 z-50 transition-colors backdrop-blur-md ${theme === "dark" ? "bg-[#050508]/75 border-white/10" : "bg-white/75 border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-0 md:h-18 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          
          {/* Logo Brand Title */}
          <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/20 shrink-0">
                <Smile className="w-5.5 h-5.5 animate-pulse" />
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <span className="font-display font-bold text-lg md:text-xl tracking-tight bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent">SentiMind</span>
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${theme === "dark" ? "bg-white/5 text-[#06b6d4] border border-white/10" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>Python Flask SDK</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Automated Sentiment Diagnostics</p>
              </div>
            </div>

            {/* Dark Mode Switch icon (Visible next to brand on mobile) */}
            <button 
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all duration-200 md:hidden ${theme === "dark" ? "bg-white/5 border-white/10 text-amber-400 hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              title="Toggle theme mode"
              aria-label="Toggle theme mode"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Controls Actions wrapper */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* User Profile badge status */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              {username ? (
                <div className="flex items-center space-x-2 text-xs w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex items-center space-x-1.5">
                    <span className="opacity-60 hidden sm:inline">Profile:</span>
                    <span className="font-mono bg-blue-500/10 text-blue-600 dark:text-cyan-400 px-2.5 py-1 rounded-lg border border-blue-500/20 font-bold max-w-[120px] truncate">{username}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-lg border border-red-500/25 hover:bg-red-500/10 text-red-500 transition-all text-xs font-semibold cursor-pointer shrink-0 min-h-[38px] flex items-center justify-center"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <span className="text-xs bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 rounded-lg px-2.5 py-1 font-mono">🔐 Guest Sandbox</span>
              )}
            </div>

            {/* Tab switch button & Desktop Darkmode Toggle */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className={`p-1 rounded-xl flex items-center flex-grow sm:flex-grow-0 ${theme === "dark" ? "bg-white/5 border border-white/5" : "bg-slate-100"}`}>
                <button 
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 flex items-center justify-center space-x-1.5 flex-1 sm:flex-initial min-h-[36px] ${activeTab === "dashboard" ? (theme === "dark" ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20" : "bg-white text-slate-900 shadow-sm") : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button 
                  onClick={() => setActiveTab("code")}
                  className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 flex items-center justify-center space-x-1.5 flex-1 sm:flex-initial min-h-[36px] ${activeTab === "code" ? (theme === "dark" ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20" : "bg-white text-slate-900 shadow-sm") : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
                >
                  <Code2 className="w-4 h-4" />
                  <span>Python Source</span>
                </button>
              </div>

              {/* Desktop Theme Switch icon */}
              <button 
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl border transition-all duration-200 hidden md:block shrink-0 ${theme === "dark" ? "bg-white/5 border-white/10 text-amber-400 hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                title="Toggle theme mode"
              >
                {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === "dashboard" ? (
          <div>
            {/* Top Info Banner introducing user how the model handles Python/Flask equivalence */}
            <div className={`p-5 rounded-2xl glass-card mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${theme === "dark" ? "border-cyan-500/15" : "border-blue-100"}`}>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-950 dark:text-white text-sm">Portfolio-grade Full-Stack Architecture</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    This live preview runs on a node Express NLP microservice mirroring TextBlob algorithms. We have pre-compiled the **identical Python + Flask equivalent files** directly on this container root! Use the upper <b>📦 Python/Flask Code</b> tab to view and download files for your GitHub push.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab("code")} 
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg transition-colors shrink-0 flex items-center space-x-1"
              >
                <span>Browse Python Project</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Grid Layout splits input form & results dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
              
              {/* Form card left */}
              <div className="md:col-span-7 flex flex-col">
                <div className="glass-card p-6 flex flex-col flex-grow transition-all">
                  <h3 className="text-lg font-bold tracking-tight mb-2 flex items-center space-x-2">
                    <FileText className="text-[#3b82f6] w-5 h-5" />
                    <span>Analyze Document Stream</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-sans leading-relaxed">
                    Type feedback statement paragraphs, product reviews, or customer service tickets. The engine measures adjectives, counts frequencies, checks preceding negation tags, and logs outcomes into the database.
                  </p>

                  <form onSubmit={handleAnalyze} className="flex flex-col flex-grow">
                    <div className="relative flex-grow">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type something like: 'This implementation was exceptionally amazing! Extremely responsive dashboard and helpful components, though the visual margins felt slightly average at first.'"
                        className="w-full min-h-[180px] p-4 text-sm rounded-xl input-area relative z-10 focus:ring-4 focus:ring-blue-500/15 focus:border-[#3b82f6] transition-all resize-none"
                        required
                      />
                      <span className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-400 dark:text-slate-300 z-20">
                        {inputText.length} chars
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 mt-4 pt-4">
                      <button
                        type="button"
                        onClick={handleClearText}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${theme === "dark" ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      >
                        Clear Canvas
                      </button>

                      <button
                        type="submit"
                        disabled={isAnalyzing || !inputText.trim()}
                        className={`btn-primary px-6 py-2 rounded-lg text-xs font-bold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] ${isAnalyzing || !inputText.trim() ? "bg-slate-400 cursor-not-allowed opacity-60" : ""}`}
                      >
                        {isAnalyzing ? (
                          <span className="flex items-center space-x-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Computing scores...</span>
                          </span>
                        ) : (
                          <span>Analyze Sentiment</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Dynamic Results right */}
              <div className="md:col-span-5 flex flex-col">
                {!currentResult ? (
                  <div className="glass-card p-8 text-center flex flex-col justify-center items-center h-full transition-all">
                    <div className={`p-4 rounded-full mb-3 ${theme === "dark" ? "bg-white/5 border border-white/5" : "bg-blue-50"}`}>
                      <SearchCode className="w-8 h-8 text-slate-400 dark:text-[#06b6d4]" />
                    </div>
                    <h4 className="font-semibold text-sm">Awaiting Submission</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
                      Enter a textual quote on the left and submit to view live polarities, subjectivity charts, and download custom PDF reports.
                    </p>
                  </div>
                ) : (
                  <div className="glass-card p-6 space-y-5 transition-all">
                    
                    {/* Emotion Classification display */}
                    <div className="flex items-center space-x-4">
                      <div className="text-5xl animate-bounce">{currentResult.emoji}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-display font-extrabold text-2xl tracking-tight">{currentResult.classification}</h4>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${currentResult.classification === "Positive" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : currentResult.classification === "Negative" ? "bg-red-500/10 text-red-500 border border-red-500/25" : "bg-slate-500/10 text-slate-400 border border-slate-500/25"}`}>
                            Tone Rating
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Certainty Confidence level score: <span className="font-mono font-bold text-[#06b6d4]">{currentResult.confidence}%</span></p>
                      </div>
                    </div>

                    {/* Progress bars of polarities */}
                    <div className="space-y-4 border-t border-slate-150 dark:border-white/10 pt-4">
                      
                      {/* Polarity Slider scale progress bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1" title="Scales from -1.00 (Highly Negative) to +1.00 (Highly Positive)">
                            <span>Polarity Score Index:</span>
                            <Lightbulb className="w-3.5 h-3.5 text-blue-500 dark:text-amber-400 cursor-help" />
                          </span>
                          <span className={`font-mono font-bold ${currentResult.polarity > 0.05 ? "text-emerald-500" : currentResult.polarity < -0.05 ? "text-red-500" : "text-slate-500"}`}>
                            {currentResult.polarity > 0 ? "+" : ""}{currentResult.polarity.toFixed(4)}
                          </span>
                        </div>
                        {/* Interactive Scale progress track container */}
                        <div className={`w-full h-2 rounded-full relative overflow-hidden ${theme === "dark" ? "bg-white/10" : "bg-slate-100"}`}>
                          <div 
                            className={`h-full transition-all duration-300 ${currentResult.polarity > 0.05 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : currentResult.polarity < -0.05 ? "bg-gradient-to-r from-red-500 to-rose-400" : "bg-slate-500"}`}
                            style={{ width: `${((currentResult.polarity + 1) / 2) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] text-slate-400 dark:text-slate-500 font-mono mt-1">
                          <span>-1.0 (Negative)</span>
                          <span>0.0 (Neutral)</span>
                          <span>+1.0 (Positive)</span>
                        </div>
                      </div>

                      {/* Subjectivity score progress */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1" title="Scales from 0.00 (Pure facts/statements) to 1.00 (Strong speculative adjectives/personal opinions)">
                            <span>Subjectivity Factor:</span>
                            <Lightbulb className="w-3.5 h-3.5 text-blue-500 dark:text-amber-400 cursor-help" />
                          </span>
                          <span className="font-mono text-blue-500 dark:text-cyan-400 font-bold">
                            {currentResult.subjectivity.toFixed(4)}
                          </span>
                        </div>
                        <div className={`w-full h-2 rounded-full relative overflow-hidden ${theme === "dark" ? "bg-white/10" : "bg-slate-100"}`}>
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                            style={{ width: `${currentResult.subjectivity * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] text-slate-400 dark:text-slate-500 font-mono mt-1">
                          <span>0.0 (Pure Objective Truth)</span>
                          <span>1.0 (Fully Subjective Adjectives)</span>
                        </div>
                      </div>
                    </div>

                    {/* Word clusters list */}
                    <div className="border-t border-slate-150 dark:border-white/10 pt-4">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider block mb-2">Lexical Token Distribution:</span>
                      <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
                        {currentResult.word_cloud.length > 0 ? (
                          currentResult.word_cloud.map((token, idx) => (
                            <span 
                              key={idx}
                              className={`px-2 py-1 rounded-md border text-xs font-mono transition-colors ${theme === "dark" ? "bg-white/5 border-white/5 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                              style={{ fontSize: `${Math.max(10, Math.min(13, 10 + token.value * 0.5))}px` }}
                            >
                              {token.text} <b className="text-blue-500 dark:text-cyan-400 ms-0.5">{token.value}</b>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No recurring tokens found</span>
                        )}
                      </div>
                    </div>

                    {/* Report action trigger */}
                    <div className="border-t border-slate-150 dark:border-white/10 pt-4">
                      <button
                        onClick={() => handleExportPdf(currentResult)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-1 shadow-md shadow-red-500/10 cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Export Analytical PDF Report</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>

            </div>

            {/* Dashboard Analytics grid section with charts and totals - Guarded by Authentication */}
            {!token ? (
              <section className="mt-12 max-w-2xl mx-auto">
                <div className="glass-card p-8 transition-all border-dashed border-2 border-slate-200 dark:border-white/10 text-center">
                  <div className="bg-blue-600/10 text-blue-600 dark:text-cyan-400 p-4 rounded-xl w-14 h-14 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Database className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight mb-1">🔐 Persistence and Analytics Panel Restricted</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                    Personalized SQL databases, historical trends charts, and Excel/CSV exporting require an authenticated profile on SentiMind. Register or log in below to start saving your analysis logs separately.
                  </p>
                  
                  {/* Auth Mode switcher */}
                  <div className="flex border-b border-slate-150 dark:border-white/5 mb-6 justify-center">
                    <button 
                      type="button"
                      onClick={() => { setAuthMode("login"); setAuthError(""); }}
                      className={`px-5 py-2 text-xs font-bold transition-all cursor-pointer ${authMode === "login" ? "border-b-2 border-blue-500 text-blue-600 dark:text-cyan-400 font-extrabold" : "text-slate-400 dark:text-slate-500 hover:text-slate-550"}`}
                    >
                      Login Account
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setAuthMode("register"); setAuthError(""); }}
                      className={`px-5 py-2 text-xs font-bold transition-all cursor-pointer ${authMode === "register" ? "border-b-2 border-blue-500 text-blue-600 dark:text-cyan-400 font-extrabold" : "text-slate-400 dark:text-slate-400 hover:text-slate-550"}`}
                    >
                      Register Profile
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-4 max-w-sm mx-auto text-left">
                    {authError && (
                      <div className="p-3 rounded-lg text-xs bg-red-500/10 text-red-500 border border-red-500/20 text-center font-bold">
                        ⚠️ {authError}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">Profile Username</label>
                      <input 
                        type="text" 
                        required
                        value={authUsernameInput}
                        onChange={(e) => setAuthUsernameInput(e.target.value)}
                        placeholder="e.g. system_admin" 
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/15 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">Security Password</label>
                      <input 
                        type="password" 
                        required
                        value={authPasswordInput}
                        onChange={(e) => setAuthPasswordInput(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/15 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg p-2.5 text-xs font-bold hover:brightness-110 transition-all cursor-pointer shadow-md shadow-blue-500/10 text-center block"
                    >
                      {authMode === "login" ? "Verify Credentials & Log In" : "Register Profile & Open Sqlite"}
                    </button>
                  </form>
                </div>
              </section>
            ) : (
              <>
                {/* Dashboard Analytics grid section with charts and totals */}
                <section className="mt-12">
                  <div className="glass-card p-6 transition-all">
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                      <div>
                        <h3 className="text-lg font-bold tracking-tight">Analytical Insights Panel</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-300 font-medium">Aggregate database results from active SQLite session</p>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg flex items-center space-x-1 ${theme === "dark" ? "bg-white/5 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                          <Database className="w-3.5 h-3.5" />
                          <span>Persistent DB</span>
                        </span>
                      </div>
                    </div>

                    {/* Big Metric Display grids */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-8">
                      {/* Totals */}
                      <div className={`p-5 rounded-xl border transition-colors ${theme === "dark" ? "bg-white/2 border-white/5" : "bg-slate-50/50 border-slate-150"}`}>
                        <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-300 font-semibold tracking-wider block">Total Logs Ingested</span>
                        <h2 className="text-3xl font-extrabold tracking-tight text-[#3b82f6] mt-1">{totalAnalyses}</h2>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Saved files in workspace SQLite system</p>
                      </div>
                      {/* Average Polarities */}
                      <div className={`p-5 rounded-xl border transition-colors ${theme === "dark" ? "bg-white/2 border-white/5" : "bg-slate-50/50 border-slate-150"}`}>
                        <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-300 font-semibold tracking-wider block">Mean Polarity Rating</span>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                          {totalAnalyses > 0 ? `${avgPolarity > 0 ? "+" : ""}${avgPolarity.toFixed(4)}` : "0.0000"}
                        </h2>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Scale [-1.000 to +1.000]</p>
                      </div>
                      {/* Average Subjectivities */}
                      <div className={`p-5 rounded-xl border transition-colors ${theme === "dark" ? "bg-white/2 border-white/5" : "bg-slate-50/50 border-slate-150"}`}>
                        <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-300 font-semibold tracking-wider block">Mean Subjectivity Coefficient</span>
                        <h2 className="text-3xl font-extrabold tracking-tight text-[#06b6d4] mt-1">
                          {avgSubjectivity.toFixed(4)}
                        </h2>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Scale [0.000 to 1.000]</p>
                      </div>
                    </div>

                    {/* Visualizer SVGs */}
                    {totalAnalyses === 0 ? (
                      <div className="py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-xl flex flex-col justify-center items-center text-slate-400 text-center">
                        <BarChart2 className="w-10 h-10 mb-2" />
                        <h4 className="font-semibold text-sm">Visualizers Standby</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                          Ingest textual logs to calculate polarity histograms and tone classifications within the running Express environment.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Tone classifications pie chart */}
                        <div className={`p-4 rounded-xl border transition-colors ${theme === "dark" ? "bg-white/2 border-white/5" : "bg-slate-50/50 border-slate-150"}`}>
                          <h4 className="text-sm font-bold tracking-tight mb-4 text-center">Tone Categorisation Distribution</h4>
                          <div className="h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={65}
                                  outerRadius={85}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: theme === "dark" ? "#131a26" : "#ffffff",
                                    borderColor: theme === "dark" ? "#2e3c4e" : "#e2e8f0",
                                    color: theme === "dark" ? "#ffffff" : "#000000"
                                  }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Word polarity ranges bar chart */}
                        <div className={`p-4 rounded-xl border transition-colors ${theme === "dark" ? "bg-white/2 border-white/5" : "bg-slate-50/50 border-slate-150"}`}>
                          <h4 className="text-sm font-bold tracking-tight mb-4 text-center">Polarity Scoring Variations</h4>
                          <div className="h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(255,255,255,0.05)" : "#edf2f7"} vertical={false} />
                                <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
                                <Tooltip
                                  cursor={{ fill: "transparent" }}
                                  contentStyle={{ 
                                    backgroundColor: theme === "dark" ? "#161622" : "#ffffff",
                                    borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "#e2e8f0",
                                    color: theme === "dark" ? "#ffffff" : "#000000"
                                  }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                  {barData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fillColor} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                </section>

                {/* Persistence logs history grid logs */}
                <section className="mt-12" id="dbLogsSection">
                  <div className="glass-card p-6 transition-all">
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-bold tracking-tight flex items-center space-x-2">
                          <Database className="w-5 h-5 text-blue-500" />
                          <span>SQLite Local Persistence Stream</span>
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-300 font-medium">All logged operations saved in container environment storage</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={clearSqliteHistory}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center space-x-1 transition-all cursor-pointer ${theme === "dark" ? "bg-white/5 border-white/10 text-red-400 hover:bg-white/10" : "bg-white border-slate-200 text-red-600 hover:bg-red-50"}`}
                          disabled={history.length === 0}
                          title="Simulates SQL DELETE * analyses"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Truncate DB</span>
                        </button>

                        <button
                          onClick={handleExportCsv}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center space-x-1 transition-all cursor-pointer ${theme === "dark" ? "bg-white/5 border-white/10 text-emerald-400 hover:bg-white/10" : "bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50"}`}
                          disabled={history.length === 0}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export CSV Spreadsheet</span>
                        </button>
                      </div>
                    </div>

                    {/* History list layout */}
                    <div className={`overflow-x-auto rounded-xl border ${theme === "dark" ? "border-white/10" : "border-slate-150"}`}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className={`font-semibold uppercase font-mono ${theme === "dark" ? "bg-[#050508]/40 border-b border-white/10 text-slate-400" : "bg-slate-50 border-b border-slate-200 text-slate-500"}`}>
                          <tr>
                            <th className="px-4 py-3.5 text-center w-14">DB ID</th>
                            <th className="px-4 py-3.5 text-center w-36">Tone Rating</th>
                            <th className="px-4 py-3.5 text-center w-28">Polarity</th>
                            <th className="px-4 py-3.5 text-center w-28">Subjectivity</th>
                            <th className="px-4 py-3.5 text-center w-24">Precision</th>
                            <th className="px-4 py-3.5">Text Statement</th>
                            <th className="px-4 py-3.5 text-end w-40">UTC Timestamp</th>
                            <th className="px-4 py-3.5 text-center w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-white/10">
                          {history.length > 0 ? (
                            history.map((record) => (
                              <tr key={record.id} className="transition-colors hover:bg-white/5 dark:hover:bg-white/2">
                                <td className="px-4 py-3.5 font-mono text-center text-slate-400 font-semibold">{record.id}</td>
                                <td className="px-4 py-3.5 text-center">
                                  <span className={`px-2.5 py-1 rounded text-[10px] font-semibold tracking-wide ${record.classification === "Positive" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : record.classification === "Negative" ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20"}`}>
                                    {record.classification} {record.emoji}
                                  </span>
                                </td>
                                <td className={`px-4 py-3.5 text-center font-mono font-bold ${record.polarity > 0.05 ? "text-emerald-500" : record.polarity < -0.05 ? "text-red-500" : "text-slate-400"}`}>
                                  {record.polarity > 0 ? "+" : ""}{record.polarity.toFixed(4)}
                                </td>
                                <td className="px-4 py-3.5 text-center font-mono text-blue-500 dark:text-cyan-400 font-bold">{record.subjectivity.toFixed(4)}</td>
                                <td className="px-4 py-3.5 text-center font-mono text-slate-400 font-medium">{record.confidence}%</td>
                                <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300 max-w-[280px] truncate" title={record.text}>{record.text}</td>
                                <td className="px-4 py-3.5 text-end text-slate-400 font-mono text-[10px]">{record.timestamp}</td>
                                <td className="px-4 py-3.5 text-center">
                                  <button 
                                    onClick={() => handleExportPdf(record)}
                                    className="p-1.5 rounded-lg bg-red-650/10 text-red-500 hover:bg-red-600/20 transition-all cursor-pointer inline-flex items-center"
                                    title="Download structured PDF file"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                <span className="block text-2xl mb-1">📁</span>
                                <span className="font-semibold text-xs text-slate-400 block">No database rows saved</span>
                                <span className="text-[10px] text-slate-500 max-w-sm block mx-auto mt-1">Submit text queries in the controller sandbox to populate local sqlite records history.</span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>
                </section>
              </>
            )}
          </div>
        ) : (
          /* Portfolio-grade Code browser viewer tab layout */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">
            
            {/* Sidebar directory file selectors */}
            <div className="md:col-span-1">
              <div className="glass-card p-4 h-full transition-all">
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 dark:text-slate-300 uppercase mb-4 flex items-center space-x-1">
                  <span>📂 Project Explorer</span>
                </h3>
                <div className="space-y-1.5">
                  {FLASK_PROJECT_FILES.map((file) => {
                    const isSelected = file.name === activeCodeFile.name;
                    return (
                      <button
                        key={file.name}
                        onClick={() => {
                          setActiveCodeFile(file);
                          setIsCopied(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${isSelected ? (theme === "dark" ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-[#06b6d4] border border-[#06b6d4]/30 shadow-inner" : "bg-blue-50 text-blue-600 border border-blue-100") : "text-slate-500 hover:bg-white/5 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-transparent"}`}
                      >
                        <div className="flex items-center space-x-2">
                          <code className="text-blue-500 tracking-tighter">&lt;/&gt;</code>
                          <span className="truncate">{file.name}</span>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? "translate-x-0.5 text-[#06b6d4]" : "text-slate-300"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Code viewing pre area */}
            <div className="md:col-span-3">
              <div className="glass-card overflow-hidden flex flex-col h-full transition-all">
                
                {/* Upper bar detailing path and copy action */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${theme === "dark" ? "bg-[#050508]/40 border-white/10" : "bg-slate-50 border-slate-150"}`}>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="font-mono text-[10px] text-slate-500 mt-0.5 ms-2">{activeCodeFile.path}</span>
                  </div>
                  
                  <button
                    onClick={handleCopyCode}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center space-x-1.5 transition-all cursor-pointer ${theme === "dark" ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Copy Code Block</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Preformatted scrolling area */}
                <pre className="p-5 overflow-auto flex-grow max-h-[500px] text-left font-mono text-[11px] leading-relaxed bg-[#0b0f19]/90 text-[#cbd5e1] border-none select-text">
                  <code>{activeCodeFile.content}</code>
                </pre>

                {/* Brief advice */}
                <div className={`p-4 border-t text-[10px] font-mono leading-normal ${theme === "dark" ? "bg-[#050508]/40 border-white/10 text-slate-400" : "bg-slate-50 border-slate-150"}`}>
                  💡 <b>PRO TIP:</b> These files have been fully constructed directly in your workspace under the <code>/flask-project/</code> directory. When you use the settings menu inside Google AI Studio to <b>Export zip file</b> or <b>Push to GitHub</b>, these actual files are preserved. You can immediately deploy them to server environments such as <b>Render</b>, AWS or Google Cloud.
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* Primary footer */}
      <footer className={`border-t py-6 text-center mt-16 transition-colors ${theme === "dark" ? "bg-[#050508]/40 border-white/10 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
        <p className="text-xs font-medium">SentiMind Professional Portfolio Layout Platform — Powered by React, Vite, Node Express, and Custom Lexical Engine.</p>
        <p className="text-[10px] font-mono text-slate-400 mt-1">Bound to Port 3000 — Preserving SQLite Database schemas (analyses.db) and Flask (Jinja2) templates.</p>
      </footer>

    </div>
  );
}
