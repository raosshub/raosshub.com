import { create } from 'zustand';
import { configApi } from '@/utils/api';

export interface ProjectIdentity {
  projectName:    string;
  productCode:    string;
  companyName:    string;
  status:         string;
  siteTitle:      string;
  description:    string;
  logoUrl:        string;
  faviconUrl:     string;
  primaryColor:   string;
  productImages:  string[];
  productModelUrl:string;
  contactEmail:   string;
  websiteUrl:     string;
  referenceLinks: string;
  icpZh:          string;
  icpEn:          string;
  patentNotice:   string;
  trademarkNotice:string;
  copyrightNotice:string;
  chip:           string;
  name:           string;
  version:        string;
  refLink1:       string;
  refLink2:       string;
  githubUrl:      string;
  startDate:      string;
  targetDate:     string;
  updatedLabel:   string;
}

// NDA body text stored per-language in config.
// Version enforcement (forceOnVersionChange) removed — NDA is per-session only.
export interface NdaConfig {
  text?:    string;   // legacy single-language field (backward compat)
  [key: string]: unknown; // text_en, text_zh, text_ar ... dynamic keys
}

export interface NotificationsConfig {
  showVersion?: boolean;
}

interface ConfigState {
  identity:      ProjectIdentity;
  nda:           NdaConfig;
  notifications: NotificationsConfig;
  loaded:        boolean;
  load:             () => Promise<void>;
  getBreadcrumb:    (pathname: string) => string;
}

const defaultIdentity: ProjectIdentity = {
  projectName: '', productCode: '', companyName: '', status: '',
  siteTitle: '', description: '', logoUrl: '', faviconUrl: '', primaryColor: '',
  productImages: [], productModelUrl: '', contactEmail: '', websiteUrl: '',
  referenceLinks: '', icpZh: '', icpEn: '', patentNotice: '', trademarkNotice: '',
  copyrightNotice: '', chip: '', name: '', version: '', refLink1: '', refLink2: '',
  githubUrl: '', startDate: '', targetDate: '', updatedLabel: '',
};

const BREADCRUMB_MAP: Record<string, string> = {
  '/':            'Overview',
  '/settings':    'Settings',
  '/assistant':   'HUB Assist',
  '/activity-log':'Activity Log',
  '/admin/setup': 'Admin / Setup',
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  identity:      { ...defaultIdentity },
  nda:           {},
  notifications: {},
  loaded:        false,

  load: async () => {
    try {
      const res           = await configApi.get();
      const id            = (res.data?.data?.identity      || {}) as Partial<ProjectIdentity>;
      const nda           = (res.data?.data?.nda           || {}) as NdaConfig;
      const notifications = (res.data?.data?.notifications || {}) as NotificationsConfig;
      const merged        = { ...defaultIdentity, ...id };

      set({ identity: merged, nda, notifications, loaded: true });

      const title = merged.siteTitle || merged.projectName;
      if (title) document.title = title;

      if (merged.faviconUrl) {
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel  = 'icon';
          link.type = 'image/x-icon';
          document.head.appendChild(link);
        }
        link.href = merged.faviconUrl;
      }
    } catch (e) {
      console.warn('[Config] Failed to load:', e);
      set({ loaded: true });
    }
  },

  getBreadcrumb: (pathname) => {
    if (BREADCRUMB_MAP[pathname]) return BREADCRUMB_MAP[pathname];
    const teamMatch = pathname.match(/^\/team\/(.+)$/);
    if (teamMatch) {
      const { identity } = get();
      return identity.name || teamMatch[1];
    }
    return '';
  },
}));
