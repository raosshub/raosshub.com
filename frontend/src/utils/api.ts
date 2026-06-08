import axios, { AxiosError, AxiosInstance } from 'axios';

// ─── Module-level access token ─────────────────────────────────────────────
// The access token lives only in memory — never written to localStorage.
// useAuthStore calls setApiToken() after login/refresh; the Axios interceptor
// reads it here. This avoids a circular import between api.ts and useAuthStore.

let _accessToken: string | null = null;

export const setApiToken = (token: string | null): void => {
  _accessToken = token;
};

export const getApiToken = (): string | null => _accessToken;

// ─── Axios instance ────────────────────────────────────────────────────────
// withCredentials: true — required so the browser sends the httpOnly refresh
// cookie to /api/auth/refresh and /api/auth/logout on every request that
// targets those paths.

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ─── Request interceptor — attach access token ────────────────────────────
api.interceptors.request.use((config) => {
  if (_accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ─── Response interceptor — silent refresh on 401 ────────────────────────
// When the access token expires (15 min), any 401 response triggers a silent
// refresh using the httpOnly refresh cookie. The cookie is sent automatically
// by the browser because withCredentials: true is set. No token is read from
// localStorage. On success: new access token is stored in memory and the
// original request is retried once. On failure: auth:logout event is fired
// so App.tsx can redirect to the login screen cleanly.

let _refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Deduplicate concurrent 401s — only one refresh call in flight at a time
      if (!_refreshPromise) {
        _refreshPromise = axios
          .post<{ data: { accessToken: string } }>(
            '/api/auth/refresh',
            {},
            { withCredentials: true }
          )
          .then((res) => {
            const newToken = res.data.data.accessToken;
            setApiToken(newToken);
            return newToken;
          })
          .catch((err) => {
            setApiToken(null);
            // Signal App.tsx to show the login screen without a hard redirect
            window.dispatchEvent(new CustomEvent('auth:logout'));
            return Promise.reject(err);
          })
          .finally(() => {
            _refreshPromise = null;
          });
      }

      try {
        const newToken = await _refreshPromise;
        originalRequest.headers!.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ──────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  // Cookie is sent automatically — no body or header needed
  refresh: () => api.post('/auth/refresh', {}),
  // Clears the httpOnly cookie server-side; requires valid access token
  logout: () => api.post('/auth/logout', {}),
  forgotPassword: (username: string, lang: string) =>
    api.post('/auth/forgot-password', { username, lang }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  acceptNda: () => api.post('/auth/nda'),
  ndaStatus: () => api.get('/auth/nda/status'),
};

// ─── i18n API ──────────────────────────────────────────────────────────────
export const i18nApi = {
  getLanguages: () => api.get('/languages'),
  getUiStrings: (lang: string) => api.get('/ui-strings', { params: { lang } }),
  getLocale: (lang: string) => api.get(`/locales/${lang}`),
  getLocaleSection: (lang: string, sectionPath: string) =>
    api.get(`/locales/${lang}/${sectionPath}`),
  saveLocaleContent: (
    lang: string,
    sectionPath: string,
    content: unknown,
    updatedBy: string
  ) => api.post(`/locales/${lang}`, { sectionPath, content, updatedBy }),
  saveUiString: (key: string, languageCode: string, value: string) =>
    api.post('/ui-strings', { key, languageCode, value }),
};

// ─── User API ──────────────────────────────────────────────────────────────
export const userApi = {
  getAll: () => api.get('/users'),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/change-password', { currentPassword, newPassword }),
};

// ─── Team API ──────────────────────────────────────────────────────────────
export const teamApi = {
  getAll: () => api.get('/teams'),
};

// ─── Config API ────────────────────────────────────────────────────────────
export const configApi = {
  get: () => api.get('/config'),
  save: (config: Record<string, unknown>) => api.post('/config', config),
};

// ─── Audit API ─────────────────────────────────────────────────────────────
export const auditApi = {
  getLogs: (params?: Record<string, unknown>) =>
    api.get('/audit', { params }),
  exportCsv: () => api.get('/audit/export', { responseType: 'blob' }),
};

// ─── File API ──────────────────────────────────────────────────────────────
export const fileApi = {
  upload: (formData: FormData) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getTeamFiles: (teamId: string) => api.get(`/files/${teamId}/files`),
  getGallery: (teamId: string) => api.get(`/files/${teamId}/gallery`),
  getPdfs: (teamId: string) => api.get(`/files/${teamId}/pdf`),
  getSummaries: (teamId: string) => api.get(`/files/${teamId}/summaries`),
};

// ─── Health API ────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};

// ─── Kimi AI API ───────────────────────────────────────────────────────────
export const kimiApi = {
  chat: (body: Record<string, unknown>) => api.post('/kimi', body),
};

export default api;
