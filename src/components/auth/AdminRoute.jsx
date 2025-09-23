import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { isStaff } from '@/lib/userUtils';

export default function AdminRoute({ children }) {
  const { currentUser, isLoading } = useUser();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Clean role check using utility function
  if (!isStaff(currentUser)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}