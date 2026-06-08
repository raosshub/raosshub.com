/**
 * Shared TypeScript types for RAOSS Hub v3.
 *
 * SYNC RULE — every interface here maps to a Java DTO or entity.
 * When you change a field in a Java class, update the matching interface below.
 * The comment on each interface states the exact Java source file to check.
 *
 * Java DTOs  → backend/src/main/java/com/raosshub/dto/
 * Java entities → backend/src/main/java/com/raosshub/entity/
 */

// ─── Status options (shared by ProjectIdentityTab + AppLayout) ────────────────
// When adding a new status value: add here, and add the matching
// ui_message keys (status_<value>) to schema.sql for EN + ZH.
export const STATUS_OPTIONS = [
  { value: 'planning',    en: 'Planning',        zh: '规划中'   },
  { value: 'development', en: 'In Development',  zh: '开发中'   },
  { value: 'prototype',   en: 'Prototype',       zh: '原型阶段' },
  { value: 'production',  en: 'Production',      zh: '生产中'   },
  { value: 'maintenance', en: 'Maintenance',     zh: '维护中'   },
  { value: 'completed',   en: 'Completed',       zh: '已完成'   },
] as const;

export type StatusValue = typeof STATUS_OPTIONS[number]['value'];

/** Resolves a status value to its display label for the active language. */
export function getStatusLabel(status: string, lang: string): string {
  const opt = STATUS_OPTIONS.find((o) => o.value === status);
  if (!opt) return status;
  return lang === 'zh' ? opt.zh : opt.en;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Java: com/raosshub/dto/UserDto.java
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin' | 'viewer' | 'user';
  teams: string[];
  canViewActivity: boolean;
}

// Java: com/raosshub/dto/LoginResponse.java
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
// Java: com/raosshub/entity/Language.java
export interface Language {
  id: number;
  code: string;
  name: string;
  nameNative: string;
  isRtl: boolean;
  isActive: boolean;
  isDefault: boolean;
}

// Key-value map of UI strings from /api/ui-strings.
// Java: com/raosshub/entity/UiMessage.java (key + languageCode + value)
export interface UiStrings {
  [key: string]: string;
}

// Section-keyed locale content from /api/locales/{lang}.
// Java: com/raosshub/entity/LocaleContent.java (JSONB sectionPath → content)
export interface LocaleContent {
  [sectionPath: string]: unknown;
}

// ─── Teams ────────────────────────────────────────────────────────────────────
// Java: com/raosshub/entity/Team.java
export interface Team {
  id: number;
  teamId: string;
  nameEn: string;
  nameZh: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────
// Java: com/raosshub/entity/ProjectConfig.java (JSONB column)
// Mirrors the JSON structure stored in project_configs.config.
// siteTitle: sets the HTML <title> tag, independent of projectName.
export interface ProjectConfig {
  identity?: {
    // Basic Information
    projectName: string;       // sidebar brand name, line 1
    productCode: string;       // sidebar brand subtitle, rendered in primaryColor
    status: StatusValue | string;  // topbar centre badge
    companyName: string;       // email sending only
    siteTitle: string;         // HTML <title> tag (independent of projectName)
    description?: string;      // moved to Tab 3 Dashboard Settings — stored here for compat
    // Branding
    logoUrl: string;           // sidebar brand logo
    faviconUrl: string;        // browser tab icon
    primaryColor: string;      // productCode text color + email
    // Product Visuals
    productImages: string[];   // Overview dashboard
    productModelUrl: string;   // Overview dashboard 3D model
    // Contact & Links
    contactEmail: string;      // email sending only
    websiteUrl: string;        // email sending only
    referenceLinks: string;    // admin use only
    // Intellectual Property & Compliance
    copyrightNotice: string;   // sidebar footer line 5
    trademarkNotice: string;   // sidebar footer line 4
    patentNotice: string;      // sidebar footer line 3
    icpZh: string;             // sidebar footer line 2 — shown when lang = ZH
    icpEn: string;             // sidebar footer line 2 — shown for all other languages
    // Legacy v2 compat fields (do not remove — used by backend JSONB)
    name?: string;
    chip?: string;
    version?: string;
    refLink1?: string;
    refLink2?: string;
    githubUrl?: string;
    startDate?: string;
    targetDate?: string;
    updatedLabel?: string;
    icpEn_legacy?: string;
  };
  branding?: {
    logoFile: string;
    model3dFile: string;
    favicon: string;
  };
  api?: {
    maxScreenshots: number;
    proxyUrl: string;
  };
}

// ─── API wrapper ──────────────────────────────────────────────────────────────
// Java: com/raosshub/dto/ApiResponse.java
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export interface LoginCredentials {
  username: string;
  password: string;
}

// ─── Notifications (frontend-only, no Java counterpart) ──────────────────────
export interface Notification {
  id: string;
  msg: string;
  msg_zh?: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  title_zh?: string;
  ts: string;
  read: boolean;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
}

// ─── Files & media ────────────────────────────────────────────────────────────
// Java: com/raosshub/entity/ChatSummary.java
export interface ChatSummary {
  id: number;
  teamId: string;
  title: string;
  summaryText: string;
  decisions: string[];
  actions: string[];
  blockers: string[];
  analysedByInsight: boolean;
  createdAt: string;
}

// Java: com/raosshub/entity/PdfDocument.java
export interface PdfDocument {
  id: number;
  teamId: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  isActive: boolean;
  createdAt: string;
}

// Java: com/raosshub/entity/GalleryImage.java
export interface GalleryImage {
  id: number;
  teamId: string;
  fileName: string;
  s3Url: string;
  fileSize: number;
  createdAt: string;
}

// Java: com/raosshub/entity/TeamFile.java
export interface TeamFile {
  id: number;
  teamId: string;
  fileName: string;
  s3Url: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────
// Java: com/raosshub/entity/AuditLog.java
// detailEn and detailZh: show the one matching the active language.
export interface AuditLogEntry {
  id: number;
  username: string;
  action: string;
  resource: string;
  recordId: number;
  detailEn: string;
  detailZh: string;
  ipAddress: string;
  createdAt: string;
}
