import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"
import { Clock, AlertCircle, Calendar } from "lucide-react";

const comingSoonBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 shadow-sm border backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200 hover:from-orange-100 hover:to-amber-100",
        subtle:
          "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-150",
        warning:
          "bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 border-yellow-200 hover:from-yellow-100 hover:to-orange-100",
        info:
          "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 hover:from-blue-100 hover:to-indigo-100",
        purple:
          "bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 border-purple-200 hover:from-purple-100 hover:to-violet-100",
      },
      size: {
        sm: "px-2 py-1 text-xs gap-1",
        md: "px-3 py-1.5 text-xs gap-1.5",
        lg: "px-4 py-2 text-sm gap-2",
      },
      showIcon: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      showIcon: true,
    },
  }
);

const ComingSoonBadge = React.forwardRef(({
  className,
  variant = "default",
  size = "md",
  showIcon = true,
  icon: IconComponent = Clock,
  text = "בקרוב",
  ...props
}, ref) => {
  return (
    <div
      className={cn(comingSoonBadgeVariants({ variant, size, showIcon }), className)}
      ref={ref}
      {...props}
    >
      {showIcon && IconComponent && <IconComponent className="w-3 h-3 flex-shrink-0" />}
      <span className="whitespace-nowrap">{text}</span>
    </div>
  );
});

ComingSoonBadge.displayName = "ComingSoonBadge";

// Preset configurations for common use cases
const ComingSoonVariants = {
  // Standard coming soon with clock icon
  default: (props) => <ComingSoonBadge variant="default" icon={Clock} text="בקרוב" {...props} />,

  // Subtle gray version for minimal design
  subtle: (props) => <ComingSoonBadge variant="subtle" icon={Clock} text="בקרוב" {...props} />,

  // Warning style for important missing features
  important: (props) => <ComingSoonBadge variant="warning" icon={AlertCircle} text="בפיתוח" {...props} />,

  // Info style for planned features
  planned: (props) => <ComingSoonBadge variant="info" icon={Calendar} text="מתוכנן" {...props} />,

  // Purple style for premium/special features
  premium: (props) => <ComingSoonBadge variant="purple" icon={Clock} text="בקרוב" {...props} />,

  // Small version for compact layouts
  compact: (props) => <ComingSoonBadge size="sm" variant="default" icon={Clock} text="בקרוב" {...props} />,

  // Icon only version for very constrained spaces
  iconOnly: (props) => <ComingSoonBadge size="sm" variant="default" icon={Clock} text="" showIcon={true} {...props} />,

  // No icon version for text-only display
  textOnly: (props) => <ComingSoonBadge variant="default" showIcon={false} text="בקרוב" {...props} />,
};

export { ComingSoonBadge, comingSoonBadgeVariants, ComingSoonVariants };