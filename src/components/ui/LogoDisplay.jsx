import React from 'react';
import { GraduationCap } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { BRANDING_KEYS, CONTACT_INFO_KEYS, getSetting } from '@/constants/settings';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * Centralized logo display component
 * Handles all logo rendering with consistent fallback logic
 */
const LogoDisplay = ({
  size = "regular",
  className = "",
  alt,
  ...props
}) => {
  const { settings } = useUser();

  // Use provided alt text, fallback to settings site name, or default
  const logoAlt = alt || getSetting(settings, CONTACT_INFO_KEYS.SITE_NAME, "לודורה");

  // Determine which logo path to use based on size prop (served from public folder)
  const logoPath = size === "small"
    ? "/logo_sm.svg"
    : "/logo.svg";

  // Always try to show image first - prioritize settings logo, then static logo
  const imageSrc = getSetting(settings, BRANDING_KEYS.LOGO_URL) || logoPath;

  if (imageSrc) {
    // Determine logo dimensions based on size prop
    const dimensions = size === "small"
      ? { width: 32, height: 32, sizes: "32px" }
      : { width: 48, height: 48, sizes: "48px" };

    return (
      <OptimizedImage
        src={imageSrc}
        alt={logoAlt}
        className={className}
        width={dimensions.width}
        height={dimensions.height}
        sizes={dimensions.sizes}
        {...props}
      />
    );
  }

  // Fallback to icon with site name for regular size
  if (size === "regular") {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`} {...props}>
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900 hidden sm:block">
          {logoAlt}
        </span>
      </div>
    );
  }

  // Fallback to icon only for small size
  return (
    <div className={`w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center ${className}`} {...props}>
      <GraduationCap className="w-7 h-7 text-white" />
    </div>
  );
};

export default LogoDisplay;