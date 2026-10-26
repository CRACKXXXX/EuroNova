import React from "react";
import { 
  Building2, 
  Compass, 
  Lightbulb, 
  Sparkles, 
  MessageSquare, 
  Zap,
} from "lucide-react";
import { 
  type GlobalCategoryItem, 
  type GlobalThreadItem, 
  type GlobalPostItem, 
  type UserEligibilityResponse,
  type ThreadsPaginationMetadata,
} from "@/actions/globalForum";

export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Compass,
  Lightbulb,
  Sparkles,
  MessageSquare,
  Zap,
};

import { type useTranslations, type useFormatter } from "next-intl";

export type ForumTranslator = ReturnType<typeof useTranslations>;
export type ForumFormatter = ReturnType<typeof useFormatter>;

export type {
  GlobalCategoryItem,
  GlobalThreadItem,
  GlobalPostItem,
  UserEligibilityResponse,
  ThreadsPaginationMetadata,
};
