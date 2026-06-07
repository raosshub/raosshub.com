import { create } from 'zustand';
import { configApi } from '@/utils/api';

export interface ProjectIdentity {
  projectName: string;
  companyName: string;
  productCode: string;
  status: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  productImages: string[];
  productModelUrl: string;
  contactEmail: string;
  websiteUrl: string;
  referenceLinks: string;
  copyrightNotice: string;
  trademarkNotice: string;
  patentNotice: string;
  icpZh: string;
  icpEn: string;
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
  description: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '',
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
  '/': 'Overview',
  '/settings': 'Settings',
  '/assistant': 'HUB Assist',
  '/activity-log': 'Activity Log',
  '/admin/setup': 'Admin / Setup',
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  identity: { ...defaultIdentity },
  loaded: false,

  load: async () => {
    try {
      const res = await configApi.get();
      const id = res.data?.data?.identity || {};
      const merged = { ...defaultIdentity, ...id };
      set({ identity: merged, loaded: true });

      // Update document title
      if (merged.projectName) {
        document.title = merged.projectName;
      }

      // Update favicon
      if (merged.faviconUrl) {
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          link.type = 'image/x-icon';
          document.head.appendChild(link);
        }
        link.href = merged.faviconUrl;
      }
    } catch {
      set({ loaded: true });
    }
  },

  getBreadcrumb: (pathname: string) => {
    // Check direct matches first
    if (BREADCRUMB_MAP[pathname]) return BREADCRUMB_MAP[pathname];

    // Team pages
    if (pathname.startsWith('/team/')) {
      const teamId = pathname.replace('/team/', '');
      const teamNames: Record<string, string> = {
        react: 'React App', pcba: 'PCBA', firmware: 'Firmware',
        tft: 'TFT', router: 'Router', charger: 'Charger', shell: 'Shell',
      };
      return `Teams / ${teamNames[teamId] || teamId}`;
    }

    return 'Dashboard';
  },
}));
