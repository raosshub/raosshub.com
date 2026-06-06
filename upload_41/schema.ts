import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  bigint,
  index,
} from "drizzle-orm/pg-core";

// ─── Users ───
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  screenName: varchar("screen_name", { length: 255 }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  ndaAccepted: boolean("nda_accepted").default(false),
  ndaDate: timestamp("nda_date"),
  company: varchar("company", { length: 255 }),
  position: varchar("position", { length: 255 }),
  division: varchar("division", { length: 255 }),
  mobile: varchar("mobile", { length: 50 }),
  countryCode: varchar("country_code", { length: 10 }),
  twoFaEnabled: boolean("two_fa_enabled").default(false),
  canViewActivity: boolean("can_view_activity").default(false),
  canUseAi: boolean("can_use_ai").default(false),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Projects ───
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 20 }).default("1.0"),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  isDefault: boolean("is_default").default(false),
  logoPath: text("logo_path"),
  faviconPath: text("favicon_path"),
  threeDPath: text("three_d_path"),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Project = typeof projects.$inferSelect;

// ─── Languages ───
export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  nativeName: varchar("native_name", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  isRtl: boolean("is_rtl").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Language = typeof languages.$inferSelect;

// ─── Locales ───
export const locales = pgTable("locales", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  lang: varchar("lang", { length: 10 }).notNull(),
  sectionKey: varchar("section_key", { length: 255 }).notNull(),
  content: text("content"),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("locales_idx").on(table.projectId, table.lang, table.sectionKey),
]);

export type Locale = typeof locales.$inferSelect;

// ─── Teams ───
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  teamId: varchar("team_id", { length: 100 }).notNull().unique(),
  projectId: integer("project_id").notNull(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameZh: varchar("name_zh", { length: 255 }),
  description: text("description"),
  icon: varchar("icon", { length: 50 }).default("box"),
  color: varchar("color", { length: 20 }).default("#1e3a5f"),
  textColor: varchar("text_color", { length: 20 }).default("#58a6ff"),
  tabs: jsonb("tabs"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Team = typeof teams.$inferSelect;

// ─── User Teams ───
export const userTeams = pgTable("user_teams", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  teamId: varchar("team_id", { length: 100 }).notNull(),
  isLead: boolean("is_lead").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Team Files ───
export const teamFiles = pgTable("team_files", {
  id: serial("id").primaryKey(),
  teamId: varchar("team_id", { length: 100 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: bigint("file_size", { mode: "number" }),
  mimeType: varchar("mime_type", { length: 100 }),
  notes: text("notes"),
  uploadedBy: integer("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Gallery Images ───
export const galleryImages = pgTable("gallery_images", {
  id: serial("id").primaryKey(),
  teamId: varchar("team_id", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: bigint("file_size", { mode: "number" }),
  notes: text("notes"),
  uploadedBy: integer("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── PDF Documents ───
export const pdfDocuments = pgTable("pdf_documents", {
  id: serial("id").primaryKey(),
  teamId: varchar("team_id", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  version: integer("version").default(1),
  filePath: text("file_path"),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: bigint("file_size", { mode: "number" }),
  liveDoc: jsonb("live_doc"),
  uploadedBy: integer("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ─── Screenshots ───
export const screenshots = pgTable("screenshots", {
  id: serial("id").primaryKey(),
  teamId: varchar("team_id", { length: 100 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: bigint("file_size", { mode: "number" }),
  ocrText: text("ocr_text"),
  summary: text("summary"),
  uploadedBy: integer("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Chat Summaries ───
export const chatSummaries = pgTable("chat_summaries", {
  id: serial("id").primaryKey(),
  teamId: varchar("team_id", { length: 100 }).notNull(),
  summaryText: text("summary_text"),
  screenshotIds: jsonb("screenshot_ids"),
  modelUsed: varchar("model_used", { length: 50 }),
  tokensUsed: integer("tokens_used").default(0),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Version History ───
export const versionHistory = pgTable("version_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  changeType: varchar("change_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  authorName: varchar("author_name", { length: 255 }),
  affectedTeams: jsonb("affected_teams"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  requiredApprovals: integer("required_approvals").default(1),
  approvedAt: timestamp("approved_at"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Version Approvals ───
export const versionApprovals = pgTable("version_approvals", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  userId: integer("user_id").notNull(),
  approvedAt: timestamp("approved_at").defaultNow().notNull(),
});

// ─── Project Config ───
export const projectConfig = pgTable("project_config", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value"),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("config_idx").on(table.projectId, table.key),
]);

// ─── Project Snapshots ───
export const projectSnapshots = pgTable("project_snapshots", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  config: jsonb("config"),
  locales: jsonb("locales"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Audit Log ───
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  username: varchar("username", { length: 255 }),
  action: varchar("action", { length: 50 }).notNull(),
  resource: varchar("resource", { length: 50 }).notNull(),
  recordId: varchar("record_id", { length: 255 }),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Refresh Tokens ───
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Reset Tokens ───
export const resetTokens = pgTable("reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── AI Conversations ───
export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(), // system, user, assistant
  content: text("content").notNull(),
  context: jsonb("context"), // teamId, tab, page, etc.
  tokensUsed: integer("tokens_used").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── System Config ───
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── AI Usage ───
export const aiUsage = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  requestCount: integer("request_count").default(0),
  tokenCount: integer("token_count").default(0),
  costCents: integer("cost_cents").default(0), // in cents for precision
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Chat Messages ───
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  teamId: varchar("team_id", { length: 100 }).notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 20 }).default("text").notNull(),
  filePath: text("file_path"),
  parentId: integer("parent_id"),
  sentBy: integer("sent_by").notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Team Content Pending ───
export const teamContentPending = pgTable("team_content_pending", {
  id: serial("id").primaryKey(),
  teamId: varchar("team_id", { length: 100 }).notNull(),
  sectionKey: varchar("section_key", { length: 255 }).notNull(),
  content: text("content").notNull(),
  submittedBy: integer("submitted_by").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reviewedBy: integer("reviewed_by"),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Responsibility Matrix ───
export const responsibilityMatrix = pgTable("responsibility_matrix", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").default(1).notNull(),
  teamId: varchar("team_id", { length: 100 }).notNull(),
  userId: integer("user_id").notNull(),
  responsibility: text("responsibility").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── HUB Insights ───
export const hubInsights = pgTable("hub_insights", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").default(1).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // chat, pdf, scope, deliverables, actions, timeline, risks
  priority: varchar("priority", { length: 20 }).default("info").notNull(), // critical, warning, info
  content: jsonb("content").notNull(), // { en: "...", zh: "..." }
  details: jsonb("details"), // { en: "...", zh: "..." }
  sourceRef: text("source_ref"), // "team:firmware / deliverables:v1.2"
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, snoozed, dismissed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Insight Snoozes ───
export const insightSnoozes = pgTable("insight_snoozes", {
  id: serial("id").primaryKey(),
  insightId: integer("insight_id").notNull(),
  userId: integer("user_id").notNull(),
  snoozedUntil: timestamp("snoozed_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
