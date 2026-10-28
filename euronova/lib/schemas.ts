import { z } from "zod";

/**
 * ============================================================================
 * EURONOVA CENTRALIZED ZOD VALIDATION SCHEMAS
 * ============================================================================
 * Strict double-layer validation schemas enforcing string bounds, valid UUIDs,
 * safe numerical ranges, null-byte rejection, and sanitization gates across Server Actions and APIs.
 */

// Helper to reject PostgreSQL-crashing null bytes (\u0000)
export const noNullBytes = (val: string | null | undefined): boolean =>
  !val || !val.includes("\u0000");

// 1. Common Utility Schemas
export const UuidSchema = z
  .string()
  .uuid("Invalid UUID identifier format.");

export const SafeTextSchema = (minLength = 1, maxLength = 5000) =>
  z
    .string()
    .trim()
    .min(minLength, `Content must be at least ${minLength} character(s).`)
    .max(maxLength, `Content cannot exceed ${maxLength} characters.`)
    .refine(noNullBytes, "Null bytes are strictly prohibited.");

// 2. Authentication & Signup Schema
export const AuthCredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address format.")
    .max(120, "Email address cannot exceed 120 characters.")
    .refine(noNullBytes, "Email cannot contain null bytes."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(100, "Password cannot exceed 100 characters.")
    .refine((val) => val.trim().length >= 6, "Password cannot consist solely of whitespace.")
    .refine(noNullBytes, "Password cannot contain null bytes."),
});

// 3. Support Ticket Submission Schema
export const TicketSubmissionSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address.")
    .max(120, "Email cannot exceed 120 characters.")
    .refine(noNullBytes, "Email cannot contain null bytes."),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number cannot exceed 30 characters.")
    .refine(noNullBytes, "Phone cannot contain null bytes.")
    .optional()
    .or(z.literal(""))
    .nullable(),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters.")
    .max(150, "Subject cannot exceed 150 characters.")
    .refine(noNullBytes, "Subject cannot contain null bytes."),
  reason: z
    .string()
    .trim()
    .min(2, "Reason must be at least 2 characters.")
    .max(50, "Reason cannot exceed 50 characters.")
    .refine(noNullBytes, "Reason cannot contain null bytes."),
  content: z
    .string()
    .trim()
    .min(10, "Message content must be at least 10 characters.")
    .max(5000, "Message content cannot exceed 5000 characters.")
    .refine(noNullBytes, "Message content cannot contain null bytes."),
});

export type TicketSubmissionInput = z.infer<typeof TicketSubmissionSchema>;

// 4. Project Forum Post & Reply Schema
export const ProjectForumPostSchema = z.object({
  projectId: UuidSchema,
  content: z
    .string()
    .trim()
    .min(1, "Message content cannot be empty.")
    .max(3000, "Message content cannot exceed 3000 characters.")
    .refine(noNullBytes, "Content cannot contain null bytes."),
  customAuthorName: z
    .string()
    .trim()
    .max(80, "Author name cannot exceed 80 characters.")
    .refine(noNullBytes, "Author name cannot contain null bytes.")
    .optional()
    .nullable(),
  parentId: UuidSchema.optional().nullable(),
});

export type ProjectForumPostInput = z.infer<typeof ProjectForumPostSchema>;

// 5. Global Community Forum Thread Schema
export const GlobalThreadSchema = z.object({
  categoryId: z
    .string()
    .trim()
    .min(1, "Category is required.")
    .max(80, "Category ID cannot exceed 80 characters.")
    .refine(noNullBytes, "Category ID cannot contain null bytes."),
  title: z
    .string()
    .trim()
    .min(5, "Thread title must be at least 5 characters.")
    .max(150, "Thread title cannot exceed 150 characters.")
    .refine(noNullBytes, "Title cannot contain null bytes."),
  content: z
    .string()
    .trim()
    .min(10, "Thread content must be at least 10 characters.")
    .max(8000, "Thread content cannot exceed 8000 characters.")
    .refine(noNullBytes, "Content cannot contain null bytes."),
});

export type GlobalThreadInput = z.infer<typeof GlobalThreadSchema>;

// 6. Global Community Forum Reply Schema
export const GlobalPostSchema = z.object({
  threadId: UuidSchema,
  content: z
    .string()
    .trim()
    .min(2, "Reply content must be at least 2 characters.")
    .max(5000, "Reply content cannot exceed 5000 characters.")
    .refine(noNullBytes, "Reply content cannot contain null bytes."),
});

export type GlobalPostInput = z.infer<typeof GlobalPostSchema>;

// 7. Moderation Report Submission Schema
export const ReportSubmissionSchema = z.object({
  targetType: z.enum(["user", "comment", "project", "organization", "survey"]),
  targetId: z
    .string()
    .trim()
    .min(1, "Target ID is required.")
    .max(100, "Target ID cannot exceed 100 characters.")
    .refine(noNullBytes, "Target ID cannot contain null bytes."),
  targetTitle: z
    .string()
    .trim()
    .min(1, "Target title is required.")
    .max(200, "Target title cannot exceed 200 characters.")
    .refine(noNullBytes, "Target title cannot contain null bytes."),
  reason: z
    .string()
    .trim()
    .min(2, "Reason must be at least 2 characters.")
    .max(100, "Reason cannot exceed 100 characters.")
    .refine(noNullBytes, "Reason cannot contain null bytes."),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters.")
    .refine(noNullBytes, "Description cannot contain null bytes.")
    .optional()
    .nullable(),
});

export type ReportSubmissionInput = z.infer<typeof ReportSubmissionSchema>;

