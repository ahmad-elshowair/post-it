import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useCallback, useState } from 'react';
import { ApiError } from '../api/ApiError';
import api from '../api/axiosInstance';
import { AuthService } from '../services/authService';
import { TRequestOptions } from '../types/TAuth';

// ───── CREATE SECURE API ──────────────────────────────
export function createSecureApi() {
  /**
   * Make a secure API request with automatic token synchronization.
   * Synchronizes all tokens through AuthService before making the request to ensure validity.
   * Throws ApiError if the Axios request fails or returns an error.
   */

  const request = async <TResponse>(
    method: string,
    url: string,
    data: any,
    options?: TRequestOptions,
  ): Promise<TResponse | null> => {
    const { syncTokens = true, onError, config = {} } = options || {};
    try {
      if (syncTokens) {
        AuthService.syncAllTokens();
      }
      const requestConfig: AxiosRequestConfig = {
        ...config,
        method,
        url,
        data,
        withCredentials: true,
      };

      const response = await api(requestConfig);
      return response.data;
    } catch (error) {
      console.error(`API ${method} error: `, error);
      const apiError = axios.isAxiosError(error)
        ? ApiError.fromAxiosError(error as AxiosError)
        : new ApiError(500, String(error));
      if (onError) {
        onError(apiError);
      }
      throw apiError;
    }
  };

  /**
   * Make a GET request using the secure API.
   * Synchronizes tokens before execution. Throws ApiError on failure.
   */
  const get = async <TResponse>(
    url: string,
    options?: TRequestOptions,
  ): Promise<TResponse | null> => {
    return request<TResponse>('GET', url, undefined, options);
  };

  const post = async <TResponse>(
    url: string,
    data: any,
    options?: TRequestOptions,
  ): Promise<TResponse | null> => {
    return request<TResponse>('POST', url, data, options);
  };

  const put = async <TResponse>(
    url: string,
    data: any,
    options?: TRequestOptions,
  ): Promise<TResponse | null> => {
    return request<TResponse>('PUT', url, data, options);
  };

  const del = async <TResponse>(
    url: string,
    options?: TRequestOptions,
  ): Promise<TResponse | null> => {
    return request<TResponse>('DELETE', url, undefined, options);
  };

  return {
    get,
    post,
    put,
    del,
  };
}

// ───── SECURE API HOOK ──────────────────────────────
export function useSecureApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const request = useCallback(
    async <TResponse>(
      method: string,
      url: string,
      data?: any,
      options?: TRequestOptions,
    ): Promise<TResponse | null> => {
      const { syncTokens = true, onError, config = {} } = options || {};
      try {
        setIsLoading(true);
        clearError();
        if (syncTokens) {
          AuthService.syncAllTokens();
        }

        const requestConfig: AxiosRequestConfig = {
          ...config,
          method,
          url,
          data,
        };
        const response = await api(requestConfig);
        return response.data;
      } catch (error) {
        console.error(`API ${method} error:`, error);

        const apiError = axios.isAxiosError(error)
          ? ApiError.fromAxiosError(error as AxiosError)
          : new ApiError(500, String(error));
        setError(apiError);

        if (onError) {
          onError(apiError);
        }
        throw apiError;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError],
  );

  const get = useCallback(
    <TResponse = any>(url: string, options?: TRequestOptions): Promise<TResponse | null> => {
      return request<TResponse>('GET', url, undefined, options);
    },
    [request],
  );

  const post = useCallback(
    <TResponse = any>(
      url: string,
      data?: any,
      options?: TRequestOptions,
    ): Promise<TResponse | null> => {
      return request<TResponse>('POST', url, data, options);
    },
    [request],
  );

  /**
   * Make a PUT request using the secure API hook.
   * Synchronizes tokens and manages local loading and error state. Throws ApiError on failure.
   */
  const put = useCallback(
    <TResponse = any>(
      url: string,
      data?: any,
      options?: TRequestOptions,
    ): Promise<TResponse | null> => {
      return request<TResponse>('PUT', url, data, options);
    },
    [request],
  );

  /**
   * Make a DELETE request using the secure API hook.
   * Synchronizes tokens and manages local loading and error state. Throws ApiError on failure.
   */
  const del = useCallback(
    <TResponse = any>(url: string, options?: TRequestOptions): Promise<TResponse | null> => {
      return request<TResponse>('DELETE', url, undefined, options);
    },
    [request],
  );

  return {
    isLoading,
    error,
    clearError,
    get,
    post,
    put,
    del,
  };
}
