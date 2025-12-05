import React from 'react';
import { useConsentEnforcement } from '@/hooks/useConsentEnforcement';
import { useUser } from '@/contexts/UserContext';
import ConnectToTeacherScreen from './ConnectToTeacherScreen';
import WaitingForConsentScreen from './WaitingForConsentScreen';
import { useNavigate } from 'react-router-dom';

/**
 * Main component that handles parent consent enforcement for students.
 * Shows appropriate screens based on student's consent status.
 */
const ConsentEnforcement = ({ children }) => {
  const navigate = useNavigate();
  const { logout } = useUser();
  const {
    loading,
    enforcement,
    refreshStatus
  } = useConsentEnforcement();

  // Show loading while checking enforcement status
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mt-4">בודק מצב הרשאות...</p>
        </div>
      </div>
    );
  }

  // Handle teacher connection
  const handleTeacherLinked = async (_teacher) => {
    // Teacher linked successfully - refresh enforcement status to see if we need consent now
    await refreshStatus();

    // TODO: Refresh UserContext to update user.linked_teacher_id
    // This ensures the global user state reflects the teacher linking
  };

  // Handle logout/cancel
  const handleCancel = async () => {
    try {
      await logout();
      navigate('/');
    } catch (_error) {
      // Error during logout - redirect anyway for user experience
      navigate('/');
    }
  };

  // Show appropriate enforcement screen
  switch (enforcement) {
    case 'need_teacher':
      return (
        <ConnectToTeacherScreen
          onTeacherLinked={handleTeacherLinked}
          onCancel={handleCancel}
        />
      );

    case 'need_consent':
      return (
        <WaitingForConsentScreen
          onRefresh={refreshStatus}
          onCancel={handleCancel}
        />
      );

    case 'none':
    default:
      // No enforcement needed - render children
      return children;
  }
};

export default ConsentEnforcement;