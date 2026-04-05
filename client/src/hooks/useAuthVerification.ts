import axios from 'axios';
import { useCallback } from 'react';
import api from '../api/axiosInstance';
import configs from '../configs';
import useAuthStore from '../stores/useAuthStore';
import {
  clearAuthStorage,
  getCsrf,
  getFingerprint,
  isTokenExpired,
  setCsrf,
  setFingerprint,
  syncAllAuthTokensFromCookies,
} from '../services/storage';

const useAuthVerification = () => {
  const refreshTokens = useCallback(async () => {
    try {
      // SYNC ALL AUTH TOKENS FROM COOKIES TO LOCAL STORAGE.
      syncAllAuthTokensFromCookies();

      // GET fingerprint FROM SESSION STORAGE FOR TOKEN VALIDATION
      const storedFingerprint = getFingerprint();

      // IF NO fingerprint IS AVAILABLE, WE CAN'T REFRESH TOKENS.
      if (!storedFingerprint) {
        console.warn('No Fingerprint available for token refresh');
        return false;
      }

      // SET UP HEADER WITH fingerprint CSRF TOKEN IF AVAILABLE.
      const headers: Record<string, string> = {
        'X-Fingerprint': storedFingerprint,
      };

      const csrfToken = getCsrf();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      // MAKE A REFRESH TOKEN REQUEST WITH PROPER CREDENTIALS, AND HEADERS.
      console.log('Attempting to refresh auth tokens...');
      try {
        const refreshResult = await api.post(
          '/auth/refresh-token',
          {},
          {
            withCredentials: true,
            headers,
            timeout: 10000,
          },
        );

        const { user, fingerprint, csrf } = refreshResult?.data || {};
        // IF WE GOT A VALID RESPONSE WITH USER DATA,
        if (user) {
          console.log('Token refresh successfully!');
          // STORE SECURITY TOKENS IN SESSION STORAGE.
          if (fingerprint) {
            setFingerprint(fingerprint);
          }

          if (csrf) {
            setCsrf(csrf);
          }

          // UPDATE AUTH STATE WITH NEW USER INFO.
          useAuthStore.getState().succeeded({
            user,
            fingerprint,
            csrf,
          });
          return true;
        }
        return false;
      } catch (refreshError) {
        if (axios.isAxiosError(refreshError)) {
          if (refreshError.response?.status === 403) {
            console.error('Token validation failed clearing credentials');
            clearAuthStorage();
            useAuthStore.getState().checkAuthStatus(false);
          }
          console.error('Status code:', refreshError.response?.status);
          console.error('Response data:', refreshError.response?.data);
        } else {
          console.error('Error message:', (refreshError as Error).message);
        }
        return false;
      }
    } catch (error) {
      // DETAILED ERROR LOGGING.
      if (axios.isAxiosError(error)) {
        console.error('Status code:', error.response?.status);
        console.error('Response data:', error.response?.data);
      } else {
        console.error('Error message:', (error as Error).message);
      }
      return false;
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      // SYNC ALL AUTH TOKENS FROM COOKIES TO LOCAL STORAGE.
      syncAllAuthTokensFromCookies();

      console.log('Checking authentication status...');
      const response = await api.get('/auth/is-authenticated', {
        timeout: 10000,
      });

      const { user, fingerprint, csrf, authenticated } = response.data;
      if (authenticated) {
        console.log('User is authenticated');
        // IF USER DATA IS INCLUDED IN THE RESPONSE.
        if (user) {
          // STORE SECURITY TOKEN IF PROVIDED.
          if (fingerprint) {
            setFingerprint(fingerprint);
          }

          if (csrf) {
            setCsrf(csrf);
          }

          // UPDATE AUTH STATE WITH NEW USER INFO.
          useAuthStore.getState().succeeded({
            user,
            fingerprint,
            csrf,
          });
        } else {
          // SIMPLE AUTHENTICATED FLAG WITHOUT USER DATA (BACKWARD COMPATIBILITY.)
          useAuthStore.getState().checkAuthStatus(true);
        }
        return true;
      } else {
        console.log('User is NOT authenticated!');
        useAuthStore.getState().checkAuthStatus(false);
        return false;
      }
    } catch (error) {
      // DETAILED ERROR LOGGING.
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          console.error('Authentication request timed out');
        } else if (error.response) {
          console.error('Status code:', error.response?.status);
          console.error('Response data:', error.response?.data);
        } else if (error.request) {
          console.error('No response received from server');
        }
      }
      useAuthStore.getState().checkAuthStatus(false);
      return false;
    }
  }, []);

  const verifyAuth = useCallback(async () => {
    const { start, checkAuthStatus: checkAuth } = useAuthStore.getState();
    // DISPATCH START ACTION TO INDICATE LOADING.
    start();
    // CREATE AN OVERALL TIMEOUT PROTECTION.
    const authTimeout = setTimeout(() => {
      console.error('Auth verification timeout after 10 seconds');
      useAuthStore.getState().checkAuthStatus(false);
    }, 10000);
    try {
      // SYNC ALL AUTH TOKENS FROM COOKIES TO LOCAL STORAGE.
      syncAllAuthTokensFromCookies();

      // CHECK IF fingerprint EXISTS.
      let storedFingerprint = getFingerprint();
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 300;

      while (!storedFingerprint && retryCount < maxRetries) {
        console.warn(`Retry ${retryCount + 1}/${maxRetries} to get fingerprint...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        storedFingerprint = getFingerprint();
        retryCount++;
      }

      if (!storedFingerprint) {
        console.error('Failed to retrieve fingerprint after retries');
        clearAuthStorage();
        checkAuth(false);
        return;
      }

      try {
        const authStatus = await checkAuthStatus().catch(() => false);
        if (authStatus) {
          return;
        }
      } catch (error) {
        console.log('Direct auth check failed, attempting token refresh:', error);
      }

      if (isTokenExpired()) {
        console.info('Token Expired, attempting refresh');
        const refreshResult = await refreshTokens();
        if (!refreshResult) {
          clearAuthStorage();
          checkAuth(false);
        }
        return;
      }

      const accessTokenName =
        configs.node_env === 'development' ? 'access_token' : '_Host-access_token';

      const accessToken = document.cookie.includes(accessTokenName);
      if (!accessToken) {
        console.warn('Access token not found in cookies, attempting refresh');
        const refreshResult = await refreshTokens();
        if (!refreshResult) {
          clearAuthStorage();
          checkAuth(false);
        }
      }
    } catch (error) {
      console.error('Authentication verification failed: ', error);
      useAuthStore.getState().checkAuthStatus(false);
    } finally {
      clearTimeout(authTimeout);
    }
  }, [refreshTokens, checkAuthStatus]);

  return {
    refreshTokens,
    verifyAuth,
    checkAuthStatus,
  };
};

export default useAuthVerification;
