import { AxiosHeaders, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { AuthService } from '../services/authService';
import { getFingerprint } from '../services/storage';

export const setupRequestInterceptor = (apiInstance: AxiosInstance) => {
  apiInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      console.log(`Request Interceptor: Preparing request to ${config.url}`);

      const publicEndpoints = ['/auth/login', '/auth/register'];

      const isPublicEndpoint = publicEndpoints.some((endpoint) => config.url?.includes(endpoint));

      if (!isPublicEndpoint) {
        if (!config.headers) {
          config.headers = new AxiosHeaders();
        }
        const csrfToken = AuthService.getCsrfToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
          console.log('Request interceptor: Added csrf token to request');
        } else {
          console.log('Request interceptor: No csrf token found');
        }
        const fingerprint = getFingerprint();
        if (fingerprint) {
          config.headers['X-Fingerprint'] = fingerprint;
          console.log('Request interceptor: Added fingerprint to request');
        } else {
          console.log('Request interceptor: No fingerprint found');
        }
      } else {
        console.info('Request interceptor: Public endpoint detected, skipping headers');
      }
      return config;
    },
    (error) => {
      console.error('Request interceptor: Error in request setup', error);
      return Promise.reject(error);
    },
  );
  return apiInstance;
};
