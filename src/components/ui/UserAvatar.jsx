import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "@/lib/utils";

/**
 * Get user initials from name, with Hebrew/English support
 * @param {string} fullName - Full name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Two-letter initials
 */
function getUserInitials(fullName, firstName, lastName) {
  // Try using firstName and lastName first
  if (firstName && lastName) {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }

  // Fall back to first and last word of full name
  if (fullName && fullName.trim()) {
    const names = fullName.trim().split(/\s+/);
    if (names.length === 1) {
      // Single name - use first two characters
      return names[0].substring(0, 2).toUpperCase();
    } else {
      // Multiple names - use first char of first and last name
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
  }

  // Default fallback
  return "?";
}

/**
 * Get user display name with fallback hierarchy
 * @param {string} fullName - Full name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @param {string} email - Email address
 * @returns {string} Display name for accessibility
 */
function getUserDisplayName(fullName, firstName, lastName, email) {
  if (fullName && fullName.trim()) {
    return fullName.trim();
  }

  if (firstName && lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  if (firstName) {
    return firstName;
  }

  if (email) {
    return email.split('@')[0];
  }

  return "משתמש";
}

/**
 * UserAvatar Component
 *
 * Displays user profile image with Hebrew/English name support and fallback to initials
 *
 * @param {Object} props
 * @param {Object} props.user - User object with profile data
 * @param {string} props.user.full_name - User's full name
 * @param {string} props.user.first_name - User's first name
 * @param {string} props.user.last_name - User's last name
 * @param {string} props.user.profile_image_url - User's profile image URL
 * @param {string} props.user.email - User's email address
 * @param {string} props.size - Size variant: 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showTooltip - Whether to show name tooltip on hover
 * @param {function} props.onClick - Click handler
 */
export default function UserAvatar({
  user = {},
  size = "md",
  className = "",
  showTooltip = false,
  onClick,
  ...props
}) {
  const {
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    profile_image_url: profileImageUrl,
    email
  } = user;

  // Generate initials and display name
  const initials = getUserInitials(fullName, firstName, lastName);
  const displayName = getUserDisplayName(fullName, firstName, lastName, email);

  // Size classes for different avatar sizes
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg"
  };

  // Get tooltip attributes
  const tooltipAttributes = showTooltip ? {
    title: displayName,
    'aria-label': `תמונת פרופיל של ${displayName}`
  } : {
    'aria-label': `תמונת פרופיל של ${displayName}`
  };

  // Handle click events
  const handleClick = onClick ? (e) => {
    e.preventDefault();
    onClick(user, e);
  } : undefined;

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={handleClick}
      {...tooltipAttributes}
      {...props}
    >
      {profileImageUrl && (
        <AvatarImage
          src={profileImageUrl}
          alt={`תמונת פרופיל של ${displayName}`}
          onError={(e) => {
            // If image fails to load, hide it to show fallback
            e.target.style.display = 'none';
          }}
        />
      )}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold",
          "flex items-center justify-center select-none"
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * UserAvatarGroup Component
 *
 * Displays multiple user avatars in a group with optional overflow count
 *
 * @param {Object} props
 * @param {Array} props.users - Array of user objects
 * @param {number} props.maxVisible - Maximum number of avatars to show before overflow
 * @param {string} props.size - Size for all avatars
 * @param {string} props.className - Additional CSS classes
 */
export function UserAvatarGroup({
  users = [],
  maxVisible = 3,
  size = "sm",
  className = "",
  ...props
}) {
  const visibleUsers = users.slice(0, maxVisible);
  const overflowCount = users.length - maxVisible;

  return (
    <div className={cn("flex -space-x-2", className)} {...props}>
      {visibleUsers.map((user, index) => (
        <UserAvatar
          key={user.id || index}
          user={user}
          size={size}
          className="ring-2 ring-white"
          showTooltip={true}
        />
      ))}
      {overflowCount > 0 && (
        <div className={cn(
          "flex items-center justify-center bg-gray-100 text-gray-600 font-medium ring-2 ring-white rounded-full",
          size === "sm" ? "h-8 w-8 text-xs" :
          size === "md" ? "h-10 w-10 text-sm" :
          size === "lg" ? "h-12 w-12 text-base" :
          "h-16 w-16 text-lg"
        )}>
          +{overflowCount}
        </div>
      )}
    </div>
  );
}