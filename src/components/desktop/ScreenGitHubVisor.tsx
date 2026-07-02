import React, { useState, useEffect } from 'react';

export const ScreenGitHubVisor: React.FC = () => {
  const [visorData, setVisorData] = useState<{ status: any, log: string[], files: string[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchVisorData = async () => {
    try {
      const res = await fetch('/api/github/visor');
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setVisorData(json.data);
      } else {
        setError(json.error || 'Unknown error fetching visor data');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  };

  useEffect(() => {
    fetchVisorData();
    const interval = setInterval(fetchVisorData, 15000); // Auto-update every 15 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 w-full h-full bg-[#0d0d0f] text-gray-300 font-mono text-sm overflow-hidden flex flex-col uppercase tracking-widest relative">
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#a78bfa] to-transparent opacity-50 z-10" />
      
      <div className="h-10 border-b border-[#a78bfa]/20 bg-[#15151a] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[#a78bfa] flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
             GITHUB FS VISOR
          </span>
          <span className="text-[10px] text-gray-600 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
            AUTO-SYNC ONLINE
          </span>
        </div>
        <div className="text-[10px] text-emerald-400 font-bold">
          LAST UPDATE: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent pb-32 overscroll-contain">
        
        {loading && !visorData && (
          <div className="text-gray-500 animate-pulse">Initializing visor uplinks...</div>
        )}
        
        {error && (
          <div className="text-red-500 border border-red-500/30 bg-red-500/10 p-4 rounded-md">
            ERR: {error}
          </div>
        )}

        {visorData && (
          <>
            <section>
              <h2 className="text-[#a78bfa]/80 border-b border-[#a78bfa]/20 pb-2 mb-3 text-xs flex justify-between">
                <span>[01] LOCAL STATUS MATRIX</span>
                <span className="text-gray-600">git status</span>
              </h2>
              <div className="bg-[#050505] p-4 rounded border border-gray-800/50">
                {Array.isArray(visorData.status) ? (
                  visorData.status.map((line, i) => (
                    <div key={i} className={line.startsWith(' M') ? 'text-blue-400' : line.startsWith('??') ? 'text-emerald-400' : 'text-gray-400'}>
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-emerald-500/70">{visorData.status}</div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-[#a78bfa]/80 border-b border-[#a78bfa]/20 pb-2 mb-3 text-xs flex justify-between">
                <span>[02] RECENT COMMIT TIMELINE</span>
                <span className="text-gray-600">git log</span>
              </h2>
              <div className="bg-[#050505] p-4 rounded border border-gray-800/50 space-y-2">
                {visorData.log.length > 0 ? (
                  visorData.log.map((line, i) => {
                    const [hash, ...rest] = line.split('-');
                    return (
                      <div key={i} className="flex flex-col sm:flex-row sm:gap-4 border-l-2 border-gray-800 pl-3">
                        <span className="text-orange-400 shrink-0">{hash}</span>
                        <span className="text-gray-400">{rest.join('-')}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-gray-600">No commits found.</div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-[#a78bfa]/80 border-b border-[#a78bfa]/20 pb-2 mb-3 text-xs flex justify-between">
                <span>[03] VIRTUAL FILE TREE (HEAD)</span>
                <span className="text-gray-600">git ls-tree</span>
              </h2>
              <div className="bg-[#050505] p-4 rounded border border-gray-800/50 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                {visorData.files.length > 0 ? (
                  visorData.files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-gray-600">├─</span>
                      <span className="text-cyan-400/80 hover:text-cyan-400 transition-colors cursor-default">{file}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-600">Empty tree or error.</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
