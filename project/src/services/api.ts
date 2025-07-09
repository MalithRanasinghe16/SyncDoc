const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// API Response types
interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
  errors?: Array<{ msg: string; param: string }>;
}

interface LoginResponse {
  message: string;
  token: string;
  user: any;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  private getAuthToken(): string | null {
    return localStorage.getItem('syncdoc_token');
  }

  // Set auth token in localStorage
  private setAuthToken(token: string): void {
    localStorage.setItem('syncdoc_token', token);
  }

  // Remove auth token from localStorage
  private removeAuthToken(): void {
    localStorage.removeItem('syncdoc_token');
  }

  // Generic API request method
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication methods
  async register(name: string, email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    if (response.token) {
      this.setAuthToken(response.token);
    }

    return response;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      this.setAuthToken(response.token);
    }

    return response;
  }

  async loginWithGoogle(access_token: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ access_token }),
    });

    if (response.token) {
      this.setAuthToken(response.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.removeAuthToken();
    }
  }

  async getCurrentUser(): Promise<{ user: any }> {
    return this.request('/auth/me');
  }

  // Document methods
  async getDocuments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    folder?: string;
    status?: string;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/documents${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getDocument(id: string): Promise<any> {
    return this.request(`/documents/${id}`);
  }

  async createDocument(data: {
    title?: string;
    content?: string;
    folder?: string;
  }): Promise<any> {
    return this.request('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocument(id: string, data: {
    title?: string;
    content?: string;
    status?: string;
    folder?: string;
    tags?: string[];
  }): Promise<any> {
    return this.request(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(id: string): Promise<any> {
    return this.request(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async getDocumentVersions(id: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/documents/${id}/versions${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async saveDocumentVersion(id: string, changes?: string): Promise<any> {
    return this.request(`/documents/${id}/versions`, {
      method: 'POST',
      body: JSON.stringify({ changes }),
    });
  }

  // User methods
  async getUserProfile(): Promise<any> {
    return this.request('/users/profile');
  }

  async updateUserProfile(data: {
    name?: string;
    avatar?: string;
    preferences?: any;
  }): Promise<any> {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async searchUsers(query: string, limit?: number): Promise<any> {
    const searchParams = new URLSearchParams({ q: query });
    if (limit) searchParams.append('limit', limit.toString());
    
    return this.request(`/users/search?${searchParams.toString()}`);
  }

  async getOnlineUsers(limit?: number): Promise<any> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.append('limit', limit.toString());
    
    const endpoint = `/users/online${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async updateUserStatus(isOnline: boolean): Promise<any> {
    return this.request('/users/status', {
      method: 'POST',
      body: JSON.stringify({ isOnline }),
    });
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.request('/health');
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;
