"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const COUNTRIES = [
  // 27 Estados Miembros de la UE
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Bélgica', flag: '🇧🇪' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'HR', name: 'Croacia', flag: '🇭🇷' },
  { code: 'CY', name: 'Chipre', flag: '🇨🇾' },
  { code: 'CZ', name: 'Chequia', flag: '🇨🇿' },
  { code: 'DK', name: 'Dinamarca', flag: '🇩🇰' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'FI', name: 'Finlandia', flag: '🇫🇮' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'GR', name: 'Grecia', flag: '🇬🇷' },
  { code: 'HU', name: 'Hungría', flag: '🇭🇺' },
  { code: 'IE', name: 'Irlanda', flag: '🇮🇪' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'LV', name: 'Letonia', flag: '🇱🇻' },
  { code: 'LT', name: 'Lituania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxemburgo', flag: '🇱🇺' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'NL', name: 'Países Bajos', flag: '🇳🇱' },
  { code: 'PL', name: 'Polonia', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'RO', name: 'Rumanía', flag: '🇷🇴' },
  { code: 'SK', name: 'Eslovaquia', flag: '🇸🇰' },
  { code: 'SI', name: 'Eslovenia', flag: '🇸🇮' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'SE', name: 'Suecia', flag: '🇸🇪' },
  // Países Asociados a Erasmus+ / CES
  { code: 'MK', name: 'Macedonia del Norte', flag: '🇲🇰' },
  { code: 'IS', name: 'Islandia', flag: '🇮🇸' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'NO', name: 'Noruega', flag: '🇳🇴' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'TR', name: 'Turquía', flag: '🇹🇷' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
];

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
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all cursor-pointer flex justify-between items-center"
      >
        <span className="truncate pr-4 text-gray-300">
          {selected.length === 0 ? placeholder : `${selected.length} seleccionados`}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-void-deep border border-void-border rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
          {COUNTRIES.map(country => (
            <label 
              key={country.code} 
              onClick={(e) => {
                e.preventDefault();
                toggleCountry(country.code);
              }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-void-surface cursor-pointer group transition-colors"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                ${selected.includes(country.code) 
                  ? 'bg-plasma-cyan border-plasma-cyan text-void-deep' 
                  : 'border-gray-500 group-hover:border-plasma-cyan'
                }`}
              >
                {selected.includes(country.code) && <Check className="w-3 h-3" />}
              </div>
              <span className="text-white text-sm">{country.flag} {country.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
