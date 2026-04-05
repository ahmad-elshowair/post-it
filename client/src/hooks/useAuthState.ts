import useAuthStore from '../stores/useAuthStore';

const useAuthState = () => {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const errors = useAuthStore((s) => s.errors);
  const fingerprint = useAuthStore((s) => s.fingerprint);
  const csrf = useAuthStore((s) => s.csrf);
  const authChecked = useAuthStore((s) => s.authChecked);

  return {
    user,
    isAuthenticated: !!user,
    isAuthChecked: authChecked,
    isLoading: loading,
    errors,
    fingerprint,
    csrf,
  };
};

export default useAuthState;
