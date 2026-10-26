export interface GlobalCategoryDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const GLOBAL_CATEGORIES: GlobalCategoryDefinition[] = [
  {
    id: "ngo-coordination",
    title: "NGO & Project Coordination",
    description: "Coordinators & organizers space for partner search, project co-creation, and European best practices.",
    icon: "Building2",
  },
  {
    id: "travel-companions",
    title: "Find Travel Companions",
    description: "Connect with fellow participants, coordinate train/flight routes, and plan your journey together.",
    icon: "Compass",
  },
  {
    id: "erasmus-advice",
    title: "Erasmus+ Advice & Prep",
    description: "Tips on packing, Infopacks, Youthpass, ESC insurance, travel reimbursements, and cultural prep.",
    icon: "Lightbulb",
  },
  {
    id: "project-opportunities",
    title: "Project Opportunities",
    description: "Discover upcoming youth exchanges, training courses, and European Solidarity Corps volunteer vacancies.",
    icon: "Sparkles",
  },
  {
    id: "general-chat",
    title: "Cosmic Lounge",
    description: "Open discussion, cultural exchanges, post-mobility memories, and informal networking across Europe.",
    icon: "MessageSquare",
  },
  {
    id: "workshops",
    title: "Workshops & Energizers",
    description: "Share team-building activities, icebreakers, and energizers for Erasmus+ projects.",
    icon: "Zap",
  },
];
