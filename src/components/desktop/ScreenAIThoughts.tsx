import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OSWindow } from '../../lib/ui-framework/OSWindow';
import { BrainCircuit } from 'lucide-react';

export const ScreenAIThoughts: React.FC = () => {
  const [thoughts, setThoughts] = useState<{id: number, text: string, x: number, y: number, state: 'thinking'|'success'|'executing'}[]>([]);

  // Simulation of thoughts popping in and out like Image 2
  useEffect(() => {
    let idCounter = 0;
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        const states: ('thinking'|'success'|'executing')[] = ['thinking', 'executing', 'success'];
        const newThought = {
          id: ++idCounter,
          text: `Анализ потока [${Math.floor(Math.random() * 9999)}]...`,
          x: 10 + Math.random() * 70, // percent
          y: 10 + Math.random() * 70, // percent
          state: states[Math.floor(Math.random() * states.length)]
        };
        setThoughts(prev => [...prev.slice(-8), newThought]); // Keep max 8
      }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <OSWindow title="Semantic Subconscious / AI Core" state="thinking" className="h-full" icon={<BrainCircuit />}>
      <div className="relative w-full h-full bg-slate-950/80 rounded overflow-hidden border border-fuchsia-900/30 inset-shadow-sm">
         {/* Grid Background */}
         <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(217, 70, 239, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(217, 70, 239, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
         
         <AnimatePresence>
           {thoughts.map(thought => (
             <motion.div
               key={thought.id}
               initial={{ opacity: 0, scale: 0.5 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 1.2 }}
               transition={{ duration: 1 }}
               style={{ left: `${thought.x}%`, top: `${thought.y}%` }}
               className={`absolute p-2 rounded-full border shadow-sm flex items-center justify-center min-w-[100px] min-h-[50px] text-center backdrop-blur-md
                 ${thought.state === 'thinking' ? 'border-fuchsia-500/50 bg-fuchsia-900/40 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 
                   thought.state === 'executing' ? 'border-blue-500/50 bg-blue-900/40 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 
                   'border-emerald-500/50 bg-emerald-900/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                 }
               `}
             >
               <span className="text-[10px] font-mono">{thought.text}</span>
             </motion.div>
           ))}
         </AnimatePresence>
      </div>
    </OSWindow>
  );
};
