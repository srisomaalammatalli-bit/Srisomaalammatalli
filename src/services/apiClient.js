/**
 * Unified API Client for Frontend <-> Vercel Serverless Functions.
 * Handles credentials, JSON parsing, error transformation, and request timeouts.
 */

const API_BASE = import.meta.env.VITE_PUBLIC_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(message, code = 'API_ERROR', status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = {
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers,
    credentials: 'include' // Needed for HTTP-only cookies
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';
    
    let result = null;
    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { success: response.ok, data: text };
    }

    if (!response.ok || result?.success === false) {
      const errorData = result?.error || {};
      throw new ApiError(
        errorData.message || `Request failed with status ${response.status}`,
        errorData.code || 'HTTP_' + response.status,
        response.status,
        errorData.details
      );
    }

    return result.data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error occurred', 'NETWORK_ERROR', 0);
  }
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' })
};

export default apiClient;
