import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useCallback, useState } from 'react';
import { ApiError } from '../api/ApiError';
import api from '../api/axiosInstance';
import { AuthService } from '../services/authService';
import { TRequestOptions } from '../types/TAuth';

// ───── CREATE SECURE API ──────────────────────────────
export function createSecureApi() {
  /**
   * Makes a secure API request with automatic token synchronization
   * @param method HTTP method
   * @Param url API endpoint
   * @param data Request data
   * @param options Request options
   * @returns Response data or null
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
   * Makes a GET request.
   * @param url API endpoint
   * @param options Request options
   * @returns Response data or null
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
   * Makes a PUT request.
   * @param url API endpoint
   * @param data Request data
   * @param options Request options
   * @returns Response data or null
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
   * Makes a DELETE request.
   * @param url API endpoint
   * @param options Request options
   * @returns Response data or null
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
