import { Clock, CheckCircle2, XCircle, UserX } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * Status configuration with colors and icons
 * Using Student Portal design system for consistent visual language
 */
const STATUS_CONFIG = {
  pending: {
    label: 'ממתין לאישור',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    icon: Clock,
    description: 'המורה עדיין לא אישר את הבקשה'
  },
  active: {
    label: 'חבר בכיתה',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    icon: CheckCircle2,
    description: 'חבר פעיל בכיתה'
  },
  denied: {
    label: 'נדחה',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300',
    icon: XCircle,
    description: 'המורה דחה את הבקשה'
  },
  inactive: {
    label: 'לא פעיל',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    icon: UserX,
    description: 'החברות הושבתה'
  }
};

/**
 * MembershipStatusBadge Component
 * Visual indicator for classroom membership status
 * Shows status with color-coded badges using Student Portal colors
 */
const MembershipStatusBadge = ({
  status,
  variant = 'default',
  showIcon = true,
  showTooltip = false,
  className = ''
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  const StatusIcon = config.icon;

  // Small variant - compact display
  if (variant === 'small') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color} ${config.border} border whitespace-nowrap ${className}`}
        title={showTooltip ? config.description : undefined}
      >
        {showIcon && <StatusIcon className="w-3 h-3 flex-shrink-0" />}
        <span>{config.label}</span>
      </span>
    );
  }

  // Large variant - detailed display with description
  if (variant === 'large') {
    return (
      <div className={`mobile-safe-card ${config.bg} ${config.border} border-2 rounded-xl p-4 ${className}`}>
        <div className="mobile-safe-flex items-center gap-3">
          <div className={`${config.bg} p-3 rounded-lg flex-shrink-0 ring-2 ${config.border}`}>
            <StatusIcon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-bold ${config.color} mobile-safe-text text-lg`}>
              {config.label}
            </div>
            <p className="text-sm text-gray-600 mobile-safe-text">
              {config.description}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default variant - standard badge
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg} ${config.border} border-2 ${className}`}
      title={showTooltip ? config.description : undefined}
    >
      {showIcon && (
        <StatusIcon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
      )}
      <span className={`font-semibold ${config.color} text-sm whitespace-nowrap`}>
        {config.label}
      </span>
    </div>
  );
};

MembershipStatusBadge.propTypes = {
  status: PropTypes.oneOf(['pending', 'active', 'denied', 'inactive']).isRequired,
  variant: PropTypes.oneOf(['default', 'small', 'large']),
  showIcon: PropTypes.bool,
  showTooltip: PropTypes.bool,
  className: PropTypes.string
};

export default MembershipStatusBadge;
