import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { currentUser, isLoading } = useUser();
  const location = useLocation();

  if (isLoading) {
    return <LudoraLoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}