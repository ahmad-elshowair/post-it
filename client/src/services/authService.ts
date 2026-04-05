import { AxiosError } from 'axios';
import api from '../api/axiosInstance';
import {
  getCsrf,
  getFingerprint,
  syncAllAuthTokensFromCookies,
  syncCsrfFromCookies,
  syncFingerprintFromCookies,
} from './storage';

export class AuthService {
  static getCsrfToken(): string | null {
    const token = getCsrf();
    if (!token) {
      console.warn('CSRF token not available');
    }
    return token;
  }

  static isCsrfMismatchError(error: AxiosError): boolean {
    return (
      error.response?.status === 403 &&
      (error.response?.data as any)?.error === 'CSRF token mismatch!'
    );
  }

  static handleCsrfMismatch(): string | null {
    try {
      console.log('Attempting to sync CSRF token from cookies...');
      const cookieToken = this.syncCsrfToken();
      if (cookieToken) {
        return cookieToken;
      }
      console.warn('Failed to sync CSRF token from cookie');
      return null;
    } catch (error) {
      console.error('Failed to handle CSRF token mismatch: ', error);
      return null;
    }
  }

  static syncCsrfToken(): string | null {
    try {
      const token = syncCsrfFromCookies();
      if (token) {
        return token;
      }
      console.warn('CSRF token not available');
      return null;
    } catch (error) {
      console.error('Failed to sync CSRF token: ', error);
      return null;
    }
  }

  static syncFingerprint(): string | null {
    try {
      const fingerprint = syncFingerprintFromCookies();
      if (fingerprint) {
        return fingerprint;
      }
      console.warn('Fingerprint token not available');
      return null;
    } catch (error) {
      console.error('Failed to sync fingerprint: ', error);
      return null;
    }
  }

  static syncAllTokens(): boolean {
    try {
      syncAllAuthTokensFromCookies();
      return true;
    } catch (error) {
      console.error('Failed to sync all tokens: ', error);
      return false;
    }
  }

  static async refreshAuthTokens() {
    try {
      this.syncAllTokens();

      const fingerprint = getFingerprint();
      const csrfToken = this.getCsrfToken();

      if (!fingerprint) {
        console.warn('Cannot refresh tokens: Fingerprint token not available');
        return false;
      }

      const headers: Record<string, string> = {
        'X-Fingerprint': fingerprint,
      };

      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await api.post(
        '/auth/refresh-token',
        {},
        { headers, withCredentials: true },
      );

      if (response.status === 200) {
        this.syncAllTokens();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh auth tokens: ', error);
      return false;
    }
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 300,
  ) {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} Syncing tokens first ...`);
          this.syncAllTokens();

          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        return await operation();
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed with error: ${error}`);
        lastError = error;

        if (error instanceof AxiosError && this.isCsrfMismatchError(error)) {
          console.log('CSRF token mismatch detected, refreshing token before next attempt');
          this.handleCsrfMismatch();
        }
      }
    }
    console.error(`All ${maxRetries} attempts failed with error: ${lastError}`);
    throw lastError;
  }
}
