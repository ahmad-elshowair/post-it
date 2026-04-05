import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import useAuthVerification from '../../hooks/useAuthVerification';
import { getFingerprint } from '../../services/storage';

export const PersistLogin = () => {
  const { verifyAuth } = useAuthVerification();
  const isLoading = useAuthStore((s) => s.loading);
  const isAuthChecked = useAuthStore((s) => s.authChecked);
  const checkAuthStatus = useAuthStore((s) => s.checkAuthStatus);

  useEffect(() => {
    const fingerprint = getFingerprint();
    if (!isAuthChecked) {
      if (!fingerprint) {
        checkAuthStatus(false);
      } else {
        verifyAuth().catch((error) => {
          console.error('Initial Auth Verification Failed', error);
        });
      }
    }
  }, [verifyAuth, isAuthChecked, checkAuthStatus]);

  // SHOW LOADING STATE WHILE CHECKING AUTH, THEN RENDER CHILD ROUTES
  return isLoading || !isAuthChecked ? (
    <section className="loading-container d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <div className="spinner-border text-warning mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h3>Loading...</h3>
      </div>
    </section>
  ) : (
    <Outlet />
  );
};

export default PersistLogin;
