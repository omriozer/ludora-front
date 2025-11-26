import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, Clock, CreditCard, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function NotificationBell({ currentUser }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [notificationEntityAvailable, setNotificationEntityAvailable] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef(null);

  // Add retry logic for notifications loading
  const loadNotificationsWithRetry = async (userEmail, retries = 2, delay = 1000) => {
    const { Notification } = await import('@/services/entities');
    
    for (let i = 0; i < retries; i++) {
      try {
        // Use find instead of filter
        return await Notification.find({ user_email: userEmail });
      } catch (error) {
        if (error.response?.status === 429 && i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw error; // Re-throw if not a 429 or if it's the last retry attempt
        }
      }
    }
    throw new Error("Failed to load notifications after multiple retries due to rate limiting.");
  };

  const loadNotifications = useCallback(async () => {
    if (!currentUser || !currentUser.email || !notificationEntityAvailable) {
      return;
    }
    
    setIsLoading(true);
    setHasError(false);
    
    try {
      // The import is still here to ensure Notification is loaded for other operations if needed,
      // but loadNotificationsWithRetry handles its own import to be self-contained.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { Notification } = await import('@/services/entities'); 
      
      // Test if the entity actually works by making a simple call with retry
      const userNotifications = await loadNotificationsWithRetry(currentUser.email);
      
      // Filter out expired notifications
      const now = new Date();
      const validNotifications = userNotifications.filter(notification => {
        if (!notification.expires_at) return true;
        return new Date(notification.expires_at) > now;
      });
      
      setNotifications(validNotifications);
      setUnreadCount(validNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setHasError(true);
      setNotificationEntityAvailable(false); // If there's an error, assume entity might not be fully functional or accessible
      // Don't throw error, just set empty state
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, notificationEntityAvailable]); // loadNotificationsWithRetry doesn't need to be in deps as it's defined outside and doesn't depend on state/props

  const checkNotificationEntity = useCallback(async () => {
    try {
      // Try to import the entities and check if Notification exists
      const entities = await import('@/services/entities');
      if (entities.Notification) {
        setNotificationEntityAvailable(true);
        loadNotifications();
        // Check for notifications every 30 seconds
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
      } else {
        setNotificationEntityAvailable(false);
      }
    } catch (error) {
      // This is expected when notification entity is not available - use clog for debugging
import { ludlog, luderror } from '@/lib/ludlog';
        ludlog.ui('Notification entity not available:', { data: error });
      });
      setNotificationEntityAvailable(false);
      setHasError(true);
    }
  }, [loadNotifications]);

  useEffect(() => {
    if (currentUser && currentUser.email) {
      checkNotificationEntity();
    }
  }, [currentUser, checkNotificationEntity]);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close dropdown when clicking outside (only for desktop)
  useEffect(() => {
    if (isMobile) return; // Don't handle outside clicks on mobile
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile]);

  // Prevent body scroll when mobile modal is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobile, isOpen]);

  const markAsRead = async (notificationId) => {
    if (!notificationEntityAvailable) return;
    
    try {
      const { Notification } = await import('@/services/entities');
      await Notification.update(notificationId, { is_read: true });
      loadNotifications(); // Refresh notifications
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!notificationEntityAvailable) return;
    
    try {
      const { Notification } = await import('@/services/entities');
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(n => Notification.update(n.id, { is_read: true }))
      );
      loadNotifications();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!notificationEntityAvailable) return;
    
    try {
      const { Notification } = await import('@/services/entities');
      await Notification.delete(notificationId);
      loadNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'pending_payment':
        return <CreditCard className="w-4 h-4 text-orange-500" />;
      case 'payment_failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'workshop_reminder':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  // Don't render if no user, no email, or notification entity not available
  if (!currentUser || !currentUser.email || !notificationEntityAvailable) {
    return null;
  }

  const NotificationContent = () => (
    <>
      <div className={`${isMobile ? 'p-6' : 'p-4'} border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <h3 className={`${isMobile ? 'text-2xl' : 'text-lg'} font-semibold`}>התראות</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size={isMobile ? "default" : "sm"}
                onClick={markAllAsRead}
                className="text-blue-600 hover:text-blue-800 text-xs"
              >
                סמן הכל כנקרא
              </Button>
            )}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <div className={`${isMobile ? 'flex-1' : 'max-h-96'} overflow-y-auto`}>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">טוען התראות...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`${isMobile ? 'p-6' : 'p-3'} hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`${isMobile ? 'text-base' : 'text-sm'} font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'} text-gray-400 hover:text-gray-600`}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <X className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                      </Button>
                    </div>
                    <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-600 mt-1 line-clamp-2`}>
                      {notification.message}
                    </p>
                    <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-400 mt-1`}>
                      {format(new Date(notification.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className={`${isMobile ? 'w-16 h-16' : 'w-12 h-12'} text-gray-300 mx-auto mb-2`} />
            <p className={`${isMobile ? 'text-base' : 'text-sm'}`}>אין התראות חדשות</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        <Badge 
          variant={unreadCount > 0 ? "destructive" : "secondary"}
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      </Button>

      {isOpen && (
        <>
          {isMobile ? (
            // Mobile: Full-screen modal
            <div className="fixed inset-0 z-50 bg-white flex flex-col" dir="rtl">
              <NotificationContent />
            </div>
          ) : (
            // Desktop: Dropdown
            <div 
              className="absolute z-50 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 w-80 max-w-[90vw] left-1/2 transform -translate-x-1/2 lg:left-0 lg:transform-none lg:w-80" 
              dir="rtl"
            >
              <NotificationContent />
            </div>
          )}
        </>
      )}
    </div>
  );
}
