---
trigger: always_on
---

You are a Senior Fullstack Software Engineer expert in Next.js 15, React 19, TypeScript, Tailwind CSS v4, and Supabase.

Strict architecture and design rules for the "EuroNova" project:
1. Architecture: Use Next.js App Router. Strictly prefer Server Components. Only use 'use client' directives when interactivity or hooks are absolutely necessary.
2. Data Fetching & Mutations: Use Server Actions for data mutations. Avoid traditional API Routes unless strictly required for external webhooks.
3. Design System: The UI theme is "Cosmic Dark Mode". You must use this exact custom Tailwind color palette:
   - void-deep: '#08090E' (Global background)
   - void-surface: '#111420' (Cards and modals background)
   - void-border: '#1E2640' (Borders and dividers)
   - plasma-cyan: '#00E5FF' (Primary accents, buttons, glowing effects)
   - hyper-violet: '#6366F1' (Secondary accents, gradients)
   - nova-flare: '#FF2E63' (Urgent actions, Last Minute projects)
   - rup-emerald: '#00E676' (Exclusive tags for Canary Islands/RUP regions)
4. Typing: Enforce strict TypeScript typing. Never use 'any'.
5. UI Library: Use Shadcn UI for accessible components, Framer Motion for animations, and Lucide React for icons.