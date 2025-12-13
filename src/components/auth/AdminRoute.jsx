import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';

export default function AdminRoute({ children }) {
  const { currentUser, isLoading, isAdmin } = useUser();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Use centralized admin check from UserContext
  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}