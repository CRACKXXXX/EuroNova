"use client";

import React, { useState } from "react";
import Image from "next/image";
import { User, Building } from "lucide-react";

export interface AvatarFallbackProps {
  src?: string | null;
  alt?: string;
  fallbackType?: "user" | "org";
  name?: string | null;
  sizeClassName?: string;
  className?: string;
  iconClassName?: string;
  unoptimized?: boolean;
  priority?: boolean;
}

export function AvatarFallback({
  src,
  alt = "Avatar",
  fallbackType = "user",
  name,
  sizeClassName = "w-8 h-8",
  className = "",
  iconClassName,
  unoptimized = true,
  priority = false,
}: AvatarFallbackProps) {
  const normalizedSrc =
    typeof src === "string" && src.trim().length > 0 && src !== "null" && src !== "undefined"
      ? src.trim()
      : null;

  const [hasError, setHasError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(normalizedSrc);

  if (prevSrc !== normalizedSrc) {
    setPrevSrc(normalizedSrc);
    setHasError(false);
  }

  // Calculate clean initials if name is provided
  let initials = "";
  if (name && typeof name === "string") {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      initials = words[0].slice(0, 2).toUpperCase();
    } else if (words.length > 1) {
      initials = (words[0][0] + words[1][0]).toUpperCase();
    }
  }

  if (!normalizedSrc || hasError) {
    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br from-void-surface to-plasma-cyan/20 border border-plasma-cyan/30 text-plasma-cyan shadow-sm select-none ${sizeClassName} ${className}`}
        title={name || alt}
        aria-label={alt}
      >
        {initials ? (
          <span className="font-bold text-[11px] uppercase tracking-wider text-plasma-cyan">
            {initials}
          </span>
        ) : fallbackType === "org" ? (
          <Building className={iconClassName || "w-4 h-4 text-plasma-cyan shrink-0"} />
        ) : (
          <User className={iconClassName || "w-4 h-4 text-plasma-cyan shrink-0"} />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 border border-void-border/70 bg-void-deep shadow-sm ${sizeClassName} ${className}`}
    >
      <Image
        src={normalizedSrc}
        alt={alt}
        fill
        sizes="96px"
        unoptimized={unoptimized}
        priority={priority}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );
}
