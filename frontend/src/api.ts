const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('pharmacy_auth_token');
  
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('pharmacy_auth_token');
    localStorage.removeItem('pharmacy_user');
    window.dispatchEvent(new Event('auth-logout'));
  }

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `HTTP error! Status: ${response.status}` };
    }
    throw errorData;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, data: any) => request<T>(path, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: <T>(path: string, data: any) => request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
export default api;
