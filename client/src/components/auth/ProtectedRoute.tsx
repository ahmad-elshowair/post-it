import { Navigate, Outlet } from 'react-router-dom';
import useAuthState from '../../hooks/useAuthState';

const ProtectedRoute = () => {
  const { isAuthChecked, user, isLoading } = useAuthState();

  if (isLoading || !isAuthChecked) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
