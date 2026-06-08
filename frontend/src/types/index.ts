/**
 * Shared TypeScript types for RAOSS Hub v3.
 *
 * SYNC RULE — every interface here maps to a Java DTO or entity.
 * When you change a field in a Java class, update the matching interface below.
 * The comment on each interface states the exact Java source file to check.
 *
 * Java DTOs live in: backend/src/main/java/com/raosshub/dto/
 * Java entities live in: backend/src/main/java/com/raosshub/entity/
 */

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
// Mirrors the JSON structure stored in project_configs.config
export interface ProjectConfig {
  identity?: {
    name: string;
    chip: string;
    version: string;
    status: string;
    description: string;
    startDate: string;
    targetDate: string;
    updatedLabel: string;
    githubUrl: string;
    refLink1: string;
    refLink2: string;
    icpEn: string;
    icpZh: string;
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
// Note: detailEn and detailZh are the bilingual columns; the frontend
// should display the one matching the current language.
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
