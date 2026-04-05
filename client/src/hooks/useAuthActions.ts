import { useCallback } from 'react';
import { loginUser, logoutUser, registerUser } from '../services/auth';
import { LoginCredentials, RegisterCredentials } from '../types/TAuth';

const useAuthActions = () => {
  const login = useCallback(async (credentials: LoginCredentials) => {
    return loginUser(credentials);
  }, []);

  const register = useCallback(async (userData: RegisterCredentials) => {
    return registerUser(userData);
  }, []);

  const logout = useCallback(async () => {
    return logoutUser();
  }, []);

  return {
    login,
    logout,
    register,
  };
};

export default useAuthActions;
