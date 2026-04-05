import { AxiosError } from 'axios';

export class ApiError extends Error {
  public readonly status: number;
  public readonly originalError?: any;
  public readonly data?: any;
  constructor(status: number, message: string, originalError?: any, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.originalError = originalError;
    this.data = data;

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static fromAxiosError(error: AxiosError) {
    const status = error.response?.status || 500;
    const message =
      (error.response?.data as any)?.message ||
      error.response?.statusText ||
      error.message ||
      'Unknown API error';

    return new ApiError(status, message, error, error.response?.data);
  }

  isCsrfError() {
    return this.status === 403 && (this.data as any)?.error === 'CSRF token mismatch!';
  }

  isAuthError() {
    return this.status === 401;
  }

  isMissingFingerprint() {
    return (
      this.isAuthError() &&
      (this.data?.message?.includes('Missing fingerprint') || this.message?.includes('fingerprint'))
    );
  }

  getValidationErrors() {
    if (this.status === 400 && this.data?.errors) {
      return this.data.errors.map((err: any) => err.msg || err.message || String(err));
    }
    return [this.message];
  }
  getUserFriendlyMessage() {
    if (this.status === 404) {
      return 'The request resource was not found.';
    } else if (this.isCsrfError()) {
      return 'Security token expired. Please try again.';
    } else if (this.isAuthError()) {
      return 'Your session has expired, please login again.';
    } else if (this.status === 400) {
      return 'Please check your input and try again.';
    } else if (this.status >= 500) {
      return 'A server error occurred. Please try again later.';
    } else {
      return this.message;
    }
  }
}
