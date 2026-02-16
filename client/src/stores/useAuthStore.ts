import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { AuthResponse } from "../types/TAuth";
import { UserPayload } from "../types/TUser";

export interface AuthState {
  user: UserPayload | null;
  loading: boolean;
  errors: string[] | null;
  fingerprint?: string;
  csrf?: string;
  authChecked: boolean;
}

export interface AuthActions {
  start: () => void;
  succeeded: (payload: AuthResponse) => void;
  failure: (errors: string[]) => void;
  refreshToken: (payload: {
    user: UserPayload;
    fingerprint?: string;
    csrf?: string;
  }) => void;
  logout: () => void;
  checkAuthStatus: (authenticated: boolean) => void;
  clearErrors: () => void;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  errors: null,
  fingerprint: undefined,
  csrf: undefined,
  authChecked: false,
};

const useAuthStore = create<AuthState & AuthActions>()(
  immer((set) => ({
    ...initialState,

    start: () =>
      set((state) => {
        state.loading = true;
      }),

    succeeded: (payload) =>
      set((state) => {
        state.loading = false;
        state.user = { ...payload.user };
        state.fingerprint = payload.fingerprint || state.fingerprint;
        state.csrf = payload.csrf || state.csrf;
        state.authChecked = true;
        state.errors = null;
      }),

    failure: (errors) =>
      set((state) => {
        state.loading = false;
        state.errors = errors;
      }),

    refreshToken: (payload) =>
      set((state) => {
        if (state.user) {
          state.user = { ...state.user, ...payload.user };
          state.fingerprint = payload.fingerprint || state.fingerprint;
          state.csrf = payload.csrf || state.csrf;
          state.authChecked = true;
        }
      }),

    logout: () => set({ ...initialState, authChecked: true }),

    checkAuthStatus: (authenticated) =>
      set((state) => {
        state.authChecked = true;
        if (!authenticated && state.user) {
          state.user = null;
        }
      }),

    clearErrors: () =>
      set((state) => {
        state.errors = null;
      }),
  })),
);

export default useAuthStore;
