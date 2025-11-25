import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Play } from 'lucide-react';

/**
 * Course Access Button - Handles course access for users with access
 * @param {Object} product - Product object (should be a course)
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size
 * @param {boolean} fullWidth - Whether button should be full width
 * @param {function} onCourseAccess - Callback when course is accessed
 */
export default function CourseAccessButton({
  product,
  className = '',
  size = 'lg',
  fullWidth = false,
  onCourseAccess
}) {
  const navigate = useNavigate();

  // Parent ProductActionBar already determined access and product type
  // This component is only rendered for courses when user has access

  const handleCourseAccess = () => {
    if (onCourseAccess) {
      onCourseAccess(product);
    } else {
      // Default behavior - navigate to course viewer
      navigate(`/course?course=${product.entity_id || product.id}`);
    }
  };

  // Check if user has accessed the course before
  const isFirstTime = !product.purchase?.first_accessed_at;
  const buttonText = isFirstTime ? 'התחל קורס' : 'המשך קורס';
  const icon = isFirstTime ? BookOpen : Play;
  const IconComponent = icon;

  return (
    <Button
      onClick={handleCourseAccess}
      className={`group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-green-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
      size={size}
    >
      <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-300" />
        <span>{buttonText}</span>
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
    </Button>
  );
}