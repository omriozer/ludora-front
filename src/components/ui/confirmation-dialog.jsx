import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

export default function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "אישור", 
  cancelText = "ביטול", 
  variant = "warning" // warning, danger, info, success
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          confirmButtonClass: 'bg-green-600 hover:bg-green-700 text-white'
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      default: // warning
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          confirmButtonClass: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
    }
  };

  const styles = getVariantStyles();
  const IconComponent = styles.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-0" dir="rtl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className={`w-12 h-12 rounded-full ${styles.bgColor} ${styles.borderColor} border-2 flex items-center justify-center`}>
              <IconComponent className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
            <div className="text-gray-600 leading-relaxed whitespace-pre-line">
              {message}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6"
            >
              {cancelText}
            </Button>
            <Button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-6 ${styles.confirmButtonClass}`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}