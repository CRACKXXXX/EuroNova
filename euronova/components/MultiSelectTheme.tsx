"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { ERASMUS_THEMES } from '@/lib/constants/themes';

interface MultiSelectThemeProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectTheme({ selected, onChange, placeholder = "Select themes..." }: MultiSelectThemeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = (theme: string) => {
    if (selected.includes(theme)) {
      onChange(selected.filter(t => t !== theme));
    } else {
      onChange([...selected, theme]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all cursor-pointer flex justify-between items-center"
      >
        <span className="truncate pr-4 text-gray-300">
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-void-surface border border-void-border rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
          {ERASMUS_THEMES.map(theme => (
            <label 
              key={theme} 
              onClick={(e) => {
                e.preventDefault();
                toggleTheme(theme);
              }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-void-deep cursor-pointer group transition-colors"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                ${selected.includes(theme) 
                  ? 'bg-plasma-cyan border-plasma-cyan text-void-deep' 
                  : 'border-gray-500 group-hover:border-plasma-cyan'
                }`}
              >
                {selected.includes(theme) && <Check className="w-3 h-3" />}
              </div>
              <span className="text-white text-sm">{theme}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
