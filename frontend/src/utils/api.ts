import axios, { AxiosError, AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hub_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 with refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !(originalRequest as any)._retry) {
      (originalRequest as any)._retry = true;
      try {
        const refreshRes = await axios.post('/api/auth/refresh', {}, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('hub_token') || ''}`,
          },
        });
        const { accessToken } = refreshRes.data.data;
        localStorage.setItem('hub_token', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('hub_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ──────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (username: string, lang: string) =>
    api.post('/auth/forgot-password', { username, lang }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  acceptNda: () => api.post('/auth/nda'),
  ndaStatus: () => api.get('/auth/nda/status'),
};

// ─── i18n API ──────────────────────────────────────────────────
export const i18nApi = {
  getLanguages: () => api.get('/languages'),
  getUiStrings: (lang: string) => api.get('/ui-strings', { params: { lang } }),
  getLocale: (lang: string) => api.get(`/locales/${lang}`),
  getLocaleSection: (lang: string, sectionPath: string) =>
    api.get(`/locales/${lang}/${sectionPath}`),
  saveLocaleContent: (lang: string, sectionPath: string, content: unknown, updatedBy: string) =>
    api.post(`/locales/${lang}`, { sectionPath, content, updatedBy }),
  saveUiString: (key: string, languageCode: string, value: string) =>
    api.post('/ui-strings', { key, languageCode, value }),
};

// ─── User API ──────────────────────────────────────────────────
export const userApi = {
  getAll: () => api.get('/users'),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/change-password', { currentPassword, newPassword }),
};

// ─── Team API ──────────────────────────────────────────────────
export const teamApi = {
  getAll: () => api.get('/teams'),
};

// ─── Config API ────────────────────────────────────────────────
export const configApi = {
  get: () => api.get('/config'),
  save: (config: Record<string, unknown>) => api.post('/config', config),
};

// ─── Audit API ─────────────────────────────────────────────────
export const auditApi = {
  getLogs: (params?: Record<string, string | number>) => api.get('/audit', { params }),
};

// ─── File API ──────────────────────────────────────────────────
export const fileApi = {
  getTeamFiles: (teamId: string) => api.get(`/files/${teamId}/files`),
  uploadTeamFile: (teamId: string, file: FormData) =>
    api.post(`/files/${teamId}/files/upload`, file, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteTeamFile: (fileId: number) => api.delete(`/files/files/${fileId}`),
  getGallery: (teamId: string) => api.get(`/files/${teamId}/gallery`),
  uploadGallery: (teamId: string, file: FormData) =>
    api.post(`/files/${teamId}/gallery/upload`, file, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteGalleryImage: (imageId: number) => api.delete(`/files/gallery/${imageId}`),
  getPdfDocuments: (teamId: string) => api.get(`/files/${teamId}/pdf`),
  uploadPdf: (teamId: string, file: FormData) =>
    api.post(`/files/${teamId}/pdf/upload`, file, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePdf: (docId: number) => api.delete(`/files/pdf/${docId}`),
};

// ─── Kimi Proxy ────────────────────────────────────────────────
export const kimiApi = {
  chat: (body: Record<string, unknown>) => api.post('/kimi', body),
};

// ─── Health ────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;
