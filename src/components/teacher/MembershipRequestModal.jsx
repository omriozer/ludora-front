import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  User,
  GraduationCap,
  Calendar,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  Mail
} from 'lucide-react';
import ApprovalActionButtons from './ApprovalActionButtons';

/**
 * MembershipRequestModal - Detailed view of a membership request
 *
 * Shows complete request details including:
 * - Student information
 * - Classroom information
 * - Request message
 * - Request date
 * - Current status
 * - Approval/denial actions (if pending)
 *
 * @param {boolean} isOpen - Modal open state
 * @param {Function} onClose - Close handler
 * @param {Object} request - Membership request object
 * @param {Function} onApprove - Approve callback (receives message)
 * @param {Function} onDeny - Deny callback (receives message)
 */
export default function MembershipRequestModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onDeny
}) {
  if (!request) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'לא זמין';
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        label: 'ממתין לאישור',
        variant: 'default',
        icon: Clock,
        color: 'bg-orange-100 text-orange-800 border-orange-200'
      },
      approved: {
        label: 'אושר',
        variant: 'default',
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800 border-green-200'
      },
      denied: {
        label: 'נדחה',
        variant: 'destructive',
        icon: XCircle,
        color: 'bg-red-100 text-red-800 border-red-200'
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color + ' border'}>
        <Icon className="w-4 h-4 ml-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            פרטי בקשת הצטרפות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">סטטוס בקשה:</span>
            {getStatusBadge(request.status)}
          </div>

          {/* Student Information */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                מידע על התלמיד
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {request.student?.display_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900">
                      {request.student?.display_name || 'שם לא זמין'}
                    </div>
                    <div className="text-sm text-blue-700">
                      מזהה: {request.student_id}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Classroom Information */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                כיתה מבוקשת
              </h3>
              <div className="space-y-2">
                <div>
                  <div className="font-semibold text-green-900">
                    {request.classroom?.name || 'שם כיתה לא זמין'}
                  </div>
                  <div className="text-sm text-green-700">
                    מזהה כיתה: {request.classroom_id}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Message */}
          {request.request_message && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  הודעת התלמיד
                </h3>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {request.request_message}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Request Date */}
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">תאריך הבקשה:</span>
                </div>
                <span className="text-gray-900 font-medium">
                  {formatDate(request.requested_at)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Processing Information */}
          {request.status !== 'pending' && (
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  מידע על עיבוד הבקשה
                </h3>
                <div className="space-y-2 text-sm">
                  {request.approved_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">תאריך עיבוד:</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(request.approved_at)}
                      </span>
                    </div>
                  )}
                  {request.approval_message && (
                    <div className="mt-3">
                      <div className="text-gray-600 mb-1">הודעת המורה:</div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {request.approval_message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parent Consent Notice */}
          {request.status === 'pending' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">אישור הורי אוטומטי</p>
                    <p>
                      אישור הבקשה ייצור אוטומטית רשומת אישור הורי (Parent Consent)
                      עבור התלמיד. זה נדרש לציות לחוקי הפרטיות של ישראל עבור תלמידים מתחת לגיל 18.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons (only for pending requests) */}
          {request.status === 'pending' && (
            <div className="pt-4 border-t border-gray-200">
              <ApprovalActionButtons
                membershipId={request.id}
                onApprove={onApprove}
                onDeny={onDeny}
                inline={false}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
