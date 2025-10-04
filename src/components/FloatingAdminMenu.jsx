import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Settings } from "@/services/entities";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import {
  Crown,
  Settings as SettingsIcon, // Renamed to avoid conflict with Settings entity
  Users,
  Play,
  FileText,
  Mail,
  ShoppingCart,
  Calendar,
  BarChart3,
  Palette,
  Shield,
  Code,
  Volume2,
  X,
  Grid3X3,
  Layers,
  Move,
  CreditCard,
  MessageSquare, // Added from outline
  Monitor,       // Added from outline
  Gamepad2,      // Added from outline
  Wrench,        // Added from outline
  Tag,           // Added from outline
  ChevronRight,  // Added from outline
  Globe,         // Added from outline
  School,        // Added for school management feature
  HelpCircle     // Added for help system
} from "lucide-react";
import { showSuccess, showError } from '@/utils/messaging';

export default function FloatingAdminMenu({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [settings, setSettings] = useState(null); // State for global settings, including maintenance mode
  const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState(false); // State for loading indicator

  // Draggable functionality states
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragModeEnabled, setIsDragModeEnabled] = useState(false); // New drag mode state

  // Load settings for maintenance mode
  const loadSettings = useCallback(async () => {
    try {
      const settingsData = await Settings.find();
      if (settingsData.length > 0) {
        setSettings(settingsData[0]);
      }
    } catch (error) {
      console.error('Error loading settings for admin menu:', error);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      const hasAdminPrivileges = (currentUser.role === 'admin' || currentUser.role === 'sysadmin') && !currentUser._isImpersonated;
      setIsAdmin(hasAdminPrivileges);
      setIsImpersonating(currentUser._isImpersonated);
      
      // Load settings for maintenance mode if user is admin
      if (hasAdminPrivileges) {
        loadSettings();
      }
    }
  }, [currentUser, loadSettings]);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('adminMenuButtonPosition');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        setPosition(parsed);
      } catch (e) {
        // Use default position
      }
    }
  }, []);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('adminMenuButtonPosition', JSON.stringify(position));
  }, [position]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Mouse drag handlers - only work when drag mode is enabled
  const handleMouseDown = useCallback((e) => {
    if (!isDragModeEnabled) return; // Only allow drag when mode is enabled

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  }, [isDragModeEnabled]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !isDragModeEnabled) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Keep button within viewport bounds (assuming button is ~56px width/height)
    const buttonSize = 56;
    const maxX = window.innerWidth - buttonSize;
    const maxY = window.innerHeight - buttonSize;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragOffset, isDragModeEnabled]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Auto-disable drag mode after dragging
      setIsDragModeEnabled(false);
    }
  }, [isDragging]);

  // Touch drag handlers for mobile - only work when drag mode is enabled
  const handleTouchStart = useCallback((e) => {
    if (!isDragModeEnabled) return;

    const touch = e.touches[0];
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    e.preventDefault();
  }, [isDragModeEnabled]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !isDragModeEnabled) return;

    const touch = e.touches[0];
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;

    const buttonSize = 56;
    const maxX = window.innerWidth - buttonSize;
    const maxY = window.innerHeight - buttonSize;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
    e.preventDefault();
  }, [isDragging, dragOffset, isDragModeEnabled]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Auto-disable drag mode after dragging
      setIsDragModeEnabled(false);
    }
  }, [isDragging]);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle enabling drag mode
  const handleEnableDragMode = () => {
    setIsDragModeEnabled(true);
    setIsOpen(false); // Close menu when enabling drag mode
  };

  // Handle clicking the button when not in drag mode
  const handleButtonClick = (e) => {
    if (!isDragModeEnabled) {
      setIsOpen(true);
    }
    // If in drag mode, let the drag handlers take over
  };

  // Toggle maintenance mode
  const toggleMaintenanceMode = async () => {
    if (!settings) return;

    setIsUpdatingMaintenance(true);
    try {
      const newMaintenanceState = !settings.maintenance_mode;
      await Settings.update(settings.id, {
        ...settings,
        maintenance_mode: newMaintenanceState
      });

      setSettings({
        ...settings,
        maintenance_mode: newMaintenanceState
      });

      // Show confirmation
      showSuccess(newMaintenanceState ? 'מצב תחזוקה הופעל' : 'מצב תחזוקה בוטל');
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      showError('שגיאה בעדכון מצב תחזוקה');
    }
    setIsUpdatingMaintenance(false);
  };

  // Check if we're in production environment
  const isProduction = import.meta.env.PROD;



  if (!isAdmin) return null;

  const menuCategories = [
    {
      title: "ניהול תוכן",
      icon: <Layers className="w-5 h-5" />,
      color: "from-blue-500 to-indigo-600",
      items: [
        {
          title: `ניהול ${getProductTypeName('game', 'plural')}`,
          url: "/games",
          icon: <Play className="w-4 h-4" />,
          description: `יצירה ועריכה של ${getProductTypeName('game', 'plural')} דיגיטליים`
        },
        {
          title: "ניהול מוצרים",
          url: "/products?context=admin",
          icon: <FileText className="w-4 h-4" />,
          description: `${getProductTypeName('course', 'plural')}, ${getProductTypeName('workshop', 'plural')} ו${getProductTypeName('file', 'plural')}`
        },
        {
          title: "ניהול קטגוריות",
          url: "/categories",
          icon: <Grid3X3 className="w-4 h-4" />,
          description: `קטגוריות למוצרים ול${getProductTypeName('game', 'plural')}`
        },
        {
          title: `תכנים ל${getProductTypeName('game', 'plural')}`,
          url: "/game-content",
          icon: <FileText className="w-4 h-4" />,
          description: `מילים, תמונות ושאלות ל${getProductTypeName('game', 'plural')}`
        }
      ]
    },
    {
      title: "ניהול משתמשים ומכירות",
      icon: <Users className="w-5 h-5" />,
      color: "from-emerald-500 to-teal-600",
      items: [
        {
          title: "ניהול משתמשים",
          url: "/users",
          icon: <Users className="w-4 h-4" />,
          description: "משתמשים, הרשאות וחיקוי"
        },
        {
          title: "משתתפים",
          url: "/participants",
          icon: <Calendar className="w-4 h-4" />,
          description: `רשימת משתתפים ב${getProductTypeName('workshop', 'plural')}`
        },
        {
          title: "רכישות",
          url: "/purchases",
          icon: <ShoppingCart className="w-4 h-4" />,
          description: "ניהול רכישות ותשלומים"
        },
        {
          title: "ניהול בתי ספר",
          url: "/schools",
          icon: <School className="w-4 h-4" />,
          description: "ניהול רשימת בתי הספר במערכת"
        }
      ]
    },
    {
      title: "תקשורת ואוטומציה",
      icon: <Mail className="w-5 h-5" />,
      color: "from-purple-500 to-pink-600",
      items: [
        {
          title: "אוטומציית מיילים",
          url: "/automations",
          icon: <Mail className="w-4 h-4" />,
          description: "תבניות מיילים ואוטומציות"
        },
        {
          title: "הודעות תמיכה",
          url: "/support",
          icon: <Shield className="w-4 h-4" />,
          description: "פניות משתמשים ותמיכה"
        },
        {
          title: "צ'אט AI",
          url: "/chat",
          icon: <BarChart3 className="w-4 h-4" />,
          description: "עוזר AI למנהלים"
        }
      ]
    },
    {
      title: "הגדרות מערכת",
      icon: <Shield className="w-5 h-5" />,
      color: "from-orange-500 to-red-600",
      items: [
        { 
          title: "הגדרות מנויים", 
          url: "/subscriptions", 
          icon: <CreditCard className="w-4 h-4" />,
          description: "ניהול תוכניות מנוי ותמחור"
        },
        { 
          title: "הגדרות מותג", 
          url: "/brand", 
          icon: <Palette className="w-4 h-4" />,
          description: "לוגו, שם האתר וצבעים"
        },
        { 
          title: "בקרת תכונות", 
          url: "/features", 
          icon: <Shield className="w-4 h-4" />,
          description: "הגדרות נווט ותצוגה"
        },
        { 
          title: "הגדרות מוצרים", 
          url: "/product-settings", 
          icon: <SettingsIcon className="w-4 h-4" />, // Changed to SettingsIcon
          description: "ברירות מחדל למוצרים"
        },
        { 
          title: "ניהול צלילים", 
          url: "/audio", 
          icon: <Volume2 className="w-4 h-4" />,
          description: `צלילים ברקע ל${getProductTypeName('game', 'plural')}`
        }
      ]
    },
    {
      title: "כלי פיתוח",
      icon: <Code className="w-5 h-5" />,
      color: "from-gray-600 to-slate-700",
      items: [
        {
          title: "טקסטים באתר",
          url: "/texts",
          icon: <FileText className="w-4 h-4" />,
          description: "עריכת טקסטים דינמיים"
        },
        {
          title: "כלי פיתוח",
          url: "/dev-tools",
          icon: <Code className="w-4 h-4" />,
          description: "ניקוי וכלי מתקדמים"
        }
      ]
    }
  ];

  return (
    <>
      {/* Floating Admin Button */}
      <div
        className={`fixed z-[9998] ${isDragModeEnabled ? 'cursor-grab' : 'cursor-pointer'} select-none transition-all duration-200`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: isDragModeEnabled ? 'none' : 'auto'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleButtonClick}
      >
        <div
          className={`
            w-14 h-14 rounded-full shadow-2xl border-4 border-white
            flex items-center justify-center transition-all duration-300 transform hover:scale-105
            ${isDragModeEnabled
              ? 'bg-gradient-to-r from-orange-500 to-red-500 animate-pulse'
              : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800'
            }
          `}
        >
          {isDragModeEnabled ? (
            <Move className="w-6 h-6 text-white" />
          ) : (
            <Crown className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Drag Mode Tooltip */}
        {isDragModeEnabled && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
            גרור כדי להזיז
          </div>
        )}
      </div>

      {/* Full Screen Overlay Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
              <div className="flex items-center justify-between p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">לוח בקרה למנהלים</h2>
                    <p className="text-gray-600 text-sm">ניהול מתקדם של המערכת</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Maintenance Mode Toggle */}
                  {settings && (
                    <button
                      onClick={toggleMaintenanceMode}
                      disabled={isUpdatingMaintenance}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all duration-200 text-sm ${
                        settings.maintenance_mode
                          ? 'bg-red-100 hover:bg-red-200 text-red-700'
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                      } ${isUpdatingMaintenance ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={settings.maintenance_mode ? 'בטל מצב תחזוקה' : 'הפעל מצב תחזוקה'}
                    >
                      {isUpdatingMaintenance ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {settings.maintenance_mode ? 'בטל תחזוקה' : 'מצב תחזוקה'}
                      </span>
                    </button>
                  )}

                  {/* Help Button */}
                  <Link
                    to="/admin/help"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-medium transition-all duration-200 text-sm"
                    title="מרכז עזרה ומדריכים"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">עזרה</span>
                  </Link>

                  {/* Drag Mode Toggle Button */}
                  <button
                    onClick={handleEnableDragMode}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl font-medium transition-all duration-200 text-sm"
                    title="הפעל מצב גרירה להזיז את כפתור התפריט"
                  >
                    <Move className="w-4 h-4" />
                    <span className="hidden sm:inline">הזז תפריט</span>
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-200"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Menu Content */}
            <div className="p-4 md:p-6 space-y-6 md:space-y-8">
              {menuCategories.map((category, categoryIndex) => (
                <div key={categoryIndex} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br ${category.color} rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      {category.icon}
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-gray-800">{category.title}</h3>
                  </div>

                  {/* Category Items Grid - Responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {category.items.map((item, itemIndex) => {
                      // Handle items with action vs url
                      const ItemComponent = item.action ? 'button' : Link;
                      const itemProps = item.action
                        ? {
                            onClick: () => {
                              item.action();
                            },
                            type: 'button'
                          }
                        : {
                            to: item.url,
                            onClick: () => setIsOpen(false)
                          };

                      return (
                        <ItemComponent
                          key={itemIndex}
                          {...itemProps}
                          className="group bg-gray-50 hover:bg-gradient-to-br hover:from-white hover:to-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl md:rounded-2xl p-3 md:p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-95 text-left"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                              {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-sm md:text-base group-hover:text-indigo-700 transition-colors leading-tight">
                                {item.title}
                              </h4>
                              <p className="text-xs md:text-sm text-gray-500 mt-1 leading-relaxed line-clamp-2">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </ItemComponent>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 bg-gray-50/50 rounded-b-2xl md:rounded-b-3xl sticky bottom-0">
              <p className="text-xs md:text-sm text-gray-500 text-center">
                מרכז הניהול מיועד למנהלי המערכת בלבד
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
