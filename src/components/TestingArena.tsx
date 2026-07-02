import React, { useEffect, useState, useRef } from "react";
import { Play, Activity, Terminal, Brain, Sparkles, AlertTriangle, RefreshCw, Zap, Cpu, Database } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface TestMessage {
  id: string;
  agent: 'user' | 'vanilla' | 'combine' | 'system';
  content: string;
  metadata?: any;
}

interface AgentMetrics {
  tokensUsed: number;
  apiRequests: number;
  halts: number;
  steps: number;
}

interface TestMetrics {
  vanilla: AgentMetrics;
  combine: AgentMetrics;
}

export default function TestingArena() {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [mobileTab, setMobileTab] = useState<'vanilla' | 'combine'>('vanilla');
  const [metrics, setMetrics] = useState<TestMetrics>({
    vanilla: { tokensUsed: 0, apiRequests: 0, halts: 0, steps: 0 },
    combine: { tokensUsed: 0, apiRequests: 0, halts: 0, steps: 0 }
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/test/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'history') {
        setMessages(data.messages);
        setIsRunning(data.isRunning);
        if (data.metrics) setMetrics(data.metrics);
      } else if (data.type === 'new_messages') {
        setMessages((prev) => [...prev, ...data.messages]);
        setIsRunning(data.isRunning);
        if (data.metrics) setMetrics(data.metrics);
      } else if (data.type === 'ping') {
        setIsRunning(data.isRunning);
        if (data.metrics) setMetrics(data.metrics);
      }
    };

    eventSource.onerror = (e) => {
      console.error("SSE Error:", e);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = async () => {
    try {
      const res = await fetch("/api/test/start", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        alert("Ошибка запуска: " + data.msg);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const vanillaMessages = messages.filter(m => m.agent === 'vanilla' || m.agent === 'user' || (m.agent === 'system' && m.content.includes('[Vanilla')));
  const combineMessages = messages.filter(m => m.agent === 'combine' || m.agent === 'user' || (m.agent === 'system' && m.content.includes('[Combine')));
  const generalSystemMessages = messages.filter(m => m.agent === 'system' && !m.content.includes('[Vanilla') && !m.content.includes('[Combine'));

  return (
    <div className="flex flex-col h-[85vh] min-h-[600px] bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white font-mono tracking-wider truncate">A/B Testing Arena: Web Agent OS</h2>
          {isRunning && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase px-2 py-0.5 rounded font-mono border border-emerald-500/50 animate-pulse hidden md:inline-block">Running</span>}
        </div>
        <button 
          onClick={handleStart}
          disabled={isRunning}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg font-bold font-mono text-xs uppercase flex items-center gap-2 transition shrink-0"
        >
          {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span className="hidden md:inline">Run Test Scenario</span>
        </button>
      </div>

      {/* Main Container Two Panels */}
      <div className="flex-1 flex flex-col md:flex-row gap-px bg-slate-800 overflow-hidden min-h-0">
        
        {/* Mobile Tabs */}
        <div className="md:hidden flex bg-slate-950 p-1 shrink-0 border-b border-slate-800">
          <button onClick={() => setMobileTab('vanilla')} className={`flex-1 py-2 text-xs font-bold font-mono tracking-wider rounded-md transition ${mobileTab === 'vanilla' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-400'}`}>VANILLA</button>
          <button onClick={() => setMobileTab('combine')} className={`flex-1 py-2 text-xs font-bold font-mono tracking-wider rounded-md transition ${mobileTab === 'combine' ? 'bg-purple-900/50 text-purple-200' : 'text-slate-500 hover:text-slate-400'}`}>COMBINE</button>
        </div>

        {/* Vanilla Agent Panel */}
        <div className={`flex-1 bg-slate-900 flex-col min-h-0 relative ${mobileTab === 'vanilla' ? 'flex' : 'hidden md:flex'}`}>
          <div className="bg-slate-800/80 p-2 text-center border-b border-slate-700 flex flex-col gap-1">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex justify-center items-center gap-2">
              <Brain className="w-4 h-4 text-slate-400" /> Vanilla Agent
            </h3>
            <div className="flex justify-center gap-3 mt-1 text-[9px] font-mono text-slate-400 bg-slate-950/50 p-1 rounded-md max-w-fit mx-auto border border-slate-700/50">
              <span className="flex items-center gap-1" title="Tokens Spent"><Database className="w-3 h-3 text-emerald-400" /> {metrics.vanilla.tokensUsed}T</span>
              <span className="flex items-center gap-1" title="API Requests"><Zap className="w-3 h-3 text-amber-400" /> {metrics.vanilla.apiRequests} reqs</span>
              <span className="flex items-center gap-1" title="Execution Steps"><Activity className="w-3 h-3 text-blue-400" /> {metrics.vanilla.steps} steps</span>
              <span className="flex items-center gap-1" title="Stops/Halts"><AlertTriangle className="w-3 h-3 text-red-500" /> {metrics.vanilla.halts} halts</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin pb-10">
            {vanillaMessages.map(msg => (
               <MessageCell key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Combine Agent Panel */}
        <div className={`flex-1 bg-slate-900 flex-col min-h-0 relative ${mobileTab === 'combine' ? 'flex' : 'hidden md:flex'}`}>
           <div className="bg-purple-900/30 p-2 text-center border-b border-purple-900/50 flex flex-col gap-1">
             <h3 className="text-xs font-bold text-purple-300 uppercase tracking-widest font-mono flex justify-center items-center gap-2">
               <Sparkles className="w-4 h-4 text-purple-400" /> Sema Soul Combine
             </h3>
             <div className="flex justify-center gap-3 mt-1 text-[9px] font-mono text-purple-200/70 bg-purple-950/50 p-1 rounded-md max-w-fit mx-auto border border-purple-500/20">
              <span className="flex items-center gap-1" title="Tokens Spent"><Database className="w-3 h-3 text-emerald-400" /> {metrics.combine.tokensUsed}T</span>
              <span className="flex items-center gap-1" title="API Requests"><Zap className="w-3 h-3 text-amber-400" /> {metrics.combine.apiRequests} reqs</span>
              <span className="flex items-center gap-1" title="Execution Steps"><Activity className="w-3 h-3 text-blue-400" /> {metrics.combine.steps} steps</span>
              <span className="flex items-center gap-1" title="Stops/Halts"><AlertTriangle className="w-3 h-3 text-red-500" /> {metrics.combine.halts} halts</span>
            </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin pb-10 relative">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-slate-900/0 to-slate-900/0 pointer-events-none" />
             {combineMessages.map(msg => (
                <MessageCell key={msg.id} msg={msg} />
             ))}
             <div ref={bottomRef} />
           </div>
        </div>
      </div>

      {/* Footer / General System Log */}
      {generalSystemMessages.length > 0 && (
        <div className="min-h-24 max-h-32 bg-slate-950 border-t border-slate-800 p-2 overflow-y-auto font-mono text-xs text-slate-400 space-y-1 scrollbar-thin">
          {generalSystemMessages.map(msg => (
             <div key={msg.id} className="flex gap-2">
               <span className="text-pink-500">System:</span>
               <span className={msg.content.includes("ERROR") ? "text-red-400" : ""}>{msg.content}</span>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageCell({ msg }: { msg: TestMessage }) {
  if (msg.agent === 'user') {
    return (
      <div className="bg-blue-900/30 border border-blue-500/30 p-3 rounded-xl ml-8">
        <div className="text-[10px] font-bold text-blue-400 font-mono mb-1 uppercase">User Input</div>
        <div className="text-sm text-slate-200">{msg.content}</div>
      </div>
    );
  }

  if (msg.agent === 'system') {
    return (
      <div className="bg-slate-800 border border-slate-700 p-2 text-center rounded-lg text-xs font-mono text-slate-400">
        <Terminal className="w-3 h-3 inline mr-1" /> {msg.content}
      </div>
    );
  }

  // Agent response
  const isCombine = msg.agent === 'combine';
  return (
    <div className={`mr-8 p-4 rounded-xl border ${isCombine ? 'bg-purple-950/20 border-purple-500/30' : 'bg-slate-800/50 border-slate-600/50'}`}>
      <div className="flex justify-between items-center mb-2">
        <div className={`text-[10px] font-bold font-mono uppercase ${isCombine ? 'text-purple-400' : 'text-slate-400'}`}>
          {isCombine ? 'Combine Agent' : 'Vanilla Agent'}
        </div>
        {msg.metadata && (
           <div className="bg-purple-900/50 text-purple-200 text-[9px] px-1.5 py-0.5 rounded">
             Nodes: {msg.metadata.activeNodes}/{msg.metadata.totalNodes}
           </div>
        )}
      </div>
      <div className="prose prose-invert prose-sm max-w-none text-slate-300 break-words leading-relaxed">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
    </div>
  );
}
