"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";

export interface TermTooltipProps {
  term: "OID" | "PIC" | "ESC" | "ORs" | "RUP" | "YE" | "TC" | "PBA" | "SV" | "SE" | "VET" | "CBY" | string;
  explanation?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

const DEFAULT_EXPLANATIONS: Record<string, string> = {
  TC: "Training Course: Professional development for youth workers, leaders, and educators in non-formal education.",
  YE: "Youth Exchange: Non-formal international mobility for groups of young people aged 13-30.",
  ESC: "European Solidarity Corps: Volunteering, projects, and solidarity actions across the EU.",
  OID: "Organisation ID: Unique 8-digit identifier required for Erasmus+ & ESC applications.",
  PIC: "PIC: 9-digit participant code for European Commission programs.",
  ORS: "Outermost Regions (RUP): Canary Islands, Azores, Madeira, etc. with 100% travel coverage.",
  RUP: "Outermost Regions (RUP): Canary Islands, Azores, Madeira, etc. with dedicated European grants.",
  PBA: "Partnership Building Activity: Networking meeting to create new Erasmus+ & ESC partnerships.",
  SV: "Study Visit: Educational exchange visits to European youth organizations.",
  SE: "Seminar: International meeting for focused policy reflection and peer learning.",
  VET: "Vocational Education & Training: Practical mobility for apprentices, trainees, and staff.",
  CBY: "Capacity Building in Youth: International projects boosting youth work infrastructure.",
};

/**
 * Safely renders inline markdown (**bold**, *italic*, `code`) into styled HTML elements.
 */
function renderFormattedContent(raw: string): React.ReactNode {
  if (!raw) return null;
  const tokens = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return (
        <em key={idx} className="italic text-plasma-cyan font-medium">
          {token.slice(1, -1)}
        </em>
      );
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code key={idx} className="px-1 py-0.5 rounded bg-void-deep text-plasma-cyan font-mono text-[10px]">
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}

export function TermTooltip({
  term,
  explanation,
  children,
  showIcon = false,
  className = "",
}: TermTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const normalizedKey = term.toUpperCase().trim();
  const rawText = explanation || DEFAULT_EXPLANATIONS[normalizedKey] || term;

  return (
    <span
      className={`relative inline-flex items-center group/tooltip overflow-visible cursor-help select-none ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }}
    >
      {children ? (
        <span className="inline-flex items-center gap-1 overflow-visible">
          {children}
          {showIcon && <Info className="w-3.5 h-3.5 text-plasma-cyan/80 shrink-0" />}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 border-b border-dotted border-plasma-cyan/60 hover:border-plasma-cyan text-inherit transition-colors">
          <span>{term}</span>
          <Info className="w-3 h-3 text-plasma-cyan/70 shrink-0" />
        </span>
      )}

      {/* Floating Tooltip Bubble */}
      <span
        role="tooltip"
        className={`absolute z-[99] bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-xl bg-void-surface/98 border border-plasma-cyan/40 backdrop-blur-md text-[11px] text-gray-300 shadow-[0_4px_25px_rgba(0,0,0,0.85)] transition-all duration-200 pointer-events-none whitespace-normal select-none leading-relaxed text-center ${
          isOpen
            ? "opacity-100 visible scale-100"
            : "opacity-0 invisible scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-hover/tooltip:scale-100"
        }`}
      >
        <span className="font-bold text-plasma-cyan block text-[10px] uppercase tracking-wider mb-1">
          {term.toUpperCase()}
        </span>
        <span className="block text-gray-300">
          {renderFormattedContent(rawText)}
        </span>

        {/* Tiny clean arrow pointing down to badge */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-void-surface" />
      </span>
    </span>
  );
}
