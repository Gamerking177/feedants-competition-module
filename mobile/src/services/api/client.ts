import { resolveApiBaseUrl } from '../../config/env';
import { authStorage } from '../storage/authStorage';
import { createHttpApiError, normalizeApiError } from './errors';
import { ApiErrorResponse, ApiSuccessResponse, RequestOptions } from './types';

/**
 * Centralized API client for Feedants Mobile.
 *
 * Responsibilities:
 * - Base URL resolution and path joining
 * - JSON serialization of request bodies
 * - Automatic Authorization header injection via authStorage
 * - Standardized error detection, parsing, and normalization
 */
class ApiClient {
  private customBaseUrl?: string;

  /**
   * For testing purposes, allows setting a custom base URL.
   */
  setBaseUrl(url: string): void {
    this.customBaseUrl = url;
  }

  /**
   * Resolves the current base URL.
   */
  getBaseUrl(): string {
    return this.customBaseUrl || resolveApiBaseUrl();
  }

  /**
   * Builds the complete URL from base URL and endpoint path.
   */
  buildUrl(path: string): string {
    const baseUrl = this.getBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Performs an authenticated or unauthenticated HTTP request.
   */
  private async request<T>(
    path: string,
    options: RequestOptions & { method?: string; body?: string } = {}
  ): Promise<T> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    // Attach Authorization header if token exists and skipAuth is not true
    if (!options.skipAuth) {
      try {
        const token = await authStorage.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch {
        // Continue without auth header if token retrieval fails
      }
    }

    // Attach Content-Type if request has a body
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Attempt to parse JSON response body
      let responseData: unknown = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch {
          responseData = null;
        }
      }

      // Handle non-2xx HTTP responses
      if (!response.ok) {
        const errorBody = responseData as ApiErrorResponse | null;
        throw createHttpApiError(response.status, errorBody);
      }

      // Handle backend success envelope: extract inner data if present
      if (
        responseData &&
        typeof responseData === 'object' &&
        'success' in responseData &&
        (responseData as ApiSuccessResponse<T>).success === true &&
        'data' in responseData
      ) {
        return (responseData as ApiSuccessResponse<T>).data;
      }

      return responseData as T;
    } catch (error) {
      throw normalizeApiError(error);
    }
  }

  /**
   * Performs a GET request.
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * Performs a POST request with a JSON-serialized payload.
   */
  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
