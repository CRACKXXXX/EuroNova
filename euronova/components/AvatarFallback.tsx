"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { User, Building } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export interface AvatarFallbackProps {
  src?: string | null;
  userId?: string | null;
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
  userId,
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
  const [fetchedSrc, setFetchedSrc] = useState<string | null>(null);

  if (prevSrc !== normalizedSrc) {
    setPrevSrc(normalizedSrc);
    setHasError(false);
  }

  // Fetch avatar URL from Supabase if not provided directly via props but userId is present
  useEffect(() => {
    if (normalizedSrc || !userId) return;
    let isMounted = true;

    async function fetchUserAvatar() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("users_youth")
          .select("avatar_url")
          .eq("id", userId)
          .maybeSingle();

        if (isMounted && data?.avatar_url && typeof data.avatar_url === "string") {
          setFetchedSrc(data.avatar_url.trim());
        }
      } catch {
        // Supabase unavailable or offline
      }
    }

    void fetchUserAvatar();

    return () => {
      isMounted = false;
    };
  }, [normalizedSrc, userId]);

  const activeSrc = normalizedSrc || fetchedSrc;

  // Calculate clean 2-letter uppercase initials if name is provided
  let initials = "";
  if (name && typeof name === "string") {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      initials = words[0].slice(0, 2).toUpperCase();
    } else if (words.length > 1) {
      initials = (words[0][0] + words[1][0]).toUpperCase();
    }
  }

  if (!activeSrc || hasError) {
    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br from-void-surface to-plasma-cyan/20 border border-plasma-cyan/30 text-plasma-cyan shadow-sm select-none ${sizeClassName} ${className}`}
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
        src={activeSrc}
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

export const Avatar = AvatarFallback;
export default AvatarFallback;
