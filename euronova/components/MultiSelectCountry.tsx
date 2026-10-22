"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Check, ChevronDown } from 'lucide-react';

import { COUNTRIES } from '@/lib/constants/countries';

interface MultiSelectCountryProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectCountry({ selected, onChange, placeholder = "Select countries..." }: MultiSelectCountryProps) {
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

  const toggleCountry = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter(c => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          } else if (e.key === "Escape" && isOpen) {
            e.preventDefault();
            setIsOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={placeholder}
        className="w-full min-h-[44px] bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm text-white focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none focus:border-plasma-cyan transition-all cursor-pointer flex justify-between items-center text-left"
      >
        <span className="truncate pr-4 text-gray-300 flex items-center gap-2">
          {selected.length === 0 
            ? placeholder 
            : (
              <>
                <span className="flex items-center gap-1">
                  {selected.slice(0, 3).map(code => {
                    const c = COUNTRIES.find(x => x.code === code);
                    if (!c) return null;
                    return (
                      <Image 
                        key={code} 
                        src={c.flagUrl} 
                        alt={c.name} 
                        width={20} 
                        height={15} 
                        unoptimized 
                        style={{ width: "auto", height: "auto" }}
                        className="w-5 h-auto rounded-[2px]" 
                        title={c.name} 
                      />
                    );
                  })}
                </span>
                <span>{selected.length > 3 ? `+${selected.length - 3} selected` : `(${selected.length})`}</span>
              </>
            )
          }
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div 
          role="listbox"
          aria-multiselectable="true"
          aria-label={placeholder}
          className="absolute z-50 w-full mt-2 bg-void-deep border border-void-border rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
        >
          {COUNTRIES.map(country => (
            <div 
              key={country.code} 
              role="option"
              aria-selected={selected.includes(country.code)}
              tabIndex={0}
              onClick={() => toggleCountry(country.code)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCountry(country.code);
                }
              }}
              className="flex items-center gap-3 px-4 py-2.5 min-h-[44px] hover:bg-void-surface focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none cursor-pointer group transition-colors"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0
                ${selected.includes(country.code) 
                  ? 'bg-plasma-cyan border-plasma-cyan text-void-deep' 
                  : 'border-gray-500 group-hover:border-plasma-cyan'
                }`}
              >
                {selected.includes(country.code) && <Check className="w-3 h-3" />}
              </div>
              <Image 
                src={country.flagUrl} 
                alt={country.name} 
                width={20} 
                height={15} 
                unoptimized 
                style={{ width: "auto", height: "auto" }}
                className="w-5 h-auto rounded-[2px] shrink-0" 
              />
              <span className="text-white text-sm">{country.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
