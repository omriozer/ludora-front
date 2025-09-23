import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';

export default function ProtectedRoute({ children }) {
  const { currentUser, isLoading } = useUser();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}