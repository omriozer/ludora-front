import { useEffect } from 'react';

/**
 * UserWay Accessibility Widget Component
 *
 * Integrates UserWay's accessibility toolbar to provide users with:
 * - Font size controls
 * - Color contrast adjustments
 * - Keyboard navigation improvements
 * - Screen reader compatibility
 *
 * Free plan includes basic accessibility features.
 * Widget appears as floating icon on all pages.
 */
export default function UserWayWidget() {
  useEffect(() => {
    // Check if UserWay script is already loaded to prevent duplicates
    if (document.querySelector('script[src*="userway.org/widget.js"]')) {
      return;
    }

    // Create and configure UserWay script
    const script = document.createElement('script');
    script.src = 'https://cdn.userway.org/widget.js';

    // TODO: Replace with your actual UserWay Account ID from userway.org/get/
    // Get this from UserWay dashboard after signup
    script.setAttribute('data-account', 'YOUR_ACCOUNT_ID');

    // Handle script loading errors
    script.onerror = () => {
      console.error('UserWay accessibility widget failed to load');
    };

    // Add script to document head
    document.head.appendChild(script);

    // Cleanup function to remove script when component unmounts
    return () => {
      const existingScript = document.querySelector('script[src*="userway.org/widget.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // This component doesn't render anything visible
  // UserWay creates its own floating widget UI
  return null;
}