// 8. Survey Creation Schema
export const SurveyCreationSchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, "Question must be at least 5 characters.")
    .max(300, "Question cannot exceed 300 characters.")
    .refine(noNullBytes, "Question cannot contain null bytes."),
  survey_type: z.enum(["boolean", "single_choice", "multiple_choice"]),
  options: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Option text cannot be empty.")
        .max(150, "Option text cannot exceed 150 characters.")
        .refine(noNullBytes, "Option text cannot contain null bytes.")
    )
    .min(2, "At least 2 voting options are required.")
    .max(10, "A survey cannot have more than 10 options."),
  status: z.enum(["published", "draft", "closed"]).default("published"),
});

export type SurveyCreationInput = z.infer<typeof SurveyCreationSchema>;

// 9. Survey Vote Schema
export const SurveyVoteSchema = z.object({
  surveyId: z
    .string()
    .trim()
    .min(1, "Survey ID is required.")
    .max(100, "Survey ID cannot exceed 100 characters.")
    .refine(noNullBytes, "Survey ID cannot contain null bytes."),
  optionIds: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Option ID cannot be empty.")
        .max(100, "Option ID cannot exceed 100 characters.")
        .refine(noNullBytes, "Option ID cannot contain null bytes.")
    )
    .min(1, "Please select at least one option to vote.")
    .max(10, "Cannot select more than 10 options."),
});

export type SurveyVoteInput = z.infer<typeof SurveyVoteSchema>;

// 10. Organization Review Schema
export const ReviewSubmissionSchema = z.object({
  orgId: UuidSchema,
  rating: z
    .number()
    .int("Rating must be an integer.")
    .min(1, "Rating must be between 1 and 5.")
    .max(5, "Rating must be between 1 and 5."),
  reviewText: z
    .string()
    .trim()
    .min(5, "Review text must be at least 5 characters long.")
    .max(2000, "Review text cannot exceed 2000 characters.")
    .refine(noNullBytes, "Review text cannot contain null bytes."),
});

export type ReviewSubmissionInput = z.infer<typeof ReviewSubmissionSchema>;

// 11. Project Creation Schema
export const ProjectCreationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Project title must be at least 5 characters.")
    .max(150, "Project title cannot exceed 150 characters.")
    .refine(noNullBytes, "Title cannot contain null bytes."),
  description: z
    .string()
    .trim()
    .min(20, "Project description must be at least 20 characters.")
    .max(10000, "Project description cannot exceed 10000 characters.")
    .refine(noNullBytes, "Description cannot contain null bytes."),
  project_type: z
    .string()
    .trim()
    .min(1, "Project type is required.")
    .max(50, "Project type cannot exceed 50 characters.")
    .default("ESC"),
  dest_country: z
    .string()
    .trim()
    .min(2, "Country code must be at least 2 characters.")
    .max(10, "Country code cannot exceed 10 characters.")
    .refine(noNullBytes, "Country code cannot contain null bytes."),
  exact_location: z
    .string()
    .trim()
    .max(150, "Exact location cannot exceed 150 characters.")
    .refine(noNullBytes, "Exact location cannot contain null bytes.")
    .optional()
    .nullable(),
  official_url: z
    .string()
    .trim()
    .max(500, "Official URL cannot exceed 500 characters.")
    .refine(noNullBytes, "Official URL cannot contain null bytes.")
    .optional()
    .nullable(),
  target_profile: z
    .string()
    .trim()
    .max(500, "Target profile cannot exceed 500 characters.")
    .refine(noNullBytes, "Target profile cannot contain null bytes.")
    .optional()
    .nullable(),
  min_age: z.number().int().min(13).max(99).default(18),
  max_age: z.number().int().min(13).max(99).default(30),
  duration_days: z.number().int().positive().max(730).optional().nullable(),
  travel_budget_min: z.number().int().nonnegative().max(50000).optional().nullable(),
  travel_budget_max: z.number().int().nonnegative().max(50000).optional().nullable(),
  participation_fee: z.number().int().nonnegative().max(10000).optional().nullable(),
  financing_type: z.string().trim().max(50).refine(noNullBytes).optional().nullable(),
  covers_rup_flights: z.boolean().default(false),
  is_last_minute: z.boolean().default(false),
  accommodation_covered: z.boolean().default(false),
  themes: z.array(z.string().trim().max(60).refine(noNullBytes)).max(20).default([]),
  eligible_countries: z.array(z.string().trim().max(10).refine(noNullBytes)).max(60).default([]),
  start_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format").optional().nullable(),
  end_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format").optional().nullable(),
  application_deadline: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid application deadline format").optional().nullable(),
  participant_count: z.number().int().positive().max(5000).optional().nullable(),
  application_form_id: z.string().trim().uuid("Invalid application form ID").optional().nullable(),
});

export const ProjectThemeSchema = z.enum([
  "environment",
  "digital",
  "inclusion",
  "mental_health",
  "arts_culture",
  "sports",
  "human_rights",
  "entrepreneurship",
  "civic_participation",
  "media_literacy",
  "rural_development",
  "heritage",
]);

export type ProjectCreationInput = z.infer<typeof ProjectCreationSchema>;

// 12. Webhook Dispatch Schema
export const WebhookDispatchSchema = z.object({
  webhookUrl: z
    .string()
    .trim()
    .min(10, "Webhook URL is too short.")
    .max(500, "Webhook URL cannot exceed 500 characters.")
    .refine(noNullBytes, "Webhook URL cannot contain null bytes."),
  platform: z.enum(["discord", "slack"]),
  organizationId: UuidSchema,
});

export type WebhookDispatchInput = z.infer<typeof WebhookDispatchSchema>;
