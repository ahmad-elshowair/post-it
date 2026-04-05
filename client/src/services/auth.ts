import axios from 'axios';
import { ApiError } from '../api/ApiError';
import configs from '../configs';
import { createSecureApi } from '../hooks/useSecureApi';
import useAuthStore from '../stores/useAuthStore';
import { LoginCredentials, RegisterCredentials } from '../types/TAuth';
import { UserPayload } from '../types/TUser';
import {
  clearAuthStorage,
  getFingerprint,
  setCsrf,
  setFingerprint,
  setTokenExpiration,
} from './storage';

const { post } = createSecureApi();

export const registerUser = async (userData: RegisterCredentials) => {
  const { start, succeeded, failure } = useAuthStore.getState();
  start();
  try {
    const response = await post<{
      success: boolean;
      data: {
        csrf: string;
        fingerprint: string;
        user: UserPayload;
      };
    }>(`/auth/register`, userData);

    if (!response || !response.success) {
      console.error(' Registration Failed - response error');
      failure(['Registration failed - Please try again later.']);
      return;
    }

    const { csrf, fingerprint, user } = response.data;

    // CHECK IF SECURITY TOKENS ARE PRESENT WHEN THE RESPONSE IS RECEIVED.
    if (!csrf) {
      console.error('CSRF TOKEN NOT FOUND IN LOGIN RESPONSE');
      failure(['CSRF TOKEN NOT FOUND']);
      return;
    }

    if (!fingerprint) {
      console.error('FINGERPRINT NOT FOUND IN LOGIN RESPONSE');
      failure(['FINGERPRINT NOT FOUND']);
      return;
    }

    // STORE TOKENS IN SESSION STORAGE.
    setFingerprint(fingerprint);
    setCsrf(csrf);
    setTokenExpiration(configs.access_token_expiry);

    const storedFingerprint = getFingerprint();
    if (!storedFingerprint) {
      console.error('Failed to store fingerprint in localStorage');
      failure(['Authentication error occurred']);
      return;
    }

    succeeded({
      user,
      csrf,
      fingerprint,
    });
  } catch (error) {
    console.error('Registration failed:', error);

    let errorMessage: string[] = ['AN UNEXPECTED ERROR WITH REGISTRATION !'];

    if (error instanceof ApiError) {
      if (error.status === 400 && error.data?.errors) {
        errorMessage = error.data.errors.map((err: { msg: string }) => err.msg);
      } else {
        errorMessage = [error.message || 'Registration Failed'];
      }
    } else if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400 && error.response.data.errors) {
        errorMessage = error.response.data.errors.map((err: { msg: string }) => err.msg);
      } else {
        errorMessage = [error.response.data || 'Registration Failed'];
      }
    }
    failure(errorMessage);
  }
};

export const loginUser = async (userCredentials: LoginCredentials) => {
  const { start, succeeded, failure } = useAuthStore.getState();
  start();
  try {
    // ENSURE WE'RE USING withCredentials FOR THIS CRITICAL REQUEST.
    const response = await post<{
      success: boolean;
      data: {
        user: UserPayload;
        csrf: string;
        fingerprint: string;
      };
    }>(`/auth/login`, userCredentials);
    if (!response) {
      console.error('LOGIN Failed - No Response received');
      failure(['No Response from server - Please try again later']);
      return;
    }

    if (!response.success) {
      console.error('LOGIN Failed - Server returned Error');
      failure(['Login Failed - Please try again later']);
      return;
    }
    const { csrf, fingerprint, user } = response.data;
    // CHECK IF SECURITY TOKENS ARE PRESENT WHEN THE RESPONSE IS RECEIVED.
    if (!csrf) {
      console.error('CSRF TOKEN NOT FOUND IN LOGIN RESPONSE');
      failure(['CSRF TOKEN NOT FOUND']);
      return;
    }

    if (!fingerprint) {
      console.error('FINGERPRINT NOT FOUND IN LOGIN RESPONSE');
      failure(['FINGERPRINT NOT FOUND']);
      return;
    }

    // STORE TOKENS IN SESSION STORAGE.
    setFingerprint(fingerprint);
    setCsrf(csrf);
    setTokenExpiration(configs.access_token_expiry);

    // Verify fingerprint was successfully stored
    const storedFingerprint = getFingerprint();
    if (!storedFingerprint) {
      console.error('Failed to store fingerprint in localStorage');
      failure(['Authentication error occurred']);
      return;
    }
    succeeded({
      user,
      csrf,
      fingerprint,
    });
  } catch (error) {
    console.error('LOGIN failed:', error);

    let errorMessage: string[] = ['AN UNEXPECTED ERROR WITH REGISTRATION !'];

    if (error instanceof ApiError) {
      if (error.status === 400 && error.data?.errors) {
        errorMessage = error.data.errors.map((err: { msg: string }) => err.msg);
      } else {
        errorMessage = [error.message || 'LOGIN Failed'];
      }
    } else if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400 && error.response.data.errors) {
        errorMessage = error.response.data.errors.map((err: { msg: string }) => err.msg);
      } else {
        errorMessage = [error.response.data || 'LOGIN Failed'];
      }
    }
    failure(errorMessage);
  }
};

export const logoutUser = async () => {
  const { start, logout } = useAuthStore.getState();
  start();
  try {
    await post('/auth/logout', {});

    clearAuthStorage();

    logout();
    return true;
  } catch (error) {
    console.error('LOGOUT ERROR:', error);

    // LOG DETAILED ERROR INFORMATION FOR DEBUGGING
    if (error instanceof ApiError) {
      console.error('Status: ', error.status);
      console.error('Message: ', error.message);
      console.error('Data: ', error.data);
    } else if (axios.isAxiosError(error)) {
      console.error('Status: ', error.response?.status);
      console.error('Data: ', error.response?.data);
    } else if (error instanceof Error) {
      console.error('Error message: ', error.message);
    } else {
      console.error('Unknown error type', error);
    }
    // STILL LOGOUT CLIENT-SIDE EVEN IF THE SERVER FAILS.
    clearAuthStorage();
    logout();
    return false;
  }
};
