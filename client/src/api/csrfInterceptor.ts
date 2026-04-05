import { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { AuthService } from '../services/authService';

export const setupCsrfInterceptor = (apiInstance: AxiosInstance) => {
  apiInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & {
        _retry?: boolean;
      };

      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      if (AuthService.isCsrfMismatchError(error)) {
        console.log('CSRF token mismatch detected,  attempting to refresh token');

        originalRequest._retry = true;

        const newToken = AuthService.handleCsrfMismatch();

        if (newToken) {
          console.log('CSRF token refreshed, retrying request');

          if (!originalRequest.headers) {
            originalRequest.headers = {};
          }
          originalRequest.headers['X-CSRF-Token'] = newToken;
          return apiInstance(originalRequest);
        }
      }
      return Promise.reject(error);
    },
  );

  return apiInstance;
};
