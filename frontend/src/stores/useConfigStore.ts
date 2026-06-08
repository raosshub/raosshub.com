import { create } from 'zustand';
import { configApi } from '@/utils/api';

// ─── Identity interface ────────────────────────────────────────────────────────
// Mirrors ProjectConfig.identity from types/index.ts.
// siteTitle sets the HTML <title> tag independently of projectName.
export interface ProjectIdentity {
  // Basic Information
  projectName: string;
  companyName: string;
  productCode: string;
  status: string;
  siteTitle: string;         // HTML <title> tag — independent of projectName
  description: string;       // stored for Tab 3 compat, not shown in Tab 1

  // Branding
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;

  // Product Visuals
  productImages: string[];
  productModelUrl: string;

  // Contact & Links
  contactEmail: string;
  websiteUrl: string;
  referenceLinks: string;

  // Intellectual Property & Compliance
  copyrightNotice: string;   // sidebar footer line 5
  trademarkNotice: string;   // sidebar footer line 4
  patentNotice: string;      // sidebar footer line 3
  icpZh: string;             // sidebar footer line 2 — only when lang = ZH
  icpEn: string;             // sidebar footer line 2 — all other languages

  // Legacy v2 compat (do not remove — backend JSONB may contain these)
  chip: string;
  name: string;
  version: string;
  refLink1: string;
  refLink2: string;
  githubUrl: string;
  startDate: string;
  targetDate: string;
  updatedLabel: string;
}

interface ConfigState {
  identity: ProjectIdentity;
  loaded: boolean;
  load: () => Promise<void>;
  getBreadcrumb: (pathname: string) => string;
}

const defaultIdentity: ProjectIdentity = {
  projectName: '',
  companyName: '',
  productCode: '',
  status: '',
  siteTitle: '',
  description: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#3fb950',
  productImages: [],
  productModelUrl: '',
  contactEmail: '',
  websiteUrl: '',
  referenceLinks: '',
  copyrightNotice: '',
  trademarkNotice: '',
  patentNotice: '',
  icpZh: '',
  icpEn: '',
  chip: '',
  name: '',
  version: '',
  refLink1: '',
  refLink2: '',
  githubUrl: '',
  startDate: '',
  targetDate: '',
  updatedLabel: '',
};

const BREADCRUMB_MAP: Record<string, string> = {
  '/':             'Overview',
  '/settings':     'Settings',
  '/assistant':    'HUB Assist',
  '/activity-log': 'Activity Log',
  '/admin/setup':  'Admin / Setup',
};

export const useConfigStore = create<ConfigState>((set) => ({
  identity: { ...defaultIdentity },
  loaded: false,

  load: async () => {
    try {
      const res = await configApi.get();
      const id  = res.data?.data?.identity || {};
      const merged = { ...defaultIdentity, ...id };
      set({ identity: merged, loaded: true });

      // siteTitle takes priority over projectName for the browser tab title.
      // Fallback chain: siteTitle → projectName → default
      const title = merged.siteTitle || merged.projectName;
      if (title) document.title = title;

      // Apply favicon if configured
      if (merged.faviconUrl) {
        const link =
          (document.querySelector("link[rel='icon']") as HTMLLinkElement) ||
          Object.assign(document.createElement('link'), { rel: 'icon' });
        link.href = merged.faviconUrl;
        document.head.appendChild(link);
      }

    } catch (e) {
      console.warn('[Config] Failed to load:', e);
      set({ loaded: true });
    }
  },

  getBreadcrumb: (pathname) => {
    // Exact match first
    if (BREADCRUMB_MAP[pathname]) return BREADCRUMB_MAP[pathname];
    // Team routes: /team/:teamId
    if (pathname.startsWith('/team/')) {
      const teamId = pathname.split('/')[2] || '';
      return teamId.charAt(0).toUpperCase() + teamId.slice(1);
    }
    // Fallback: capitalize last path segment
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    return last.charAt(0).toUpperCase() + last.slice(1) || 'Hub';
  },
}));
