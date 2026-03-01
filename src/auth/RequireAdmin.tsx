import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const RequireAdmin = () => {
  const { currentUser } = useAuth();

  if (currentUser?.role !== 'ADMIN') {
    return <Navigate to="/routes" replace />;
  }

  return <Outlet />;
};
