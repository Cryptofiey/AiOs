import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

export interface FilterOption {
  id: string;
  name: string;
  icon?: string;
  subtitle?: string;
  badge?: string;
  isOffline?: boolean;
}

interface FilterModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  options: FilterOption[];
  selectedIds: string[];
  onApply: (selected: string[]) => void;
}

export function FilterModal({ title, isOpen, onClose, options, selectedIds, onApply }: FilterModalProps) {
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedIds));

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  if (!isOpen) return null;

  const toggleOption = (id: string) => {
    const newSelected = new Set(localSelected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setLocalSelected(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set(localSelected);
    filteredOptions.forEach(o => newSelected.add(o.id));
    setLocalSelected(newSelected);
  };

  const clearAll = () => {
    setLocalSelected(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-[#333] rounded-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#222]">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-[#1a1a1a] p-1.5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#222]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Enter a keyword to search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] text-sm text-slate-200 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Select All */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-[#222] bg-[#0a0a0a]">
          <span className="text-xs text-slate-400">Selected: {localSelected.size}</span>
          <button onClick={selectAll} className="text-xs text-blue-400 font-bold hover:text-blue-300">
            Select All
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredOptions.length === 0 ? (
            <div className="text-center text-slate-500 py-8 text-sm">No items found</div>
          ) : (
            filteredOptions.map(option => (
              <div 
                key={option.id} 
                onClick={() => toggleOption(option.id)}
                className="flex items-center justify-between p-2 hover:bg-[#1a1a1a] rounded-lg cursor-pointer transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#222] rounded-lg flex items-center justify-center text-lg overflow-hidden shrink-0 border border-[#333]">
                    {option.icon ? (
                      option.icon.startsWith('http') ? <img src={option.icon} alt={option.name} className="w-full h-full object-cover" /> : <span>{option.icon}</span>
                    ) : (
                      <span>💎</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{option.name}</span>
                      {option.badge && (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {option.subtitle && (
                      <span className="text-xs text-slate-500">{option.subtitle}</span>
                    )}
                    {option.isOffline && (
                      <span className="text-[10px] text-red-400 font-bold mt-0.5">⚠️ Offline</span>
                    )}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${localSelected.has(option.id) ? 'bg-blue-500 border-blue-500' : 'border-[#444] group-hover:border-[#666]'}`}>
                  {localSelected.has(option.id) && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#222] bg-[#0a0a0a] flex space-x-3">
          <button onClick={clearAll} className="flex-1 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-slate-300 rounded-lg text-sm font-bold transition-colors">
            Clear All
          </button>
          <button 
            onClick={() => {
              onApply(Array.from(localSelected));
              onClose();
            }} 
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
