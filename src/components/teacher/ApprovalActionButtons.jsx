import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

/**
 * ApprovalActionButtons - Approve/Deny buttons with optional message input
 *
 * Provides inline approve/deny actions with confirmation dialogs and optional
 * teacher response messages.
 *
 * @param {string} membershipId - ID of the membership request
 * @param {Function} onApprove - Callback when approved (receives message)
 * @param {Function} onDeny - Callback when denied (receives message)
 * @param {boolean} inline - Show as inline buttons vs dialog (default: true)
 */
export default function ApprovalActionButtons({
  membershipId,
  onApprove,
  onDeny,
  inline = true
}) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [denyMessage, setDenyMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(approvalMessage);
      setShowApproveDialog(false);
      setApprovalMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    setIsProcessing(true);
    try {
      await onDeny(denyMessage);
      setShowDenyDialog(false);
      setDenyMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  if (inline) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowApproveDialog(true)}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="w-4 h-4 ml-1" />
            אשר
          </Button>
          <Button
            onClick={() => setShowDenyDialog(true)}
            size="sm"
            variant="destructive"
          >
            <XCircle className="w-4 h-4 ml-1" />
            דחה
          </Button>
        </div>

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                אישור בקשת הצטרפות
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-gray-600">
                האם אתה בטוח שברצונך לאשר את בקשת ההצטרפות לכיתה?
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>שים לב:</strong> אישור הבקשה יוסיף את התלמיד לכיתה וייצור אישור הורי אוטומטי.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-message">הודעה לתלמיד (אופציונלי)</Label>
                <Textarea
                  id="approval-message"
                  value={approvalMessage}
                  onChange={(e) => setApprovalMessage(e.target.value)}
                  placeholder="ברוך הבא לכיתה! אנחנו שמחים שהצטרפת..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  הודעה זו תשלח לתלמיד יחד עם אישור ההצטרפות
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  setShowApproveDialog(false);
                  setApprovalMessage('');
                }}
                variant="outline"
                disabled={isProcessing}
              >
                ביטול
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מאשר...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 ml-2" />
                    אשר הצטרפות
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deny Dialog */}
        <Dialog open={showDenyDialog} onOpenChange={setShowDenyDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                דחיית בקשת הצטרפות
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-gray-600">
                האם אתה בטוח שברצונך לדחות את בקשת ההצטרפות לכיתה?
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-900">
                  <strong>שים לב:</strong> דחיית הבקשה תמנע מהתלמיד להצטרף לכיתה.
                  התלמיד יקבל הודעה על הדחייה.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deny-message">סיבת דחייה (אופציונלי)</Label>
                <Textarea
                  id="deny-message"
                  value={denyMessage}
                  onChange={(e) => setDenyMessage(e.target.value)}
                  placeholder="הכיתה מלאה / אנא צור קשר למידע נוסף..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  הודעה זו תשלח לתלמיד יחד עם הודעת הדחייה
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  setShowDenyDialog(false);
                  setDenyMessage('');
                }}
                variant="outline"
                disabled={isProcessing}
              >
                ביטול
              </Button>
              <Button
                onClick={handleDeny}
                disabled={isProcessing}
                variant="destructive"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    דוחה...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 ml-2" />
                    דחה בקשה
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Non-inline version (for use in modals or standalone)
  return (
    <div className="flex items-center gap-3 justify-end">
      <Button
        onClick={() => setShowDenyDialog(true)}
        variant="outline"
        className="text-red-600 border-red-300 hover:bg-red-50"
      >
        <XCircle className="w-4 h-4 ml-2" />
        דחה בקשה
      </Button>
      <Button
        onClick={() => setShowApproveDialog(true)}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <CheckCircle className="w-4 h-4 ml-2" />
        אשר הצטרפות
      </Button>

      {/* Same dialogs as inline version */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              אישור בקשת הצטרפות
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-gray-600">
              האם אתה בטוח שברצונך לאשר את בקשת ההצטרפות לכיתה?
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>שים לב:</strong> אישור הבקשה יוסיף את התלמיד לכיתה וייצור אישור הורי אוטומטי.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approval-message-modal">הודעה לתלמיד (אופציונלי)</Label>
              <Textarea
                id="approval-message-modal"
                value={approvalMessage}
                onChange={(e) => setApprovalMessage(e.target.value)}
                placeholder="ברוך הבא לכיתה! אנחנו שמחים שהצטרפת..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowApproveDialog(false);
                setApprovalMessage('');
              }}
              variant="outline"
              disabled={isProcessing}
            >
              ביטול
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מאשר...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  אשר הצטרפות
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDenyDialog} onOpenChange={setShowDenyDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              דחיית בקשת הצטרפות
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-gray-600">
              האם אתה בטוח שברצונך לדחות את בקשת ההצטרפות לכיתה?
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">
                <strong>שים לב:</strong> דחיית הבקשה תמנע מהתלמיד להצטרף לכיתה.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deny-message-modal">סיבת דחייה (אופציונלי)</Label>
              <Textarea
                id="deny-message-modal"
                value={denyMessage}
                onChange={(e) => setDenyMessage(e.target.value)}
                placeholder="הכיתה מלאה / אנא צור קשר למידע נוסף..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowDenyDialog(false);
                setDenyMessage('');
              }}
              variant="outline"
              disabled={isProcessing}
            >
              ביטול
            </Button>
            <Button
              onClick={handleDeny}
              disabled={isProcessing}
              variant="destructive"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  דוחה...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 ml-2" />
                  דחה בקשה
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
