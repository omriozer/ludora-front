import { useState } from 'react';
import { ludlog } from '@/lib/ludlog';

/**
 * useClassroomDiscovery Hook
 * Provides state and handlers for classroom discovery modal
 * Can be used across student portal components for consistent discovery UX
 */
export const useClassroomDiscovery = () => {
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  const openDiscovery = () => {
    ludlog.ui('Opening classroom discovery');
    setIsDiscoveryOpen(true);
  };

  const closeDiscovery = () => {
    ludlog.ui('Closing classroom discovery');
    setIsDiscoveryOpen(false);
  };

  return {
    isDiscoveryOpen,
    openDiscovery,
    closeDiscovery
  };
};

export default useClassroomDiscovery;
