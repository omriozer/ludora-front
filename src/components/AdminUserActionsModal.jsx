import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiBase } from '@/utils/api.js';
import { toast } from '@/components/ui/use-toast';
import {
  Crown,
  UserCheck,
  Eye,
  Loader2,
  Settings,
  RotateCcw,
  User as UserIcon,
  GraduationCap,
  Users,
  Calendar,
  Mail,
  Phone,
} from 'lucide-react';

export default function AdminUserActionsModal({
  user,
  currentUser,
  isOpen,
  onClose,
  onRoleChange,
  onUserTypeChange,
  onManageSubscription,
  onImpersonate,
  onResetOnboarding,
  onHardResetOnboarding,
  impersonationLoading,
  getRoleText,
  getUserTypeText,
  getRoleBadgeColor,
  getUserTypeBadgeColor,
  getSubscriptionPlanName,
  getSubscriptionStatusText,
  getSubscriptionStatusColor,
}) {
  const [localRole, setLocalRole] = useState(user.role);
  const [localUserType, setLocalUserType] = useState(user.user_type || 'none');

  const handleRoleChange = (newRole) => {
    setLocalRole(newRole);
    onRoleChange(user.id, newRole);
  };

  const handleUserTypeChange = (newUserType) => {
    setLocalUserType(newUserType);
    onUserTypeChange(user.id, newUserType);
  };

  const formatDate = (dateString) => {
    if (!dateString || isNaN(new Date(dateString))) return 'לא ידוע';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            פעולות משתמש - {user.display_name || user.full_name}
          </DialogTitle>
          <DialogDescription>
            נהל הגדרות ופעולות עבור המשתמש הנבחר
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              פרטי משתמש
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>הצטרף ב-{formatDate(user.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getRoleBadgeColor(user.role)}>
                  {getRoleText(user.role)}
                </Badge>
                {user.user_type && (
                  <Badge className={getUserTypeBadgeColor(user.user_type)}>
                    {getUserTypeText(user.user_type)}
                  </Badge>
                )}
                {user.id === currentUser?.id && (
                  <Badge variant="outline" className="text-xs">
                    אתה
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Subscription Info Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-blue-600" />
              מידע מנוי
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">תוכנית:</span>
                <span>{getSubscriptionPlanName(user.current_subscription_plan_id)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">סטטוס:</span>
                <Badge className={getSubscriptionStatusColor(user.subscription_status || 'free_plan')}>
                  {getSubscriptionStatusText(user.subscription_status || 'free_plan')}
                </Badge>
              </div>
              {user.subscription_end_date && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">תוקף עד:</span>
                  <span>{formatDate(user.subscription_end_date)}</span>
                </div>
              )}
              {user.pending_subscription_plan_id && (
                <div className="flex items-center gap-2 text-orange-600">
                  <span className="font-medium">מנוי ממתין:</span>
                  <span>{getSubscriptionPlanName(user.pending_subscription_plan_id)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Role and Type Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">תפקיד במערכת</label>
              <Select value={localRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {user.id !== currentUser?.id && <SelectItem value="user">משתמש</SelectItem>}
                  <SelectItem value="admin">מנהל</SelectItem>
                  <SelectItem value="sysadmin">נאמן מערכת</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">סוג משתמש</label>
              <Select value={localUserType} onValueChange={handleUserTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא סיווג</SelectItem>
                  <SelectItem value="teacher">מורה</SelectItem>
                  <SelectItem value="student">תלמיד</SelectItem>
                  <SelectItem value="parent">הורה</SelectItem>
                  <SelectItem value="headmaster">מנהל בית ספר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-medium text-sm text-gray-700">פעולות מהירות</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Subscription Management */}
              <Button
                variant="outline"
                onClick={() => {
                  onManageSubscription(user);
                  onClose();
                }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
              >
                <Crown className="w-4 h-4" />
                ניהול מנוי
              </Button>

              {/* Impersonate User */}
              <Button
                variant="outline"
                onClick={() => {
                  onImpersonate(user);
                  onClose();
                }}
                disabled={impersonationLoading === user.id || user.id === currentUser?.id}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
              >
                {impersonationLoading === user.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    מתחבר...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    התחבר בתור
                  </>
                )}
              </Button>

              {/* Soft Reset Onboarding */}
              <Button
                variant="outline"
                onClick={() => {
                  onResetOnboarding(user);
                  onClose();
                }}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
              >
                <RotateCcw className="w-4 h-4" />
                איפוס הכנה (רך)
              </Button>

              {/* Hard Reset Onboarding */}
              <Button
                variant="outline"
                onClick={() => {
                  onHardResetOnboarding(user);
                  onClose();
                }}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <RotateCcw className="w-4 h-4" />
                איפוס הכנה (קשה)
              </Button>

              {/* View Details (placeholder) */}
              <Button
                variant="outline"
                onClick={() => {
                  // Future: Navigate to user details page
                  onClose();
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                צפה בפרטים
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}