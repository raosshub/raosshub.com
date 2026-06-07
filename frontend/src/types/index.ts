export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin' | 'viewer';
  teams: string[];
  canViewActivity: boolean;
}

export interface Language {
  id: number;
  code: string;
  name: string;
  nameNative: string;
  isRtl: boolean;
  isActive: boolean;
  isDefault: boolean;
}

export interface Team {
  id: number;
  teamId: string;
  nameEn: string;
  nameZh: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export interface UiStrings {
  [key: string]: string;
}

export interface LocaleContent {
  [sectionPath: string]: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

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

export interface GalleryImage {
  id: number;
  teamId: string;
  fileName: string;
  s3Url: string;
  fileSize: number;
  createdAt: string;
}

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

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
}
