"use client";

import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export interface CosmicTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  delayDuration?: number;
  className?: string;
  asChild?: boolean;
  disabled?: boolean;
  arrow?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * CosmicTooltip Component
 * 
 * Viewport-aware, collision-detecting tooltip built on top of Radix UI Tooltip Primitive.
 * Injected into document.body via Portal to prevent any header or container clipping.
 */
export function CosmicTooltip({
  content,
  children,
  side = "bottom",
  align = "center",
  sideOffset = 6,
  delayDuration = 150,
  className = "",
  asChild = true,
  disabled = false,
  arrow = true,
  open,
  defaultOpen,
  onOpenChange,
}: CosmicTooltipProps) {
  // If content is null/empty or tooltip is explicitly disabled, render children directly with zero overhead
  if (!content || disabled) {
    return <>{children}</>;
  }

  const isSingleElement = React.isValidElement(children);
  const triggerAsChild = asChild && isSingleElement;

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={300}>
      <TooltipPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
      >
        <TooltipPrimitive.Trigger asChild={triggerAsChild}>
          {triggerAsChild ? (
            children
          ) : (
            <span className="inline-flex items-center cursor-default">
              {children}
            </span>
          )}
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            collisionPadding={8}
            avoidCollisions={true}
            className={`z-[99999] max-w-xs px-2.5 py-1.5 rounded-xl bg-void-deep/95 border border-plasma-cyan/30 text-xs font-medium text-gray-200 backdrop-blur-md shadow-[0_0_15px_rgba(0,229,255,0.15)] transition-all duration-150 select-none pointer-events-none will-change-[transform,opacity] data-[state=delayed-open]:opacity-100 data-[state=delayed-open]:scale-100 data-[state=instant-open]:opacity-100 data-[state=instant-open]:scale-100 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 ${className}`}
          >
            {content}
            {arrow && (
              <TooltipPrimitive.Arrow
                width={8}
                height={4}
                className="fill-void-deep/95 stroke-plasma-cyan/30 stroke-1"
              />
            )}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// Re-export underlying Radix Tooltip primitives for rich custom tooltip builders
export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipPortal = TooltipPrimitive.Portal;
export const TooltipContent = TooltipPrimitive.Content;
export const TooltipArrow = TooltipPrimitive.Arrow;

export default CosmicTooltip;
