import React, { useState } from 'react';
import { SystemState, getThemeClasses, ThemeColors } from './Theme';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface OSWindowProps {
  title: string;
  state?: SystemState;
  children: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  animateBorder?: boolean;
}

export const OSWindow: React.FC<OSWindowProps> = ({ 
  title, 
  state = 'system', 
  children, 
  icon,
  actions,
  className = '',
  animateBorder = true
}) => {
  const themeClasses = getThemeClasses(state, animateBorder);
  const theme = ThemeColors[state];
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Динамическая реакция обертки на состояние
  const renderIndicator = () => {
    switch (state) {
      case 'thinking': return <div className="h-2 w-2 rounded-full bg-fuchsia-400 animate-ping" />;
      case 'executing': return <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />;
      case 'success': return <div className="h-2 w-2 rounded-full bg-emerald-400" />;
      case 'error': return <div className="h-2 w-2 rounded-full bg-rose-400" />;
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`border flex flex-col rounded-md transition-all duration-300 shrink-0 ${themeClasses} ${className} ${isCollapsed ? 'min-h-0' : ''}`}
    >
      {/* Container Header (Titlebar) */}
      <div 
        className={`px-2 py-1.5 border-b flex items-center justify-between ${theme.border} bg-black/40 backdrop-blur-sm shrink-0 cursor-pointer hover:bg-black/60`} 
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-1.5 pointer-events-none select-none">
          {icon ? <span className={theme.icon}>{icon}</span> : <Terminal className={`w-3.5 h-3.5 ${theme.icon}`} />}
          <span className="text-[10px] font-semibold tracking-wide uppercase">{title}</span>
          {renderIndicator()}
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {actions}
          <button 
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
            className={`p-1 rounded hover:bg-white/10 ${theme.icon} transition-colors`}
          >
            {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>
      
      {/* Container Content (Inner Box) */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden flex flex-col relative w-full"
            style={ !className.includes('flex-1') ? { flex: 1 } : {} }  // conditionally apply flex: 1 if the wrapper lacks it, or let the div size to content
          >
             <div className="flex-1 overflow-hidden relative p-1 flex flex-col">
              {children}
              
              {/* Animated scanning line effect for thinking/executing states */}
              {state === 'thinking' && (
                <motion.div 
                  className="absolute left-0 right-0 h-1 bg-fuchsia-500/30 blur-[2px] pointer-events-none"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
