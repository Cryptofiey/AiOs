import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, Box, GitBranch, Database, LayoutTemplate, 
  Minus, Square, X, BrainCircuit, Activity, Network, Code, Layers, Zap
} from 'lucide-react';
import { SystemState, ThemeColors } from './Theme';

interface ShellMatrixProps {
  state?: SystemState;
}

export const ShellMatrix: React.FC<ShellMatrixProps> = ({ state = 'idle' }) => {
  const [activeLayer, setActiveLayer] = useState<'app' | 'pkg' | 'git' | 'npm' | 'bash'>('bash');
  const theme = ThemeColors[state];

  const layers = [
    { id: 'app', label: 'APP', desc: 'Высокий уровень (Готовое UI)' },
    { id: 'pkg', label: 'PKG', desc: 'Среда сборки (Связующий)' },
    { id: 'git', label: 'Git', desc: 'VFS / Версионирование' },
    { id: 'npm', label: 'NPM', desc: 'Низкий уровень (Бинарники)' },
    { id: 'bash', label: 'BASH SHELL', desc: 'Терминальный доступ' },
  ] as const;

  const smartButtons = [
    { icon: <Zap className="w-3.5 h-3.5" />, title: 'Авто-фикс' },
    { icon: <BrainCircuit className="w-3.5 h-3.5" />, title: 'Анализ контекста' },
    { icon: <Code className="w-3.5 h-3.5" />, title: 'Генерация кода' },
    { icon: <Layers className="w-3.5 h-3.5" />, title: 'Сборка пакета' },
  ];

  return (
    <div className="flex w-full h-full bg-[#0a0f16] border border-slate-800 rounded overflow-hidden font-sans text-slate-100 shadow-xl">
      
      {/* ЛЕВАЯ ПАНЕЛЬ: Зона SMART VIEW (Цветовые/Символьные индикаторы) */}
      <div className={`w-6 md:w-8 shrink-0 flex flex-col items-center py-2 gap-4 border-r ${theme.border} bg-black/40 backdrop-blur-md relative overflow-hidden transition-colors duration-500`}>
        {/* Анимация заливки/пульсации для Smart View */}
        {state === 'thinking' && (
          <motion.div 
            className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/20 to-transparent"
            animate={{ y: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}
        
        <div className="writing-vertical-lr rotate-180 text-[8px] md:text-[10px] font-bold text-slate-500 tracking-widest mt-2">
          AIOS SHELL MATRIX
        </div>
        
        <div className="mt-auto flex flex-col gap-3 pb-2 z-10">
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-700'}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'thinking' ? 'bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.8)] animate-pulse' : 'bg-slate-700'}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'executing' ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse' : 'bg-slate-700'}`} />
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: Основная панель */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* ВЕРХНИЙ БАР: Вкладки уровней сборки и кнопки управления */}
        <div className="flex justify-between items-end bg-black/60 border-b border-slate-800 pt-1 pr-1">
          
          <div className="flex gap-0.5 max-w-full overflow-x-auto no-scrollbar pl-1">
            {layers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(layer.id)}
                title={layer.desc}
                className={`px-2 md:px-3 py-1 text-[8px] md:text-[9px] font-bold tracking-wider uppercase rounded-t-sm border border-b-0 transition-colors whitespace-nowrap
                  ${activeLayer === layer.id 
                    ? `bg-[#0a0f16] ${theme.border} text-slate-200 z-10` 
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }
                  ${layer.id === 'bash' ? 'ml-1 md:ml-4 bg-blue-950/20' : ''}
                `}
                style={{ marginBottom: activeLayer === layer.id ? '-1px' : '0' }}
              >
                {layer.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap shrink-0 items-center gap-1 pb-1 mb-0.5 ml-2">
            <button className="w-4 h-4 flex items-center justify-center hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors group">
              <Minus className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </button>
            <button className="w-4 h-4 flex items-center justify-center hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors group">
              <Square className="w-2.5 h-2.5 group-hover:scale-110 transition-transform" />
            </button>
            <button className="w-4 h-4 flex items-center justify-center hover:bg-rose-500/80 rounded text-slate-500 hover:text-white transition-colors group">
              <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </button>
          </div>

        </div>

        {/* ПАНЕЛЬ ИНСТРУМЕНТОВ: Smart-кнопки */}
        <div className="p-1 flex gap-1 border-b border-slate-800 bg-slate-900/30">
          <div className="text-[8px] uppercase text-slate-500 flex items-center px-1 mr-1 font-bold">Smart Tools:</div>
          {smartButtons.map((btn, i) => (
            <button 
              key={i} 
              title={btn.title}
              className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-fuchsia-500/50 rounded transition-colors text-slate-400 hover:text-fuchsia-300 shadow-sm"
            >
              {btn.icon}
            </button>
          ))}
          <div className="flex-1"></div>
          <div className="text-[8px] uppercase text-slate-500/50 flex items-center px-1 font-bold">Generated via OS Core</div>
        </div>

        {/* ORIGINAL SHELL: Умная обводка и Контент */}
        <div className="flex-1 p-2 bg-[#050505] overflow-hidden flex flex-col">
          <div className={`flex-1 relative border rounded overflow-hidden transition-colors duration-300 ${theme.border} bg-black shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]`}>
            
            {/* Анимация умной обводки */}
            {state === 'thinking' && (
              <motion.div 
                className="absolute inset-x-0 h-1 bg-fuchsia-500/50 blur-[2px] pointer-events-none"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                style={{ zIndex: 10 }}
              />
            )}

            <div className="absolute inset-0 p-2 overflow-y-auto font-mono text-[10px] pb-24 overscroll-contain">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeLayer}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  {/* Контент в зависимости от слоя */}
                  {activeLayer === 'bash' && (
                    <div className="text-slate-300">
                      <div className="text-emerald-400 mb-1">agent@aios:~$ <span className="text-slate-300">npm link @web-os/core</span></div>
                      <div className="text-slate-500 mb-2">added 1 package, and audited 121 packages in 128ms</div>
                      <div className="text-emerald-400 mb-1">agent@aios:~$ <span className="text-slate-300">git branch -a</span></div>
                      <div className="text-purple-400 mb-2">
                        * dev<br/>
                        &nbsp;&nbsp;main<br/>
                        &nbsp;&nbsp;experimental-fs
                      </div>
                      <div className="text-emerald-400">agent@aios:~$ <span className="text-blue-400 animate-pulse">_</span></div>
                    </div>
                  )}

                  {activeLayer === 'npm' && (
                    <div className="text-slate-400">
                      <div className="text-cyan-400 font-bold mb-1">[ NPM REGISTRY PROXY ]</div>
                      <div className="mb-1 text-slate-500">Resolving dynamic imports via esm.sh...</div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                         <div className="border border-slate-800 p-2 rounded bg-slate-900/50">react@18.3.1 <span className="text-emerald-500 float-right">CACHED</span></div>
                         <div className="border border-slate-800 p-2 rounded bg-slate-900/50">motion@10.0.0 <span className="text-emerald-500 float-right">CACHED</span></div>
                         <div className="border border-cyan-900/50 p-2 rounded bg-cyan-950/20 text-cyan-300">zustand@4.5.2 <span className="text-cyan-400 float-right animate-pulse">FETCHING...</span></div>
                      </div>
                    </div>
                  )}

                  {activeLayer === 'git' && (
                     <div className="text-slate-400">
                       <div className="text-emerald-400 font-bold mb-1">[ ISOMORPHIC-GIT VFS ]</div>
                       <div className="flex items-center gap-1 text-slate-500 mb-2"><GitBranch className="w-3 h-3"/> Current HEAD: c9f8a2b1 (dev)</div>
                       <div className="border-l border-slate-800 pl-2 ml-1 text-[9px] space-y-1">
                         <div className="text-amber-400">c9f8a2b1 0 seconds ago - Auto-sync update</div>
                         <div className="text-slate-500">f1a83b2a 2 minutes ago - Added ViewportManager</div>
                         <div className="text-slate-500">e82cad31 10 minutes ago - Initial commit</div>
                       </div>
                     </div>
                  )}

                  {activeLayer === 'pkg' && (
                     <div className="text-slate-400 flex flex-col items-center justify-center h-full">
                       <Box className="w-8 h-8 text-slate-600 mb-2" />
                       <div className="text-slate-500 font-sans font-bold">ОБЕРТКА УРОВНЯ СБОРКИ</div>
                       <div className="text-center mt-2 text-slate-600 max-w-[200px]">Здесь агенты компилируют отдельные пакеты перед внедрением их в APP.</div>
                     </div>
                  )}

                  {activeLayer === 'app' && (
                     <div className="text-slate-400 flex flex-col items-center justify-center h-full">
                       <LayoutTemplate className="w-8 h-8 text-fuchsia-600 mb-2" />
                       <div className="text-fuchsia-500/80 font-sans font-bold">ФИНАЛЬНЫЙ РЕНДЕР ПРИЛОЖЕНИЯ</div>
                       <div className="text-center mt-2 text-slate-600 max-w-[200px]">Готовый UI для клиента собирается на этом слое из нижележащих компонентов.</div>
                     </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
