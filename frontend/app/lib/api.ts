// API client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

// Token storage keys
const ACCESS_TOKEN_KEY = 'captions_access_token';
const REFRESH_TOKEN_KEY = 'captions_refresh_token';

interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Token management
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // HTTP request helper
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Add auth token if available
    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 - try to refresh token
      if (response.status === 401 && this.getRefreshToken()) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
          const retryResponse = await fetch(url, { ...config, headers });
          return this.handleResponse<T>(retryResponse);
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = new Error(
        `API Error: ${response.status} ${response.statusText}`
      );
      error.status = response.status;

      try {
        error.data = await response.json();
      } catch {
        error.data = await response.text();
      }

      throw error;
    }

    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  private handleError(error: unknown): ApiError {
    if (error instanceof Error) {
      return error as ApiError;
    }
    return new Error(String(error)) as ApiError;
  }

  // Token refresh
  async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // HTTP methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // File upload with progress
  async uploadFile(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', url);
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      xhr.send(formData);
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    apiClient.post<{ access_token: string; refresh_token: string; token_type: string }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ access_token: string; refresh_token: string; token_type: string }>('/auth/login', data),

  refresh: (refreshToken: string) =>
    apiClient.post<{ access_token: string; refresh_token: string; token_type: string }>('/auth/refresh', { refresh_token: refreshToken }),

  me: () => apiClient.get<{
    id: string;
    email: string;
    full_name?: string;
    organization?: string;
    role: string;
    credits_remaining: number;
    credits_total: number;
    is_active: boolean;
    created_at: string;
  }>('/auth/me'),

  updateMe: (data: { full_name?: string; organization?: string }) =>
    apiClient.put('/auth/me', data),
};

// Projects API
export const projectsApi = {
  // list: (params?: {
  //   search?: string;
  //   status?: string;
  //   favorite?: boolean;
  //   archived?: boolean;
  //   sort_by?: string;
  //   sort_order?: string;
  //   page?: number;
  //   per_page?: number;
  // }) => apiClient.get<{
  //   items: Project[];
  //   total: number;
  //   page: number;
  //   per_page: number;
  //   total_pages: number;
  //   has_next: boolean;
  //   has_prev: boolean;
  // }>('/projects?' + new URLSearchParams(params as Record<string, string>).toString()),

  list: (params = {}) => {
    console.log("Calling project API");
    console.trace("projectsApi.list called");
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(
        ([_, value]) => value !== undefined && value !== null
      )
    );

    const queryString = new URLSearchParams(filteredParams as Record<string, string>).toString();
    return apiClient.get(`/projects${queryString ? `?${queryString}` : ''}`);
  },

  get: (id: string) => apiClient.get<Project>(`/projects/${id}`),

  getMediaUrl: (id: string): string | null => {
    const token = apiClient.getAccessToken();
    if (!token) return null;
    return `${API_BASE_URL}/projects/${id}/media?token=${encodeURIComponent(token)}`;
  },

  create: (
    data: {
      name: string;
      description?: string;
      source_language?: string;
      series_id?: string;
      file: File;
    },
    onProgress?: (progress: number) => void
  ): Promise<Project> => {
    const url = `${API_BASE_URL}/projects`;
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.source_language) {
      formData.append('source_language', data.source_language);
    }
    if (data.series_id) {
      formData.append('series_id', data.series_id);
    }
    formData.append('file', data.file);

    const token = apiClient.getAccessToken();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText as unknown as Project);
          }
        } else {
          let message = `Create failed: ${xhr.statusText}`;
          try {
            const errorData = JSON.parse(xhr.responseText);
            message = errorData.detail || errorData.message || message;
          } catch {
            // ignore parse error
          }
          reject(new Error(message));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Create failed'));
      });

      xhr.open('POST', url);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  },

  update: (id: string, data: Partial<Project>) =>
    apiClient.put<Project>(`/projects/${id}`, data),

  delete: (id: string, permanent?: boolean) =>
    apiClient.delete(`/projects/${id}${permanent ? '?permanent=true' : ''}`),

  toggleFavorite: (id: string) =>
    apiClient.post<Project>(`/projects/${id}/favorite`, {}),

  toggleArchive: (id: string) =>
    apiClient.post<Project>(`/projects/${id}/archive`, {}),

  duplicate: (id: string, newName?: string) =>
    apiClient.post<Project>(`/projects/${id}/duplicate`, { new_name: newName }),

  moveToSeries: (id: string, seriesId?: string) =>
    apiClient.post<Project>(`/projects/${id}/move-to-series`, { series_id: seriesId }),

  transcribe: (id: string): Promise<{
    message: string;
    project_id: string;
    storage_key: string;
    job_id: string;
    job_status: string;
  }> => apiClient.post(`/projects/${id}/transcribe`),

  getJobStatus: (id: string) =>
    apiClient.get<JobStatus>(`/projects/${id}/job-status`),
};

