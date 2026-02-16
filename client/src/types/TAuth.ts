import { AxiosRequestConfig } from "axios";
import { ApiError } from "../api/ApiError";
import { UserPayload } from "./TUser";

export type TAuth = {
  user: UserPayload;
  access_token: string;
  refresh_token: string;
  fingerprint?: string;
  csrf?: string;
};

export type AuthResponse = {
  message?: string;
  user: UserPayload;
  fingerprint?: string;
  csrf?: string;
  access_token?: string;
  refresh_token?: string;
};
export type LoginCredentials = {
  email?: string;
  password?: string;
};
export type RegisterCredentials = {
  user_name: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};
export type AuthAction =
  | { type: "START" }
  | { type: "SUCCEEDED"; payload: AuthResponse }
  | { type: "FAILURE"; payload: string[] }
  | {
      type: "REFRESH_TOKEN";
      payload: {
        user: UserPayload;
        access_token?: string;
        refresh_token?: string;
        fingerprint?: string;
        csrf?: string;
      };
    }
  | { type: "LOGOUT" }
  | { type: "CHECK_AUTH_STATUS"; payload: boolean };

export type AuthState = {
  user: UserPayload | null;
  loading: boolean;
  errors: string[] | null;
  fingerprint?: string;
  csrf?: string;
  authChecked?: boolean;
};

export type TRequestOptions = {
  params?: Record<string, string>;
  data?: any;
  syncTokens?: boolean;
  onError?: (error: ApiError) => void;
  config?: AxiosRequestConfig;
};

export interface ISecureApiReturn {
  isLoading: boolean;
  error: ApiError | null;
  clearError: () => void;
  get: <T = any>(url: string, options?: TRequestOptions) => Promise<T | null>;
  post: <T = any>(
    url: string,
    data?: any,
    options?: TRequestOptions,
  ) => Promise<T | null>;
  put: <T = any>(
    url: string,
    data?: any,
    options?: TRequestOptions,
  ) => Promise<T | null>;
  del: <T = any>(url: string, options?: TRequestOptions) => Promise<T | null>;
}
