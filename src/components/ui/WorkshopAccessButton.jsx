import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Play, Video } from 'lucide-react';
import { useProductAccess } from '@/hooks/useProductAccess';

/**
 * Workshop Access Button - Handles workshop access for users with access
 * @param {Object} product - Product object (should be a workshop)
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size
 * @param {boolean} fullWidth - Whether button should be full width
 * @param {function} onWorkshopAccess - Callback when workshop is accessed
 */
export default function WorkshopAccessButton({
  product,
  className = '',
  size = 'lg',
  fullWidth = false,
  onWorkshopAccess
}) {
  const navigate = useNavigate();
  const { hasAccess, productType } = useProductAccess(product);

  // Only render for workshops when user has access
  if (!hasAccess || productType !== 'workshop') {
    return null;
  }

  const handleWorkshopAccess = () => {
    if (onWorkshopAccess) {
      onWorkshopAccess(product);
    } else {
      // Default behavior - determine action based on workshop type and timing
      const now = new Date();
      const scheduledDate = product.scheduled_date ? new Date(product.scheduled_date) : null;
      const isLive = scheduledDate && scheduledDate > now;

      if (isLive && product.zoom_link) {
        // Live workshop - open Zoom link
        window.open(product.zoom_link, '_blank');
      } else if (product.recording_url || product.video_file_url) {
        // Recorded workshop - navigate to video viewer
        navigate(`/video?workshop=${product.entity_id || product.id}`);
      } else {
        // Fallback - navigate to workshop details
        navigate(`/product-details?type=workshop&id=${product.entity_id || product.id}`);
      }
    }
  };

  // Determine button text and icon based on workshop state
  const now = new Date();
  const scheduledDate = product.scheduled_date ? new Date(product.scheduled_date) : null;
  const isLive = scheduledDate && scheduledDate > now;
  const hasRecording = product.recording_url || product.video_file_url;

  let buttonText, IconComponent;

  if (isLive) {
    buttonText = 'הצטרף לסדנה';
    IconComponent = Users;
  } else if (hasRecording) {
    buttonText = 'צפה בהקלטה';
    IconComponent = Play;
  } else {
    buttonText = 'כניסה לסדנה';
    IconComponent = Video;
  }

  return (
    <Button
      onClick={handleWorkshopAccess}
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