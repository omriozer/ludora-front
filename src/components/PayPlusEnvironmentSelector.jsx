import React from 'react';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield } from "lucide-react";

/**
 * PayPlusEnvironmentSelector - Reusable component for PayPlus environment selection
 * Only visible to admin/sysadmin users
 *
 * @param {Object} props
 * @param {string} props.value - Current selected environment ('production' or 'test')
 * @param {function} props.onChange - Callback function when environment changes
 * @param {Object} props.user - Current user object with role
 * @param {boolean} props.disabled - Whether the component is disabled
 * @param {string} props.className - Additional CSS classes
 */
export default function PayPlusEnvironmentSelector({
  value = 'production',
  onChange,
  user,
  disabled = false,
  className = ""
}) {
  // Only show to admin users
  if (!user || (user.role !== 'admin' && user.role !== 'sysadmin')) {
    return null;
  }

  return (
    <div className={`space-y-3 p-4 bg-orange-50 rounded-2xl border border-orange-200 ${className}`}>
      <Label className="text-sm font-medium text-orange-800 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        PayPlus Environment (Admin Only)
      </Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="space-y-2"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="production"
            id="prod-env"
            disabled={disabled}
          />
          <Label
            htmlFor="prod-env"
            className={`text-sm cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Production (Live payments)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="test"
            id="test-env"
            disabled={disabled}
          />
          <Label
            htmlFor="test-env"
            className={`text-sm cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Test/Staging (Test payments)
          </Label>
        </div>
      </RadioGroup>
      <div className="text-xs text-orange-600">
        {value === 'production'
          ? 'Real money transactions will be processed'
          : 'Test mode - no real money will be charged'
        }
      </div>
    </div>
  );
}