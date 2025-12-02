import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { ludlog, luderror } from '@/lib/ludlog';
import { apiRequest } from '@/services/apiClient';

/**
 * Hook to load subscription eligibility data once at the page level
 * This prevents multiple API calls when rendering many product cards
 *
 * @returns {Object} - { eligibilityData, isLoading, hasEligibility, refetch }
 */
export function useSubscriptionEligibility() {
  const { currentUser } = useUser();
  const [eligibilityData, setEligibilityData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasEligibility, setHasEligibility] = useState(false);

  const loadEligibilityData = async () => {
    if (!currentUser || currentUser.user_type !== 'teacher') {
      setEligibilityData(null);
      setHasEligibility(false);
      return;
    }

    try {
      setIsLoading(true);

      ludlog.ui('Loading subscription eligibility data for page');

      // Use apiClient instead of direct fetch
      const response = await apiRequest('/subscriptions/benefits/my-allowances');
      const allowanceData = response.data || response;

      setEligibilityData(allowanceData);
      setHasEligibility(!!allowanceData?.allowances);

    } catch (error) {
      luderror.ui('Error loading subscription eligibility data:', error);
      setEligibilityData(null);
      setHasEligibility(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEligibilityData();
  }, [currentUser]);

  return {
    eligibilityData,
    isLoading,
    hasEligibility,
    refetch: loadEligibilityData
  };
}