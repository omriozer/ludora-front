import * as React from "react";
import { cva } from "class-variance-authority";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

// Toast positioning variants
const toastPositionVariants = {
  'top-left': 'fixed top-4 left-4 z-[100] flex flex-col gap-2 max-w-[420px]',
  'top-center': 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 max-w-[420px]',
  'top-right': 'fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[420px]',
  'center-left': 'fixed top-1/2 left-4 -translate-y-1/2 z-[100] flex flex-col gap-2 max-w-[420px]',
  'center': 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2 max-w-[420px]',
  'center-right': 'fixed top-1/2 right-4 -translate-y-1/2 z-[100] flex flex-col gap-2 max-w-[420px]',
  'bottom-left': 'fixed bottom-4 left-4 z-[100] flex flex-col-reverse gap-2 max-w-[420px]',
  'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse gap-2 max-w-[420px]',
  'bottom-right': 'fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-[420px]'
};

// Toast variants with colors and styles
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center space-x-2 space-x-reverse overflow-hidden rounded-lg border p-4 pl-12 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=open]:sm:slide-in-from-bottom-2 data-[state=closed]:slide-out-to-right-full",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        success: "bg-green-50 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-50 dark:border-green-800",
        error: "bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-50 dark:border-red-800",
        warning: "bg-orange-50 text-orange-900 border-orange-200 dark:bg-orange-950 dark:text-orange-50 dark:border-orange-800",
        info: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-50 dark:border-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Icon mapping for variants
const variantIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: null
};

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  const IconComponent = variantIcons[variant];

  return (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      dir="rtl"
      {...props}
    >
      {IconComponent && (
        <div className="flex-shrink-0 ml-3">
          <IconComponent className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1">
        {props.children}
      </div>
    </div>
  );
});
Toast.displayName = "Toast";

const ToastClose = React.forwardRef(({ className, onClick, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick?.(e);
    }}
    className={cn(
      "absolute left-2 top-2 z-10 rounded-md p-1 text-foreground/70 opacity-100 transition-all hover:text-foreground hover:bg-background/80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      className
    )}
    aria-label="סגור הודעה"
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90 mt-1", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

// Enhanced Toaster component that handles positioning
export function EnhancedToaster() {
  const { toasts, dismiss } = useToast();

  // Group toasts by position
  const toastsByPosition = toasts.reduce((acc, toast) => {
    const position = toast.position || 'bottom-right';
    if (!acc[position]) acc[position] = [];
    acc[position].push(toast);
    return acc;
  }, {});

  return (
    <>
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <div
          key={position}
          className={toastPositionVariants[position]}
        >
          {positionToasts.map(function ({ id, title, description, action, variant, ...props }) {
            return (
              <Toast key={id} variant={variant} {...props}>
                <ToastClose onClick={() => dismiss(id)} />
                <div className="grid gap-1 flex-1">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && (
                    <ToastDescription>{description}</ToastDescription>
                  )}
                </div>
                {action}
              </Toast>
            );
          })}
        </div>
      ))}
    </>
  );
}

// Export individual components for advanced usage
export {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
};