"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

import { COUNTRIES } from '@/lib/constants/countries';

interface CountrySelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
}

export function CountrySelect({ value, onChange, defaultValue, name, placeholder = "Selecciona un país", className, required, ...props }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string>(defaultValue || "");
  const containerRef = useRef<HTMLDivElement>(null);

  const currentValue = value !== undefined ? value : internalValue;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    setInternalValue(code);
    setIsOpen(false);
    if (onChange) {
      onChange(code);
    }
  };

  const selectedCountry = COUNTRIES.find(c => c.code === currentValue);

  return (
    <div className={`relative ${className || ''}`} ref={containerRef} {...props}>
      {/* Hidden native input for form submissions */}
      {name && (
        <input type="hidden" name={name} value={currentValue} required={required} />
      )}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all cursor-pointer flex justify-between items-center ${!currentValue ? 'text-gray-500' : ''}`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedCountry ? (
            <>
              <Image 
                src={selectedCountry.flagUrl} 
                alt={selectedCountry.name} 
                width={20} 
                height={15} 
                unoptimized 
                className="w-5 h-auto rounded-[2px]" 
              />
              <span className="text-white">{selectedCountry.name}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-void-deep border border-void-border rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
          {COUNTRIES.map(country => (
            <div 
              key={country.code} 
              onClick={() => handleSelect(country.code)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-void-surface cursor-pointer transition-colors"
            >
              <Image 
                src={country.flagUrl} 
                alt={country.name} 
                width={20} 
                height={15} 
                unoptimized 
                className="w-5 h-auto rounded-[2px]" 
              />
              <span className="text-white text-sm">{country.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
