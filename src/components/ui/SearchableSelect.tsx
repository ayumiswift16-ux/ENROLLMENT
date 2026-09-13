import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/utils/cn';

interface SearchableSelectProps {
  label?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
  icon
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-1.5 text-left relative", className)} ref={containerRef}>
      {label && <label className="text-xs font-bold text-slate-700 ml-1">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
            {icon}
          </div>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
            icon && "pl-11",
            !value && "text-slate-400"
          )}
        >
          <span className="truncate font-medium">{value || placeholder}</span>
          <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden min-w-[200px]">
              <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
                <input
                  autoFocus
                  type="text"
                  className="w-full bg-transparent border-none focus:ring-0 text-sm py-1 placeholder:text-slate-400 font-medium"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-slate-100 rounded-full">
                    <X className="h-3 w-3 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="max-h-[250px] overflow-y-auto p-1 custom-scrollbar">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-blue-50 hover:text-blue-600",
                        value === option && "bg-blue-50 text-blue-600"
                      )}
                      onClick={() => {
                        onChange(option);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      {option}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                    No results found
                  </div>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
