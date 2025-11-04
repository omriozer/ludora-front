import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useProductAccess } from '@/hooks/useProductAccess';

/**
 * Lesson Plan Access Button - Handles lesson plan presentation viewing for users with access
 * @param {Object} product - Product object (should be a lesson plan)
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size
 * @param {boolean} fullWidth - Whether button should be full width
 * @param {function} onLessonPlanAccess - Callback when lesson plan is accessed
 */
export default function LessonPlanAccessButton({
  product,
  className = '',
  size = 'lg',
  fullWidth = false,
  onLessonPlanAccess
}) {
  const [isAccessing, setIsAccessing] = useState(false);
  const navigate = useNavigate();

  const { hasAccess, productType } = useProductAccess(product);

  // Only render for lesson plans when user has access
  if (!hasAccess || productType !== 'lesson_plan') {
    return null;
  }

  const handleLessonPlanAccess = async (e) => {
    e.stopPropagation(); // Prevent event bubbling to parent card

    if (!product.id) return;

    setIsAccessing(true);

    try {
      if (onLessonPlanAccess) {
        // Use custom lesson plan access handler
        await onLessonPlanAccess(product);
      } else {
        // Default lesson plan access behavior - navigate to presentation viewer
        navigate(`/lesson-plan-presentation?id=${product.entity_id || product.id}`);
      }
    } catch (error) {
      console.error('Error accessing lesson plan:', error);
    } finally {
      setIsAccessing(false);
    }
  };

  return (
    <Button
      onClick={handleLessonPlanAccess}
      disabled={isAccessing}
      className={`group relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-indigo-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
      size={size}
    >
      <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
        <Play className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-300" />
        <span>הפעלת פרזנטציה</span>
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
    </Button>
  );
}