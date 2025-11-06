import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FileText, Play, Calendar, BookOpen, UserIcon, Users, GraduationCap, Menu, X, Crown, LogIn, LogOut, ShieldAlert, ChevronLeft, ChevronRight, ShoppingCart, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { iconMap } from "@/lib/layoutUtils";
import { NAV_ITEMS, getNavItemConfig, PRODUCT_TYPES } from "@/config/productTypes";
import logoSm from "../../assets/images/logo_sm.png";
import { useCart } from "@/contexts/CartContext";

// Helper function to check if user can see item based on visibility setting
function canUserSeeItem(visibility, currentUser, isActualAdmin, isContentCreator) {
  switch (visibility) {
    case 'public':
      return true;
    case 'logged_in_users':
      return !!currentUser;
    case 'admin_only':
      return isActualAdmin;
    case 'admins_and_creators':
      return isActualAdmin || isContentCreator;
    case 'hidden':
      return false;
    default:
      return true; // Default to public for unknown values
  }
}

// Utility: get navigation items
function getNavigationItems({ currentUser, settings, isActualAdmin, isContentCreator }) {
  const navOrder = settings?.nav_order || Object.keys(NAV_ITEMS);
  let navItems = [];
  navOrder.forEach((itemType) => {
    const navItemConfig = getNavItemConfig(itemType);
    if (!navItemConfig) return;
    const isItemEnabled = settings?.[`nav_${itemType}_enabled`] !== false;
    if (!isItemEnabled) return;
    if (navItemConfig.requiresSubscription && !settings?.subscription_system_enabled) return;
    switch (itemType) {
      case 'files': {
        const filesVisibility = settings?.nav_files_visibility || 'public';
        if (canUserSeeItem(filesVisibility, currentUser, isActualAdmin, isContentCreator)) {
          const iconName = settings?.nav_files_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || FileText;
          navItems.push({
            title: navItemConfig.text,
            url: PRODUCT_TYPES.file.url,
            icon: IconComponent,
            isAdminOnly: filesVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'games': {
        const gamesVisibility = settings?.nav_games_visibility || 'public';
        if (canUserSeeItem(gamesVisibility, currentUser, isActualAdmin, isContentCreator)) {
          const iconName = settings?.nav_games_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || Play;
          navItems.push({
            title: navItemConfig.text,
            url: PRODUCT_TYPES.game.url,
            icon: IconComponent,
            isAdminOnly: gamesVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'workshops': {
        const workshopsVisibility = settings?.nav_workshops_visibility || 'public';
        if (canUserSeeItem(workshopsVisibility, currentUser, isActualAdmin, isContentCreator)) {
          const iconName = settings?.nav_workshops_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || Calendar;
          navItems.push({
            title: navItemConfig.text,
            url: PRODUCT_TYPES.workshop.url,
            icon: IconComponent,
            isAdminOnly: workshopsVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'courses': {
        const coursesVisibility = settings?.nav_courses_visibility || 'public';
        if (canUserSeeItem(coursesVisibility, currentUser, isActualAdmin, isContentCreator)) {
          const iconName = settings?.nav_courses_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || BookOpen;
          navItems.push({
            title: navItemConfig.text,
            url: PRODUCT_TYPES.course.url,
            icon: IconComponent,
            isAdminOnly: coursesVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'classrooms': {
        if (settings?.subscription_system_enabled) {
          const classroomsVisibility = settings?.nav_classrooms_visibility || 'public';
          if (canUserSeeItem(classroomsVisibility, currentUser, isActualAdmin, isContentCreator)) {
            const iconName = settings?.nav_classrooms_icon || navItemConfig.defaultIcon;
            const IconComponent = iconMap[iconName] || GraduationCap;
            navItems.push({
              title: navItemConfig.text,
              url: "/classrooms",
              icon: IconComponent,
              isAdminOnly: classroomsVisibility === 'admin_only',
              gradient: navItemConfig.gradient
            });
          }
        }
        break;
      }
      case 'account': {
        const accountVisibility = settings?.nav_account_visibility || 'public';
        if (canUserSeeItem(accountVisibility, currentUser, isActualAdmin, isContentCreator)) {
          const iconName = settings?.nav_account_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || UserIcon;
          navItems.push({
            title: navItemConfig.text,
            url: "/account",
            icon: IconComponent,
            isAdminOnly: accountVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'tools': {
        const toolsVisibility = settings?.nav_tools_visibility || 'public';
        if (canUserSeeItem(toolsVisibility, currentUser, isActualAdmin, isContentCreator)) {
          const iconName = settings?.nav_tools_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || Settings;
          navItems.push({
            title: settings?.nav_tools_text || navItemConfig.text,
            url: PRODUCT_TYPES.tool.url,
            icon: IconComponent,
            isAdminOnly: toolsVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'content_creators': {
        const contentCreatorsVisibility = settings?.nav_content_creators_visibility || 'admins_and_creators';

        // Special handling for content creators - show to eligible users or for signup
        let shouldShow = false;
        if (contentCreatorsVisibility === 'admins_and_creators') {
          // Show to admins and content creators, and also to regular logged-in users so they can sign up
          shouldShow = !!currentUser;
        } else {
          // Use standard visibility check for other levels
          shouldShow = canUserSeeItem(contentCreatorsVisibility, currentUser, isActualAdmin, isContentCreator);
        }

        if (shouldShow) {
          const iconName = settings?.nav_content_creators_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || Users;
          navItems.push({
            title: navItemConfig.text,
            url: isContentCreator ? "/creator-portal" : "/creator-signup",
            icon: IconComponent,
            isAdminOnly: contentCreatorsVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'curriculum': {
        const curriculumVisibility = settings?.nav_curriculum_visibility || 'logged_in_users';
        if (canUserSeeItem(curriculumVisibility, currentUser, isActualAdmin, isContentCreator)) {
          const iconName = settings?.nav_curriculum_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || BookOpen;
          navItems.push({
            title: settings?.nav_curriculum_text || navItemConfig.text,
            url: navItemConfig.url,
            icon: IconComponent,
            isAdminOnly: curriculumVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'lesson_plans': {
        const lessonPlansVisibility = settings?.nav_lesson_plans_visibility || 'public';
        if (canUserSeeItem(lessonPlansVisibility, currentUser, isActualAdmin, isContentCreator)) {
          const iconName = settings?.nav_lesson_plans_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || BookOpen;
          navItems.push({
            title: navItemConfig.text,
            url: PRODUCT_TYPES.lesson_plan.url,
            icon: IconComponent,
            isAdminOnly: lessonPlansVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      default:
        break;
    }
  });
  return navItems;
}

const PublicNav = ({ currentUser, handleLogout, handleLogin, settings }) => {
  const location = useLocation();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load saved state from localStorage, but default to collapsed on mobile
    const saved = localStorage.getItem('sideNavCollapsed');
    if (saved) return JSON.parse(saved);
    // Default: collapsed on mobile, expanded on desktop
    return typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  });

  // Track if this is a mobile view for overlay behavior
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false; // SSR default
    return window.innerWidth < 1024;
  });

  // Cart functionality
  const { cartCount } = useCart();

  useEffect(() => {
    setIsImpersonating(currentUser && currentUser._isImpersonated);
  }, [currentUser]);

  // Handle window resize to track mobile/desktop state
  useEffect(() => {
    const checkInitialState = () => {
      const newIsMobile = window.innerWidth < 1024;
      setIsMobile(newIsMobile);
    };

    checkInitialState();

    const handleResize = () => {
      const newIsMobile = window.innerWidth < 1024;
      setIsMobile(newIsMobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Save collapsed state to localStorage and update CSS custom property
  useEffect(() => {
    localStorage.setItem('sideNavCollapsed', JSON.stringify(isCollapsed));
    // Update CSS custom property based on device type
    if (!isMobile) {
      // Desktop: Set width for content pushing
      document.documentElement.style.setProperty('--nav-width', isCollapsed ? '80px' : '256px');
    } else {
      // Mobile: No margin needed (overlay mode)
      document.documentElement.style.setProperty('--nav-width', '0px');
    }
  }, [isCollapsed, isMobile]);

  const isActualAdmin = currentUser?.role === 'admin' && !isImpersonating;
  const isContentCreator = currentUser?.content_creator_agreement_sign_date;
  const currentNavItems = getNavigationItems({ currentUser, settings, isActualAdmin, isContentCreator });

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile Top Header Bar */}
      {isMobile && (
        <div className={`fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg transition-all duration-300 ${
          isCollapsed ? 'z-50' : 'z-30'
        }`}>
          <div className="flex items-center justify-between px-4 py-3" dir="rtl">
            {/* Logo - hidden when menu is open */}
            <Link
              to={currentUser ? '/dashboard' : '/'}
              className={`flex items-center gap-3 hover:scale-105 transition-all duration-300 ${
                isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
              }`}
            >
              {logoSm || settings?.logo_url ? (
                <img
                  src={logoSm || settings?.logo_url}
                  alt={settings?.site_name || "לודורה"}
                  className="h-8 w-auto object-contain rounded-lg max-w-[120px]"
                />
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                    {settings?.site_name || "לודורה"}
                  </h1>
                </>
              )}
            </Link>

            {/* Cart Icon and Menu Toggle */}
            <div className="flex items-center gap-2">
              {/* Cart Icon - only show if user is authenticated and collapsed (menu closed) */}
              {currentUser && isCollapsed && (
                <Link
                  to="/checkout"
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  title="עגלת קניות"
                >
                  <ShoppingCart className="w-6 h-6 text-gray-700" />
                  {cartCount > 0 && (
                    <div className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                      {cartCount > 99 ? '99+' : cartCount}
                    </div>
                  )}
                </Link>
              )}

              {/* Menu Toggle Button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                aria-label={isCollapsed ? "פתח תפריט" : "סגור תפריט"}
              >
                {isCollapsed ? <Menu className="w-6 h-6" /> : <X className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for mobile overlay */}
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Universal Side Navigation */}
      <div className={`
        flex flex-col fixed right-0 top-0 h-full
        bg-white/95 backdrop-blur-xl border-l border-gray-200/50
        shadow-xl shadow-purple-500/10
        transition-all duration-300 ease-in-out
        ${isMobile ? 'z-40' : 'z-30'}
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${isMobile && isCollapsed ? 'translate-x-full' : 'translate-x-0'}
      `} dir="rtl">

        {/* Maintenance mode warning */}
        {settings?.maintenance_mode && currentUser?.role === 'admin' && (
          <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-black p-2 text-center text-xs font-bold flex items-center justify-center gap-1 shadow-lg animate-pulse">
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            {!isCollapsed && <span>מצב תחזוקה</span>}
          </div>
        )}

        {/* Header */}
        <div className="p-4 border-b border-gray-200/50">
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link
                to={currentUser ? '/dashboard' : '/'}
                className="flex items-center gap-3 hover:scale-105 transition-transform duration-300"
              >
                {logoSm || settings?.logo_url ? (
                  <img
                    src={logoSm || settings?.logo_url}
                    alt={settings?.site_name || "לודורה"}
                    className="h-12 w-auto max-w-[150px] object-contain rounded-lg transition-all duration-300"
                  />
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300">
                      <GraduationCap className="w-7 h-7 text-white transition-all duration-300" />
                    </div>
                    <div className="transition-all duration-300">
                      <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                        {settings?.site_name || "לודורה"}
                      </h1>
                      <p className="text-xs text-gray-500 font-medium">פלטפורמה חינוכית מתקדמת</p>
                    </div>
                  </>
                )}
              </Link>

              {/* Collapse Toggle Button */}
              <button
                onClick={toggleCollapse}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                aria-label="כווץ תפריט"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              {/* Logo centered when collapsed */}
              <Link
                to={currentUser ? '/dashboard' : '/'}
                className="flex items-center justify-center hover:scale-105 transition-transform duration-300"
              >
                {logoSm || settings?.logo_url ? (
                  <img
                    src={logoSm || settings?.logo_url}
                    alt={settings?.site_name || "לודורה"}
                    className="h-8 w-8 object-contain rounded-lg transition-all duration-300"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300">
                    <GraduationCap className="w-5 h-5 text-white transition-all duration-300" />
                  </div>
                )}
              </Link>

              {/* Expand button when collapsed */}
              <button
                onClick={toggleCollapse}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                aria-label="הרחב תפריט"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-2 px-3">
            {currentNavItems.map((item) => (
              <div key={item.title} className="relative group">
                <Link
                  to={item.url}
                  className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 ${
                    location.pathname === item.url
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg shadow-purple-500/25`
                      : 'hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 text-gray-700 hover:text-gray-900 hover:shadow-lg'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.title : undefined}
                  onClick={() => {
                    if (isMobile) {
                      setIsCollapsed(true);
                    }
                  }}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="whitespace-nowrap transition-opacity duration-300">{item.title}</span>
                  )}
                </Link>

                {/* Admin indicator */}
                {item.isAdminOnly && (
                  <div className={`absolute ${isCollapsed ? '-top-1 -left-1' : '-top-2 -right-2'} w-6 h-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg transform rotate-12`}>
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.title}
                    <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* User Section at Bottom */}
        <div className="border-t border-gray-200/50 p-4">
          {!currentUser ? (
            <Button
              variant="outline"
              className={`flex items-center gap-2 font-bold transition-all duration-300 ${
                isCollapsed ? 'w-12 h-12 p-0 justify-center' : 'w-full justify-center'
              }`}
              onClick={handleLogin}
              title={isCollapsed ? "התחברות" : undefined}
            >
              <LogIn className="w-5 h-5" />
              {!isCollapsed && <span>התחברות</span>}
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Cart Icon (for authenticated users) */}
              <Link
                to="/checkout"
                className={`relative flex items-center gap-2 font-bold transition-all duration-300 hover:bg-gray-100 rounded-lg ${
                  isCollapsed ? 'w-12 h-12 p-0 justify-center' : 'w-full justify-center py-3 px-3'
                }`}
                title={isCollapsed ? "עגלת קניות" : undefined}
              >
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                {!isCollapsed && <span className="text-blue-600">עגלת קניות</span>}
                {cartCount > 0 && (
                  <div className={`absolute bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg ${
                    isCollapsed ? '-top-1 -left-1 w-5 h-5' : '-top-1 left-2 w-5 h-5'
                  }`}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </div>
                )}
              </Link>

              {/* User Info (only when expanded) */}
              {!isCollapsed && (
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {currentUser.full_name || currentUser.email}
                  </div>
                  {currentUser.role === 'admin' && (
                    <div className="text-xs text-orange-600 font-bold flex items-center justify-center gap-1">
                      <Crown className="w-3 h-3" />
                      מנהל
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                className={`flex items-center gap-2 font-bold transition-all duration-300 ${
                  isCollapsed ? 'w-12 h-12 p-0 justify-center' : 'w-full justify-center'
                }`}
                onClick={handleLogout}
                title={isCollapsed ? "התנתקות" : undefined}
              >
                <LogOut className="w-5 h-5" />
                {!isCollapsed && <span>התנתקות</span>}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PublicNav;