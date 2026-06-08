import axios, { AxiosError, AxiosInstance } from 'axios';

// ─── Module-level access token ─────────────────────────────────────────────
// The access token lives only in memory — never written to localStorage.
// useAuthStore calls setApiToken() after login/refresh.
// The Axios interceptor reads it for all JSON API calls.
// kimiApi.stream() reads it for the raw SSE fetch call.

let _accessToken: string | null = null;

export const setApiToken = (token: string | null): void => {
  _accessToken = token;
};

export const getApiToken = (): string | null => _accessToken;

// ─── Axios instance ────────────────────────────────────────────────────────
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
let _refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

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
  login:          (username: string, password: string) =>
                    api.post('/auth/login', { username, password }),
  me:             () => api.get('/auth/me'),
  refresh:        () => api.post('/auth/refresh', {}),
  logout:         () => api.post('/auth/logout', {}),
  forgotPassword: (username: string, lang: string) =>
                    api.post('/auth/forgot-password', { username, lang }),
  resetPassword:  (token: string, password: string) =>
                    api.post('/auth/reset-password', { token, password }),
  acceptNda:      () => api.post('/auth/nda'),
  ndaStatus:      () => api.get('/auth/nda/status'),
};

// ─── i18n API ──────────────────────────────────────────────────────────────
export const i18nApi = {
  getLanguages:    () => api.get('/languages'),
  getUiStrings:    (lang: string) => api.get('/ui-strings', { params: { lang } }),
  getLocale:       (lang: string) => api.get(`/locales/${lang}`),
  getLocaleSection:(lang: string, sectionPath: string) =>
                     api.get(`/locales/${lang}/${sectionPath}`),
  saveLocaleContent:(lang: string, sectionPath: string, content: unknown, updatedBy: string) =>
                     api.post(`/locales/${lang}`, { sectionPath, content, updatedBy }),
  saveUiString:    (key: string, languageCode: string, value: string) =>
                     api.post('/ui-strings', { key, languageCode, value }),
};

// ─── User API ──────────────────────────────────────────────────────────────
export const userApi = {
  getAll:         () => api.get('/users'),
  getById:        (id: number) => api.get(`/users/${id}`),
  create:         (data: Record<string, unknown>) => api.post('/users', data),
  update:         (id: number, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete:         (id: number) => api.delete(`/users/${id}`),
  changePassword: (currentPassword: string, newPassword: string) =>
                    api.post('/users/change-password', { currentPassword, newPassword }),
};

// ─── Team API ──────────────────────────────────────────────────────────────
export const teamApi = {
  getAll: () => api.get('/teams'),
};

// ─── Config API ────────────────────────────────────────────────────────────
export const configApi = {
  get:  () => api.get('/config'),
  save: (config: Record<string, unknown>) => api.post('/config', config),
};

// ─── Audit API ─────────────────────────────────────────────────────────────
export const auditApi = {
  getLogs:   (params?: Record<string, unknown>) => api.get('/audit', { params }),
  exportCsv: () => api.get('/audit/export', { responseType: 'blob' }),
};

// ─── File API ──────────────────────────────────────────────────────────────
export const fileApi = {
  upload:          (formData: FormData) =>
                     api.post('/files/upload', formData, {
                       headers: { 'Content-Type': 'multipart/form-data' },
                     }),
  getTeamFiles:    (teamId: string) => api.get(`/files/${teamId}/files`),
  getGallery:      (teamId: string) => api.get(`/files/${teamId}/gallery`),
  getPdfs:         (teamId: string) => api.get(`/files/${teamId}/pdf`),
  getSummaries:    (teamId: string) => api.get(`/files/${teamId}/summaries`),
};

// ─── Kimi AI API ───────────────────────────────────────────────────────────
export const kimiApi = {
  // Non-streaming — returns full response after Moonshot finishes.
  chat: (body: Record<string, unknown>) => api.post('/kimi', body),

  /**
   * Streaming — returns the raw browser Response so the caller can read
   * body as a ReadableStream for progressive SSE rendering.
   *
   * Usage in HubAssistPage:
   *   const response = await kimiApi.stream(body);
   *   const reader   = response.body?.getReader();
   *
   * The httpOnly refresh cookie is sent automatically via credentials: 'include'.
   * The access token is attached as a Bearer header from the module-level variable.
   */
  stream: (body: Record<string, unknown>): Promise<Response> => {
    const token = getApiToken();
    return fetch('/api/kimi/stream', {
      method:      'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  },
};

// ─── Health API ────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;