// Assets API
export const assetsApi = {
  list: (path?: string) =>
    apiClient.get(`/assets${path ? `?path=${encodeURIComponent(path)}` : ''}`),

  getPresignedUrl: (data: { filename: string; content_type: string; path?: string }) =>
    apiClient.post<{ url: string; fields: Record<string, string>; asset_id: string; storage_key: string }>('/assets/presigned-url', data),

  upload: (file: File, path?: string, onProgress?: (progress: number) => void) =>
    apiClient.uploadFile(`/assets/upload${path ? `?path=${encodeURIComponent(path)}` : ''}`, file, onProgress),

  delete: (id: string) => apiClient.delete(`/assets/${id}`),

  getDownloadUrl: (id: string) =>
    apiClient.get<{ download_url: string }>(`/assets/${id}/download`),
};

// Series API
export const seriesApi = {
  list: (params = {}) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(
        ([_, value]) => value !== undefined && value !== null
      )
    );

    const queryString = new URLSearchParams(filteredParams as Record<string, string>).toString();
    return apiClient.get<{ items: Series[]; total: number }>(`/series/${queryString ? `?${queryString}` : ''}`);
  },

  get: (id: string) => apiClient.get<SeriesDetail>(`/series/${id}`),

  create: (data: { name: string; description?: string; languages?: string[] }) =>
    apiClient.post<SeriesDetail>('/series', data),

  update: (id: string, data: Partial<Series>) =>
    apiClient.put<SeriesDetail>(`/series/${id}`, data),

  delete: (id: string, permanent?: boolean) =>
    apiClient.delete(`/series/${id}${permanent ? '?permanent=true' : ''}`),

  toggleArchive: (id: string) =>
    apiClient.post<SeriesDetail>(`/series/${id}/archive`, {}),

  // Speakers
  addSpeaker: (seriesId: string, data: { name: string; meta?: string; hue?: number }) =>
    apiClient.post<SeriesSpeaker>(`/series/${seriesId}/speakers`, data),

  removeSpeaker: (seriesId: string, speakerId: string) =>
    apiClient.delete(`/series/${seriesId}/speakers/${speakerId}`),

  // Terms
  addTerm: (seriesId: string, data: { term: string; rule: string }) =>
    apiClient.post<SeriesTerm>(`/series/${seriesId}/terms`, data),

  removeTerm: (seriesId: string, termId: string) =>
    apiClient.delete(`/series/${seriesId}/terms/${termId}`),

  // Episodes
  addEpisode: (seriesId: string, data: { project_id: string; title: string; meta?: string }) =>
    apiClient.post<Episode>(`/series/${seriesId}/episodes`, data),

  removeEpisode: (seriesId: string, episodeId: string) =>
    apiClient.delete(`/series/${seriesId}/episodes/${episodeId}`),

  reorderEpisodes: (seriesId: string, episodeIds: string[]) =>
    apiClient.post<Episode[]>(`/series/${seriesId}/reorder`, { episode_ids: episodeIds }),
};

// Types (matching backend schemas)
export interface Project {
  id: string;
  name: string;
  description?: string;
  initial: string;
  tile: number;
  duration_seconds?: number;
  duration_display?: string;
  status: 'transcribed' | 'translated' | 'captioned';
  role: 'owner' | 'edit' | 'view';
  source_language: string;
  is_archived: boolean;
  is_favorite: boolean;
  is_deleted: boolean;
  owner_id: string;
  series_id?: string;
  langs?: number;
  dur?: string;
  updated?: string;
  created_at: string;
  updated_at: string;

  // Job tracking
  job_id?: string;
  job_status?: 'pending' | 'uploading' | 'transcribing' | 'completed' | 'failed';
  job_progress?: number;
  job_message?: string;
  storage_key?: string;
}

export interface JobStatus {
  job_id?: string;
  status: 'pending' | 'uploading' | 'transcribing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  result?: Record<string, unknown>;
}

export interface Series {
  id: string;
  name: string;
  description?: string;
  hue: number;
  is_archived: boolean;
  is_deleted: boolean;
  owner_id: string;
  episode_count?: number;
  languages?: string[];
  created_at: string;
  updated_at: string;
}

export interface SeriesDetail extends Series {
  speakers: SeriesSpeaker[];
  terms: SeriesTerm[];
  episodes: Episode[];
}

export interface SeriesSpeaker {
  id: string;
  series_id: string;
  name: string;
  meta?: string;
  hue: number;
  created_at: string;
}

export interface SeriesTerm {
  id: string;
  series_id: string;
  term: string;
  rule: string;
  created_at: string;
}

export interface Episode {
  id: string;
  series_id: string;
  project_id: string;
  title: string;
  meta?: string;
  status: string;
  sort_order: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  organization?: string;
  role: string;
  credits_remaining: number;
  credits_total: number;
  is_active: boolean;
  created_at: string;
}
