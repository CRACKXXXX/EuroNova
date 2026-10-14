"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  name?: string;
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  icon?: ReactNode;
}

export function CustomSelect({
  name,
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  triggerClassName = "",
  icon,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for HTML form submissions if name is provided */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-void-surface border border-void-border hover:border-plasma-cyan focus:border-plasma-cyan rounded-lg px-4 py-2.5 flex justify-between items-center text-sm text-gray-200 transition-colors cursor-pointer focus:outline-none ${
          isOpen ? "border-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)]" : ""
        } ${triggerClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          {icon && <span className="shrink-0 text-gray-400">{icon}</span>}
          <span
            className={`truncate block text-left ${
              !selectedOption || selectedOption.value === ""
                ? "text-gray-400"
                : "text-white font-medium"
            }`}
          >
            {displayText}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-plasma-cyan" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 w-full mt-1.5 bg-void-surface border border-void-border rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        >
          {options.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 text-center">
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              const isDisabled = option.disabled;

              return (
                <button
                  key={option.value || "__empty__"}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) {
                      onChange(option.value);
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between cursor-pointer border-b border-void-border/30 last:border-none ${
                    isDisabled
                      ? "opacity-40 cursor-not-allowed text-gray-500"
                      : isSelected
                      ? "bg-plasma-cyan/15 text-plasma-cyan font-semibold"
                      : "text-gray-300 hover:bg-plasma-cyan/10 hover:text-plasma-cyan"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-plasma-cyan shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
