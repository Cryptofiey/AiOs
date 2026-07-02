import { ReactNode } from 'react';

export type SystemState = 'idle' | 'thinking' | 'executing' | 'success' | 'error' | 'system';

export const ThemeColors = {
  system: {
    border: 'border-slate-700',
    bg: 'bg-slate-900',
    text: 'text-slate-300',
    shadow: 'shadow-none',
    icon: 'text-slate-400'
  },
  idle: {
    border: 'border-slate-600',
    bg: 'bg-slate-800',
    text: 'text-slate-200',
    shadow: 'shadow-none',
    icon: 'text-slate-400'
  },
  thinking: { // AI Processing / Neural Activity
    border: 'border-fuchsia-500',
    bg: 'bg-fuchsia-950/20',
    text: 'text-fuchsia-200',
    shadow: 'shadow-[0_0_20px_-5px_rgba(217,70,239,0.5)]',
    icon: 'text-fuchsia-400'
  },
  executing: { // Tool calling / System actions
    border: 'border-blue-500',
    bg: 'bg-blue-950/20',
    text: 'text-blue-200',
    shadow: 'shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]',
    icon: 'text-blue-400'
  },
  success: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-200',
    shadow: 'shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]',
    icon: 'text-emerald-400'
  },
  error: {
    border: 'border-rose-500',
    bg: 'bg-rose-950/20',
    text: 'text-rose-200',
    shadow: 'shadow-[0_0_20px_-5px_rgba(244,63,94,0.5)]',
    icon: 'text-rose-400'
  }
};

export const getThemeClasses = (state: SystemState, animate: boolean = false) => {
  const theme = ThemeColors[state];
  let classes = `${theme.border} ${theme.bg} ${theme.text} ${theme.shadow}`;
  if (animate && state === 'thinking') {
    classes += ' animate-pulse';
  }
  return classes;
};
