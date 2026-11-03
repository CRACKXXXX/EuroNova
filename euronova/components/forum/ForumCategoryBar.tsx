"use client";

import React from "react";
import { MessageSquare } from "lucide-react";
import { type GlobalCategoryItem, CATEGORY_ICON_MAP } from "./ForumTypes";

interface ForumCategoryBarProps {
  categoriesList: GlobalCategoryItem[];
  selectedCategory: GlobalCategoryItem | null;
  onSelectCategory: (cat: GlobalCategoryItem) => void;
}

export function ForumCategoryBar({
  categoriesList,
  selectedCategory,
  onSelectCategory,
}: ForumCategoryBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {categoriesList.map((cat) => {
        const IconComp = CATEGORY_ICON_MAP[cat.icon] || MessageSquare;
        const isSelected = selectedCategory?.id === cat.id;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={`p-4 rounded-2xl border text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.98] ${
              isSelected
                ? "bg-void-surface border-plasma-cyan/60 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]"
                : "bg-void-surface/50 border-void-border/80 hover:border-plasma-cyan/30 hover:bg-void-surface/80 hover:shadow-[0_4px_15px_rgba(0,0,0,0.4)]"
            }`}
          >
            {/* Ambient Sheen */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-plasma-cyan/5 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between gap-2 mb-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 ${
                  isSelected
                    ? "bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/40 shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                    : "bg-void-deep text-gray-400 border border-void-border group-hover:text-plasma-cyan group-hover:border-plasma-cyan/30"
                }`}
              >
                <IconComp className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-void-deep/80 text-gray-400 border border-void-border">
                {cat.thread_count || 0} topics
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight line-clamp-1 group-hover:text-plasma-cyan transition-colors">
                {cat.name}
              </h3>
              <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 leading-snug">
                {cat.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
