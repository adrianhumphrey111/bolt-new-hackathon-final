/**
 * Utility functions for making authenticated API calls using cookie-based auth
 * This replaces the old pattern of manually adding Authorization headers
 */

interface ApiOptions extends RequestInit {
  timeout?: number;
}

/**
 * Make an authenticated API call using cookie-based authentication
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise with the response
 */
export async function apiCall(url: string, options: ApiOptions = {}): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  // Default headers for API calls
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // Merge headers and ensure cookies are included
  const finalOptions: RequestInit = {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...fetchOptions.headers,
    },
    credentials: 'include', // This ensures cookies are sent for authentication
  };

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...finalOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Make a GET request to an API endpoint
 */
export async function apiGet(url: string, options: Omit<ApiOptions, 'method' | 'body'> = {}) {
  return apiCall(url, { ...options, method: 'GET' });
}

/**
 * Make a POST request to an API endpoint
 */
export async function apiPost(url: string, data?: any, options: Omit<ApiOptions, 'method'> = {}) {
  return apiCall(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make a PUT request to an API endpoint
 */
export async function apiPut(url: string, data?: any, options: Omit<ApiOptions, 'method'> = {}) {
  return apiCall(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make a DELETE request to an API endpoint
 */
export async function apiDelete(url: string, data?: any, options: Omit<ApiOptions, 'method'> = {}) {
  return apiCall(url, {
    ...options,
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper function to handle common API response patterns
 */
export async function handleApiResponse<T = any>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // If parsing fails, use the raw text or default message
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text() as any;
}

/**
 * Combined function to make API call and handle response
 */
export async function apiRequest<T = any>(url: string, options: ApiOptions = {}): Promise<T> {
  const response = await apiCall(url, options);
  return handleApiResponse<T>(response);
}