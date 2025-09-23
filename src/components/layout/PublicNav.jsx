import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FileText, Play, Calendar, BookOpen, UserIcon, Users, GraduationCap, Settings as SettingsIcon, Mail, BarChart3, Menu, X, Home, Crown, LogIn, LogOut, UserCheck, ShieldAlert, MessageSquare, Shield, Code, Edit, Monitor, Award, Globe, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { iconMap } from "@/lib/layoutUtils";
import { NAV_ITEMS, getNavItemConfig } from "@/config/productTypes";
import logoSm from "../../assets/images/logo_sm.png";

// Utility: get navigation items
function getNavigationItems({ currentUser, settings, isImpersonating, isActualAdmin, isContentCreator }) {
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
        if (filesVisibility === 'hidden') break;
        // Show only if: public visibility, OR admin-only and user is actual admin
        if (filesVisibility === 'public' || (filesVisibility === 'admin_only' && isActualAdmin)) {
          const iconName = settings?.nav_files_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || FileText;
          navItems.push({
            title: navItemConfig.text,
            url: "/files",
            icon: IconComponent,
            isAdminOnly: filesVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'games': {
        const gamesVisibility = settings?.nav_games_visibility || 'public';
        if (gamesVisibility === 'hidden') break;
        if (gamesVisibility === 'public' || (gamesVisibility === 'admin_only' && isActualAdmin)) {
          const iconName = settings?.nav_games_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || Play;
          navItems.push({
            title: navItemConfig.text,
            url: "/catalog",
            icon: IconComponent,
            isAdminOnly: gamesVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'workshops': {
        const workshopsVisibility = settings?.nav_workshops_visibility || 'public';
        if (workshopsVisibility === 'hidden') break;
        if (workshopsVisibility === 'public' || (workshopsVisibility === 'admin_only' && isActualAdmin)) {
          const iconName = settings?.nav_workshops_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || Calendar;
          navItems.push({
            title: navItemConfig.text,
            url: "/workshops",
            icon: IconComponent,
            isAdminOnly: workshopsVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'courses': {
        const coursesVisibility = settings?.nav_courses_visibility || 'public';
        if (coursesVisibility === 'hidden') break;
        if (coursesVisibility === 'public' || (coursesVisibility === 'admin_only' && isActualAdmin)) {
          const iconName = settings?.nav_courses_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || BookOpen;
          navItems.push({
            title: navItemConfig.text,
            url: "/courses",
            icon: IconComponent,
            isAdminOnly: coursesVisibility === 'admin_only',
            gradient: navItemConfig.gradient
          });
        }
        break;
      }
      case 'classrooms': {
        if (currentUser && settings?.subscription_system_enabled) {
          const classroomsVisibility = settings?.nav_classrooms_visibility || 'public';
          if (classroomsVisibility === 'hidden') break;
          if (classroomsVisibility === 'public' || (classroomsVisibility === 'admin_only' && isActualAdmin)) {
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
        if (currentUser) {
          const accountVisibility = settings?.nav_account_visibility || 'public';
          if (accountVisibility === 'hidden') break;
          if (accountVisibility === 'public' || (accountVisibility === 'admin_only' && isActualAdmin)) {
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
        }
        break;
      }
      case 'content_creators': {
        if (currentUser) {
          const contentCreatorsVisibility = settings?.nav_content_creators_visibility || 'admins_and_creators';
          if (contentCreatorsVisibility === 'hidden') break;
          
          let shouldShow = false;
          if (contentCreatorsVisibility === 'admins_only' && isActualAdmin) {
            shouldShow = true;
          } else if (contentCreatorsVisibility === 'admins_and_creators') {
            // Show to admins and content creators, and also to regular users so they can sign up
            shouldShow = true;
          }
          
          if (shouldShow) {
            const iconName = settings?.nav_content_creators_icon || navItemConfig.defaultIcon;
            const IconComponent = iconMap[iconName] || Users;
            navItems.push({
              title: navItemConfig.text,
              url: isContentCreator ? "/creator-portal" : "/creator-signup",
              icon: IconComponent,
              isAdminOnly: contentCreatorsVisibility === 'admins_only',
              gradient: navItemConfig.gradient
            });
          }
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    setIsImpersonating(currentUser && currentUser._isImpersonated);
  }, [currentUser]);

  const isActualAdmin = currentUser?.role === 'admin' && !isImpersonating;
  const isContentCreator = currentUser?.content_creator_agreement_sign_date;
  const currentNavItems = getNavigationItems({ currentUser, settings, isImpersonating, isActualAdmin, isContentCreator });

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-lg shadow-purple-500/10">
      {/* Maintenance mode warning - moved inside nav */}
      {settings?.maintenance_mode && currentUser?.role === 'admin' && (
        <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-black p-3 text-center text-sm font-bold flex items-center justify-center gap-2 shadow-lg animate-pulse" role="alert" aria-live="polite">
          <ShieldAlert className="w-5 h-5 animate-bounce" />
          האתר במצב תחזוקה. רק מנהלים יכולים לגשת.
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20" dir="rtl">
          {/* Logo Section */}
          <Link
            to={currentUser ? '/dashboard' : '/'}
            className="flex items-center gap-4 hover:scale-105 transition-transform duration-300"
          >
            {logoSm || settings?.logo_url ? (
                <img
                  src={logoSm || settings?.logo_url}
                  alt={settings?.site_name || "לודורה"}
                  className="h-16 md:h-18 w-auto object-contain rounded-lg max-w-[120px]" // larger logo without height constraints
                  />
            ) : (
              <>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                    {settings?.site_name || "לודורה"}
                  </h1>
                  <p className="text-sm text-gray-500 font-medium">פלטפורמה חינוכית מתקדמת</p>
                </div>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-between flex-1">
            {/* Navigation Items - stick to logo */}
            <div className="flex items-center gap-2 mr-8">
              {currentNavItems.map((item) =>
                <div key={item.title} className="relative group">
                  <Link
                    to={item.url}
                    className={`relative flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${
                      location.pathname === item.url
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg shadow-purple-500/25`
                        : 'hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 text-gray-700 hover:text-gray-900 hover:shadow-lg'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="whitespace-nowrap">{item.title}</span>
                  </Link>
                  {item.isAdminOnly && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg transform rotate-12">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Login/Logout Button - separate on the left */}
            <div>
              {!currentUser ? (
                <Button
                  variant="outline"
                  className="flex items-center gap-2 font-bold"
                  onClick={handleLogin}
                >
                  <LogIn className="w-5 h-5" />
                  התחברות
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 font-bold"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5" />
                  התנתקות
                </Button>
              )}
            </div>
          </div>
          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button
              className="p-2 rounded-md text-gray-700 hover:bg-gray-200 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="תפריט ראשי"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation Drawer - positioned below navbar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute right-4 left-4 bg-white shadow-xl rounded-2xl z-50 animate-fade-in py-6 mt-2" dir="rtl" style={{ top: '100%' }}>
          <div className="flex flex-col gap-2 px-4">
            {currentNavItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 hover:text-gray-900 transition-all duration-200 text-right"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </Link>
            ))}
            
            {/* Separator line */}
            {currentUser && <div className="border-t border-gray-200 my-2"></div>}
            
            {/* Mobile: Login/Logout Button - different styling */}
            {!currentUser ? (
              <button
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all duration-200 text-right border border-blue-200"
                onClick={() => { setIsMobileMenuOpen(false); handleLogin(); }}
              >
                <LogIn className="w-5 h-5" />
                <span>התחברות</span>
              </button>
            ) : (
              <button
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-all duration-200 text-right border border-red-200"
                onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
              >
                <LogOut className="w-5 h-5" />
                <span>התנתקות</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicNav;
