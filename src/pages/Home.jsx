import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Users,
  Award,
  Play,
  CheckCircle,
  Calendar,
  ArrowLeft,
  FileText,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Crown,
  BarChart3 // Added for the new section
} from "lucide-react";
import { loadSettingsWithRetry } from "@/lib/appUser";
import { Settings, User } from "@/services/entities";
import logo from "../assets/images/logo.png";
import { getProductTypeName, NAV_ITEMS } from '@/config/productTypes';

export default function Home() {

  // Dynamic texts using centralized config
  const homeTexts = {
    title: "בית מתקדם לחינוך ולמידה",
    subtitle: `מערכת תוכן לאנשי הוראה עם ${getProductTypeName('game', 'plural')} דיגיטליים ולמידה מותאמת לתוכנית הלימודים, ${getProductTypeName('course', 'plural')} ו${getProductTypeName('workshop', 'plural')} למורים`,
    viewWorkshops: NAV_ITEMS.workshops.text,
    viewCourses: NAV_ITEMS.courses.text, 
    viewFiles: NAV_ITEMS.files.text,
    viewGames: NAV_ITEMS.games.text,
    featuresTitle: "למה לבחור בנו?",
    featuresSubtitle: `אנחנו מציעים פלטפורמה מתקדמת ל${getProductTypeName('game', 'plural')} חינוכיים ו${getProductTypeName('tool', 'plural')} דיגיטליים שהופכים את הלמידה למהנה ואפקטיבית`,
    workshops: getProductTypeName('workshop', 'plural') + " אינטראקטיביות",
    workshopsDesc: `${getProductTypeName('workshop', 'plural')} מקוונות עם אלמנטים משחקיים ו${getProductTypeName('tool', 'plural')} אינטראקטיביים`,
    courses: getProductTypeName('course', 'plural') + " דיגיטליים",
    coursesDesc: `${getProductTypeName('course', 'plural')} מובנים עם משימות, אתגרים וחוויות למידה מגוונות`,
    files: getProductTypeName('file', 'plural') + " חינוכיים",
    filesDesc: `${getProductTypeName('tool', 'plural')} דיגיטליים, תבניות ומשאבים לשיפור חוויית הלמידה`,
    games: getProductTypeName('game', 'plural') + " חינוכיים", 
    gamesDesc: `${getProductTypeName('game', 'plural')} אינטראקטיביים ומותאמים אישית לכל הגילאים ונושאי הלימוד`,
    ctaFinalTitle: "מוכנים להפוך את הלמידה למהנה?",
    ctaFinalSubtitle: `הצטרפו אלינו וגלו עולם של ${getProductTypeName('game', 'plural')} חינוכיים ו${getProductTypeName('tool', 'plural')} דיגיטליים מתקדמים`,
    ctaFinalButton: "בואו נתחיל לשחק!",
    platformAdvanced: `פלטפורמה מתקדמת ל${getProductTypeName('game', 'plural')} חינוכיים`,
    whyChooseUs: "למה אנחנו?",
    joinUs: "הצטרפו אלינו",
    professionalWorkshops: "למידה משחקית",
    // Content creator section
    contentCreatorTitle: "הצטרפו למשפחת יוצרי התוכן שלנו",
    contentCreatorSubtitle: "צרו תכנים חינוכיים איכותיים וקבלו תגמול על כל תוכן שתיצרו",
    joinCreators: "הצטרפו ליוצרי התוכן",
    creatorPortal: "כניסה לפורטל יוצרים"
  };

  const [settings, setSettings] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Add retry logic for settings loading
  // Use shared loadSettingsWithRetry from lib/appUser

  const loadSettings = useCallback(async () => {
    try {
      const settingsData = await loadSettingsWithRetry(Settings);
      if (settingsData.length > 0) {
        setSettings(settingsData[0]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Continue without settings if they fail to load
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const impersonatingUserId = localStorage.getItem('impersonating_user_id');
      const impersonatingAdminId = localStorage.getItem('impersonating_admin_id');

      let user;
      if (impersonatingUserId && impersonatingAdminId) {
        // Use filter instead of get to avoid the error
        const impersonatedUsers = await User.filter({ id: impersonatingUserId });
        if (impersonatedUsers && impersonatedUsers.length > 0) {
          user = impersonatedUsers[0];
          user._isImpersonated = true;
          user._originalAdminId = impersonatingAdminId;
        } else {
          // If impersonated user not found, clear impersonation and use normal auth
          localStorage.removeItem('impersonating_user_id');
          localStorage.removeItem('impersonating_admin_id');
          user = await User.getCurrentUser();
        }
      } else {
        user = await User.getCurrentUser();
      }

      setCurrentUser(user);
    } catch (error) {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadCurrentUser();
  }, [loadSettings, loadCurrentUser]);

  // Helper function to check visibility for Home page items
  const shouldShowItemByVisibility = (visibility) => {
    if (!settings) return true;

    const isActualAdmin = currentUser?.role === 'admin' && !currentUser?._isImpersonated;
    const isContentCreator = currentUser && !!currentUser.content_creator_agreement_sign_date;

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
  };

  const shouldShowWorkshopsUpdated = () => {
    const visibility = settings?.nav_workshops_visibility || 'public';
    return shouldShowItemByVisibility(visibility);
  };

  const shouldShowCoursesUpdated = () => {
    const visibility = settings?.nav_courses_visibility || 'public';
    return shouldShowItemByVisibility(visibility);
  };

  const shouldShowFilesUpdated = () => {
    const visibility = settings?.nav_files_visibility || 'public';
    return shouldShowItemByVisibility(visibility);
  };

  const shouldShowGamesUpdated = () => {
    const visibility = settings?.nav_games_visibility || 'public';
    return shouldShowItemByVisibility(visibility);
  };

  const shouldShowSubscriptionOffer = () => {
    if (!currentUser) return false; // Not logged in
    if (!settings?.subscription_system_enabled) return false; // Subscription system disabled
    
    // Show if user doesn't have a subscription or has the free plan
    if (!currentUser.current_subscription_plan_id) return true;
    
    // Check if user has free plan
    // This will be expanded when we load the actual plan data
    return false;
  };

  const features = [
    shouldShowFilesUpdated() && {
      icon: FileText,
      title: homeTexts.files,
      description: homeTexts.filesDesc,
      gradient: "from-emerald-500 to-green-600",
      bgGradient: "from-emerald-50 to-green-50",
      isAdminOnly: settings?.nav_files_visibility === 'admin_only',
      link: "/files"
    },
    shouldShowGamesUpdated() && {
      icon: Play,
      title: homeTexts.games,
      description: homeTexts.gamesDesc,
      gradient: "from-purple-500 to-indigo-600",
      bgGradient: "from-purple-50 to-indigo-50",
      isAdminOnly: settings?.nav_games_visibility === 'admin_only',
      link: "/catalog"
    },
    shouldShowWorkshopsUpdated() && {
      icon: Calendar,
      title: homeTexts.workshops,
      description: homeTexts.workshopsDesc,
      gradient: "from-cyan-500 to-teal-600",
      bgGradient: "from-cyan-50 to-teal-50",
      isAdminOnly: settings?.nav_workshops_visibility === 'admin_only',
      link: "/workshops"
    },
    shouldShowCoursesUpdated() && {
      icon: BookOpen,
      title: homeTexts.courses,
      description: homeTexts.coursesDesc,
      gradient: "from-indigo-500 to-blue-600",
      bgGradient: "from-indigo-50 to-blue-50",
      isAdminOnly: settings?.nav_courses_visibility === 'admin_only',
      link: "/courses"
    }
  ].filter(Boolean);

  // Check if user is already a content creator
  const isContentCreator = currentUser && currentUser.content_creator_agreement_sign_date;

  const shouldShowContentCreatorsSection = () => {
    if (!settings) return true; // Show by default if settings not loaded
    
    const contentCreatorsVisibility = settings.nav_content_creators_visibility || 'admins_and_creators';
    const isActualAdmin = currentUser?.role === 'admin' && !currentUser?._isImpersonated;
    
    if (contentCreatorsVisibility === 'hidden') return false;
    if (contentCreatorsVisibility === 'admins_only' && !isActualAdmin) return false;
    if (contentCreatorsVisibility === 'admins_and_creators' && !isActualAdmin && !isContentCreator) {
      // Show the section to non-creators so they can join
      return true;
    }
    
    return true;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-600 via-pink-700 to-indigo-800 text-white pt-4 md:pt-8 pb-16 md:pb-24 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-pink-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-right space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                {homeTexts.platformAdvanced}
              </div>

              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                {logo || settings?.logo_url ? (
                  <img
                    src={logo || settings?.logo_url}
                    alt={settings?.site_name || "לודורה"}
                    className="h-64 md:h-80 object-contain mx-auto lg:mx-0 mb-2 max-w-full" // was h-48 md:h-72
                  />
                ) : (
                  <span className="block bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                    {settings?.site_name || "לודורה"}
                  </span>
                )}
                <span className="block text-3xl md:text-4xl mt-2 text-purple-100">
                  {homeTexts.title}
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-purple-100 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {homeTexts.subtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                {shouldShowWorkshopsUpdated() &&
                  <Link to="/workshops">
                    <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 px-8 py-4 text-lg font-semibold rounded-2xl shadow-xl hover-lift border-0">
                      <Play className="w-5 h-5 ml-2" />
                      {homeTexts.viewWorkshops}
                      {settings?.nav_workshops_visibility === 'admin_only' &&
                        <Crown className="w-4 h-4 mr-2 text-orange-300" />
                      }
                    </Button>
                  </Link>
                }
                {shouldShowGamesUpdated() &&
                  <Link to="/catalog">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-2 border-white bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 hover:border-white px-8 py-4 text-lg font-semibold rounded-2xl hover-lift">
                      <Play className="w-5 h-5 ml-2" />
                      {homeTexts.viewGames}
                      {settings?.nav_games_visibility === 'admin_only' &&
                        <Crown className="w-4 h-4 mr-2 text-orange-300" />
                      }
                    </Button>
                  </Link>
                }
                {shouldShowFilesUpdated() &&
                  <Link to="/files">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-2 border-white bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 hover:border-white px-8 py-4 text-lg font-semibold rounded-2xl hover-lift">
                      <FileText className="w-5 h-5 ml-2" />
                      {homeTexts.viewFiles}
                      {settings?.nav_files_visibility === 'admin_only' &&
                        <Crown className="w-4 h-4 mr-2 text-orange-600" />
                      }
                    </Button>
                  </Link>
                }
                {shouldShowCoursesUpdated() &&
                  <Link to="/courses">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-2 border-white bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 hover:border-white px-8 py-4 text-lg font-semibold rounded-2xl hover-lift">

                      <BookOpen className="w-5 h-5 ml-2" />
                      {homeTexts.viewCourses}
                      {settings?.nav_courses_visibility === 'admin_only' &&
                        <Crown className="w-4 h-4 mr-2 text-orange-300" />
                      }
                    </Button>
                  </Link>
                }
              </div>
            </div>

            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-pink-400/20 rounded-3xl blur-2xl transform rotate-6"></div>
                <img
                  src="https://images.unsplash.com/photo-1596495578065-6e0763fa1178?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt={`${getProductTypeName('game', 'plural')} חינוכיים`}
                  className="relative z-10 w-full max-w-lg h-96 object-cover rounded-3xl shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-700" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Only show if there are features */}
      {features.length > 0 && (
        <section className="py-24 bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 rounded-full px-4 py-2 text-sm font-medium mb-4">
                <TrendingUp className="w-4 h-4" />
                {homeTexts.whyChooseUs}
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {homeTexts.featuresTitle}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {homeTexts.featuresSubtitle}
              </p>
            </div>

            <div className={`grid gap-8 ${
              features.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
              features.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto' :
              features.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
              'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
            }`}>
              {features.map((feature, index) =>
                <Card key={index} className={`border-none shadow-elegant hover-lift bg-gradient-to-br ${feature.bgGradient} overflow-hidden group relative ${feature.link ? 'cursor-pointer' : ''}`}>
                  {feature.link ?
                    <Link to={feature.link} className="block h-full">
                      <CardContent className="p-8 text-center relative h-full">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/20 to-white/5 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>

                        {feature.isAdminOnly &&
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                            <Crown className="w-3 h-3 text-white" />
                          </div>
                        }

                        <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <feature.icon className="w-8 h-8 text-white" />
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors">
                          {feature.title}
                        </h3>

                        <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Link> :

                    <CardContent className="p-8 text-center relative h-full">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/20 to-white/5 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>

                      {feature.isAdminOnly &&
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      }

                      <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors">
                        {feature.title}
                      </h3>

                      <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                        {feature.description}
                      </p>
                    </CardContent>
                  }
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Subscription Offer Section - Show for logged-in users without premium subscription */}
      {shouldShowSubscriptionOffer() && (
        <section className="py-24 bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 rounded-full px-6 py-3 text-sm font-medium mb-6 shadow-lg">
              <Crown className="w-5 h-5" />
              הצעה מיוחדת
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              שדרג למנוי פרימיום
            </h2>

            <p className="text-xl mb-10 text-gray-700 leading-relaxed max-w-2xl mx-auto">
              קבל גישה בלתי מוגבלת לכל ה{getProductTypeName('game', 'plural')}, ניהול כיתות מתקדם ודוחות מפורטים
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-lg rounded-xl px-6 py-4 shadow-lg">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{getProductTypeName('game', 'plural')} ללא הגבלה</div>
                  <div className="text-gray-600 text-sm">כל ה{getProductTypeName('game', 'plural')} החינוכיים</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-lg rounded-xl px-6 py-4 shadow-lg">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">ניהול כיתות</div>
                  <div className="text-gray-600 text-sm">עד 100 תלמידים</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-lg rounded-xl px-6 py-4 shadow-lg">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">דוחות מתקדמים</div>
                  <div className="text-gray-600 text-sm">מעקב אחר התקדמות</div>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setShowSubscriptionModal(true)}
              size="lg" 
              className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-gray-900 hover:from-yellow-300 hover:via-orange-400 hover:to-red-400 px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl hover-lift border-0 transform hover:scale-105 transition-all duration-300"
            >
              <Crown className="w-6 h-6 ml-3" />
              בחר מנוי עכשיו
            </Button>

            <div className="mt-6 text-gray-500 text-sm">
              ללא התחייבות • ביטול בכל עת • תמיכה מלאה
            </div>
          </div>
        </section>
      )}

      {/* Content Creators Section - Only show if user is logged in and should see it */}
      {currentUser && shouldShowContentCreatorsSection() && (
        <section className="py-24 bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 rounded-full px-4 py-2 text-sm font-medium mb-6">
              <Users className="w-4 h-4" />
              יוצרי תוכן
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {homeTexts.contentCreatorTitle}
            </h2>

            <p className="text-xl mb-10 text-gray-600 leading-relaxed max-w-2xl mx-auto">
              {homeTexts.contentCreatorSubtitle}
            </p>

            <Link to={isContentCreator ? "/creator-portal" : "/creator-signup"}>
              <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 px-12 py-6 text-xl font-semibold rounded-2xl shadow-2xl hover-lift border-0">
                <Users className="w-6 h-6 ml-3" />
                {isContentCreator ? homeTexts.creatorPortal : homeTexts.joinCreators}
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-purple-600 via-pink-700 to-indigo-800 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-br from-yellow-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            {homeTexts.joinUs}
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {homeTexts.ctaFinalTitle}
          </h2>

          <p className="text-xl mb-10 text-purple-100 leading-relaxed max-w-2xl mx-auto">
            {homeTexts.ctaFinalSubtitle}
          </p>

          {shouldShowFilesUpdated() ?
            <Link to="/files">
              <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 px-12 py-6 text-xl font-semibold rounded-2xl shadow-2xl hover-lift border-0">
                <FileText className="w-6 h-6 ml-3" />
                {homeTexts.ctaFinalButton}
                {settings?.nav_files_visibility === 'admin_only' &&
                  <Crown className="w-5 h-5 mr-3 text-orange-600" />
                }
              </Button>
            </Link> :
            shouldShowGamesUpdated() ?
              <Link to="/catalog">
                <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 px-12 py-6 text-xl font-semibold rounded-2xl shadow-2xl hover-lift border-0">
                  <Play className="w-6 h-6 ml-3" />
                  {homeTexts.ctaFinalButton}
                  {settings?.nav_games_visibility === 'admin_only' &&
                    <Crown className="w-5 h-5 mr-3 text-orange-600" />
                  }
                </Button>
              </Link> :
              shouldShowCoursesUpdated() ?
                <Link to="/courses">
                  <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 px-12 py-6 text-xl font-semibold rounded-2xl shadow-2xl hover-lift border-0">
                    <BookOpen className="w-6 h-6 ml-3" />
                    {homeTexts.ctaFinalButton}
                    {settings?.nav_courses_visibility === 'admin_only' &&
                      <Crown className="w-5 h-5 mr-3 text-orange-600" />
                    }
                  </Button>
                </Link> :
                shouldShowWorkshopsUpdated() ?
                  <Link to="/workshops">
                    <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 px-12 py-6 text-xl font-semibold rounded-2xl shadow-2xl hover-lift border-0">
                      <ArrowLeft className="w-6 h-6 ml-3" />
                      {homeTexts.ctaFinalButton}
                      {settings?.nav_workshops_visibility === 'admin_only' &&
                        <Crown className="w-5 h-5 mr-3 text-orange-600" />
                      }
                    </Button>
                  </Link> :
                  null}
        </div>
      </section>
    </div>);

}
