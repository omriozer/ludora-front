import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Users,
  Play,
  Calendar,
  FileText,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Crown,
  BarChart3,
  Settings,
  UserIcon,
  CheckCircle,
  Award,
  Star,
  MessageCircle,
  Phone
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import LogoDisplay from '@/components/ui/LogoDisplay';
import { getProductTypeName, NAV_ITEMS, PRODUCT_TYPES } from '@/config/productTypes';
import { iconMap } from "@/lib/layoutUtils";

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

// Utility: get product descriptions based on type and target audience
function getProductDescription(productType, isSchoolsMode) {
  const descriptions = {
    files: {
      teachers: "כלים דיגיטליים, תבניות ומשאבי עזר לשיפור חוויית הלמידה בכיתה",
      schools: "בנק קבצים מרכזי עם תבניות ומשאבים לשימוש כלל צוות החינוך"
    },
    games: {
      teachers: "משחקים אינטראקטיביים ומותאמים אישית לכל הגילאים ונושאי הלימוד",
      schools: "מערכת משחקים חינוכיים עם מעקב התקדמות ודוחות מפורטים למורים"
    },
    workshops: {
      teachers: "סדנאות מקצועיות ומפגשי העשרה לפיתוח מקצועי של מורים",
      schools: "תוכנית סדנאות מקצועיות מותאמת לצוותי החינוך של בית הספר"
    },
    courses: {
      teachers: "קורסי העשרה מקצועית והכשרה מתמשכת במגוון תחומי חינוך",
      schools: "מערכת קורסים מקצועיים מובנית לכל צוות החינוך במוסד"
    },
    classrooms: {
      teachers: "ניהול כיתות דיגיטלי עם מעקב אחר התקדמות התלמידים",
      schools: "פלטפורמת ניהול מקיפה לכל הכיתות והמורים במוסד החינוכי"
    },
    account: {
      teachers: "ניהול הפרופיל האישי, המשאבים והתכנים שלכם",
      schools: "ניהול משתמשים, תפקידים והרשאות ברמת המוסד החינוכי"
    },
    tools: {
      teachers: "כלי עזר דיגיטליים לשיפור התהליך החינוכי והפדגוגי",
      schools: "ערכת כלים מתקדמת לניהול ובקרה ברמת המוסד החינוכי"
    },
    content_creators: {
      teachers: "הצטרפו לקהילת יוצרי התוכן שלנו ופתחו תכנים חינוכיים איכותיים",
      schools: "פלטפורמה לפיתוח ושיתוף תכנים חינוכיים בין צוותי המוסד"
    },
    curriculum: {
      teachers: "מערכת מותאמת תכנית הלימודים הישראלית עם תכנים מלאים",
      schools: "תכנית לימודים מובנית ומערכת מעקב התקדמות ברמת המוסד"
    },
    lesson_plans: {
      teachers: "תכניות שיעור מפורטות ומותאמות לתכנית הלימודים הישראלית",
      schools: "בנק תכניות שיעור מרכזי לכל המורים במוסד החינוכי"
    }
  };

  const productDescriptions = descriptions[productType];
  if (!productDescriptions) {
    return "תוכן חינוכי איכותי המותאם לצרכים שלכם";
  }

  return productDescriptions[isSchoolsMode ? 'schools' : 'teachers'];
}

// Utility: get navigation items (reused from PublicNav logic)
function getNavigationItems({ currentUser, settings, isActualAdmin, isContentCreator }) {
  if (!settings) return [];

  const navOrder = settings?.nav_order || Object.keys(NAV_ITEMS);
  let navItems = [];

  navOrder.forEach((itemType) => {
    const navItemConfig = NAV_ITEMS[itemType];
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
            type: itemType,
            title: navItemConfig.text,
            url: PRODUCT_TYPES.file.url,
            icon: IconComponent,
            isAdminOnly: filesVisibility === 'admin_only',
            gradient: "from-emerald-500 to-green-600",
            bgGradient: "from-emerald-50 to-green-50"
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
            type: itemType,
            title: navItemConfig.text,
            url: PRODUCT_TYPES.game.url,
            icon: IconComponent,
            isAdminOnly: gamesVisibility === 'admin_only',
            gradient: "from-purple-500 to-indigo-600",
            bgGradient: "from-purple-50 to-indigo-50"
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
            type: itemType,
            title: navItemConfig.text,
            url: PRODUCT_TYPES.workshop.url,
            icon: IconComponent,
            isAdminOnly: workshopsVisibility === 'admin_only',
            gradient: "from-cyan-500 to-teal-600",
            bgGradient: "from-cyan-50 to-teal-50"
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
            type: itemType,
            title: navItemConfig.text,
            url: PRODUCT_TYPES.course.url,
            icon: IconComponent,
            isAdminOnly: coursesVisibility === 'admin_only',
            gradient: "from-indigo-500 to-blue-600",
            bgGradient: "from-indigo-50 to-blue-50"
          });
        }
        break;
      }
      case 'classrooms': {
        if (settings?.nav_classrooms_enabled && settings?.subscription_system_enabled) {
          const classroomsVisibility = settings?.nav_classrooms_visibility || 'public';
          if (canUserSeeItem(classroomsVisibility, currentUser, isActualAdmin, isContentCreator)) {
            const iconName = settings?.nav_classrooms_icon || navItemConfig.defaultIcon;
            const IconComponent = iconMap[iconName] || GraduationCap;
            navItems.push({
              type: itemType,
              title: navItemConfig.text,
              url: "/classrooms",
              icon: IconComponent,
              isAdminOnly: classroomsVisibility === 'admin_only',
              gradient: "from-blue-500 to-indigo-600",
              bgGradient: "from-blue-50 to-indigo-50",
              isPremium: true
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
            type: itemType,
            title: navItemConfig.text,
            url: "/account",
            icon: IconComponent,
            isAdminOnly: accountVisibility === 'admin_only',
            gradient: "from-gray-500 to-slate-600",
            bgGradient: "from-gray-50 to-slate-50"
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
            type: itemType,
            title: settings?.nav_tools_text || navItemConfig.text,
            url: PRODUCT_TYPES.tool.url,
            icon: IconComponent,
            isAdminOnly: toolsVisibility === 'admin_only',
            gradient: "from-orange-500 to-red-600",
            bgGradient: "from-orange-50 to-red-50"
          });
        }
        break;
      }
      case 'content_creators': {
        const contentCreatorsVisibility = settings?.nav_content_creators_visibility || 'admins_and_creators';

        let shouldShow = false;
        if (contentCreatorsVisibility === 'admins_and_creators') {
          shouldShow = !!currentUser;
        } else {
          shouldShow = canUserSeeItem(contentCreatorsVisibility, currentUser, isActualAdmin, isContentCreator);
        }

        if (shouldShow) {
          const iconName = settings?.nav_content_creators_icon || navItemConfig.defaultIcon;
          const IconComponent = iconMap[iconName] || Users;
          navItems.push({
            type: itemType,
            title: navItemConfig.text,
            url: isContentCreator ? "/creator-portal" : "/creator-signup",
            icon: IconComponent,
            isAdminOnly: contentCreatorsVisibility === 'admin_only',
            gradient: "from-violet-500 to-purple-600",
            bgGradient: "from-violet-50 to-purple-50"
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
            type: itemType,
            title: settings?.nav_curriculum_text || navItemConfig.text,
            url: navItemConfig.url,
            icon: IconComponent,
            isAdminOnly: curriculumVisibility === 'admin_only',
            gradient: "from-teal-500 to-cyan-600",
            bgGradient: "from-teal-50 to-cyan-50"
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
            type: itemType,
            title: navItemConfig.text,
            url: PRODUCT_TYPES.lesson_plan.url,
            icon: IconComponent,
            isAdminOnly: lessonPlansVisibility === 'admin_only',
            gradient: "from-pink-500 to-rose-600",
            bgGradient: "from-pink-50 to-rose-50"
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

export default function Home() {
  const { currentUser, settings, isLoading } = useUser();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Determine if we're in schools mode
  const isSchoolsMode = settings?.schools_system_enabled || false;
  const isActualAdmin = currentUser?.role === 'admin' && !currentUser?._isImpersonated;
  const isContentCreator = currentUser && !!currentUser.content_creator_agreement_sign_date;

  // Get available products using the same logic as PublicNav
  const availableProducts = getNavigationItems({ currentUser, settings, isActualAdmin, isContentCreator });

  // Dynamic text based on target audience
  const heroTexts = {
    teachers: {
      title: "פלטפורמה חינוכית מקצועית למורים",
      subtitle: "תכנים איכותיים המותאמים לתכנית הלימודים הישראלית ומפותחים על ידי מורים מוסמכים"
    },
    schools: {
      title: "פתרונות חינוכיים דיגיטליים למוסדות חינוך",
      subtitle: "פלטפורמה מקיפה למורים ובתי ספר עם תכנים איכותיים, ניהול כיתות ודוחות מתקדמים"
    }
  };

  const currentMode = isSchoolsMode ? 'schools' : 'teachers';
  const currentTexts = heroTexts[currentMode];

  // Trust signals
  const trustSignals = [
    { icon: "👨‍🏫", title: "מפותח על ידי מורים מוסמכים", description: "כל התכנים נוצרים על ידי מורים מוסמכים עם ניסיון בשטח" },
    { icon: "✅", title: "מותאם לתכנית הלימודים הישראלית", description: "תכנים המבוססים על תכנית הלימודים הרשמית" },
    { icon: "🧪", title: "נבדק בכיתות אמיתיות עם תלמידים", description: "כל תוכן עובר בדיקה מעשית לפני פרסום" },
    { icon: "📈", title: "תכנים מתעדכנים ומתרחבים כל הזמן", description: "ספרייה גדלה ומתרחבת של חומרי לימוד איכותיים" },
    { icon: "🔒", title: "אבטחת מידע ופרטיות מלאה", description: "הגנה מלאה על נתוני התלמידים והמורים" }
  ];

  // CTA texts
  const ctaTexts = {
    teachers: {
      primary: settings?.subscription_system_enabled ? "התחילו מנוי" : "הירשמו עכשיו",
      secondary: "צפו בתכנים"
    },
    schools: {
      primary: "צרו קשר להצעה אישית",
      secondary: "למורים בודדים"
    }
  };

  // Check subscription offer visibility
  const shouldShowSubscriptionOffer = () => {
    if (!currentUser) return false;
    if (!settings?.subscription_system_enabled) return false;
    if (!currentUser.current_subscription_plan_id) return true;
    return false;
  };

  // Check content creators section visibility
  const shouldShowContentCreatorsSection = () => {
    if (!currentUser) return false;
    if (!settings?.nav_content_creators_enabled) return false;

    const contentCreatorsVisibility = settings.nav_content_creators_visibility || 'admins_and_creators';

    if (contentCreatorsVisibility === 'hidden') return false;
    if (contentCreatorsVisibility === 'admin_only' && !isActualAdmin) return false;
    if (contentCreatorsVisibility === 'admins_and_creators' && !isActualAdmin && !isContentCreator) {
      return true; // Show to non-creators so they can join
    }

    return true;
  };

  // Testimonials (only show if array has content)
  const testimonials = settings?.home_testimonials || [];

  // Show loading state while global data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">טוען את המערכת...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-500 via-purple-600 to-teal-600 text-white pt-4 md:pt-8 pb-16 md:pb-24 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-green-400/15 to-emerald-400/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-blue-400/15 to-cyan-400/15 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-right space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                {isSchoolsMode ? "פתרונות חינוכיים מקיפים" : "פלטפורמה חינוכית מתקדמת"}
              </div>

              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <LogoDisplay className="h-32 md:h-40 object-contain mx-auto lg:mx-0 mb-2 max-w-full" />
                <span className="block text-3xl md:text-4xl mt-2 text-purple-100">
                  {currentTexts.title}
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-purple-100 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {currentTexts.subtitle}
              </p>

              {/* Dynamic CTA buttons showing available products */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                {availableProducts.slice(0, 3).map((product, index) => (
                  <Link key={product.type} to={product.url}>
                    <Button
                      size="lg"
                      className={index === 0
                        ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 px-8 py-4 text-lg font-semibold rounded-2xl shadow-xl hover-lift border-0"
                        : "border-2 border-white bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 hover:border-white px-8 py-4 text-lg font-semibold rounded-2xl hover-lift"
                      }
                    >
                      {React.createElement(product.icon, { className: "w-5 h-5 ml-2" })}
                      {product.title}
                      {product.isAdminOnly && <Crown className="w-4 h-4 mr-2 text-orange-300" />}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-pink-400/20 rounded-3xl blur-2xl transform rotate-6"></div>
                <img
                  src="/home.png"
                  alt="תכנים חינוכיים"
                  className="relative z-10 w-full max-w-lg h-96 object-cover rounded-3xl shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Product Showcase Section */}
      {availableProducts.length > 0 && (
        <section className="py-16 md:py-24 bg-gradient-to-br from-blue-50 via-green-50 to-teal-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 md:mb-20">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 rounded-full px-4 py-2 text-sm font-medium mb-4">
                <TrendingUp className="w-4 h-4" />
                התכנים שלנו
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                {isSchoolsMode ? "פתרונות מקיפים לבית הספר" : "מה אנחנו מציעים"}
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {isSchoolsMode
                  ? "פלטפורמה מלאה עם כלי ניהול מתקדמים, תוכן איכותי ומעקב אחר התקדמות"
                  : "תכנים איכותיים שפותחו על ידי מורים מוסמכים ונבדקו בכיתות אמיתיות"
                }
              </p>
            </div>

            <div className={`grid gap-6 md:gap-8 ${
              availableProducts.length === 1 ? 'max-w-md mx-auto' :
              availableProducts.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto' :
              availableProducts.length === 3 ? 'grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto' :
              availableProducts.length <= 6 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
              'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}>
              {availableProducts.map((product) => (
                <Link key={product.type} to={product.url} className="group">
                  <Card className={`border-none shadow-lg hover:shadow-xl transition-all duration-300 group-hover:-translate-y-2 bg-gradient-to-br ${product.bgGradient} overflow-hidden cursor-pointer h-full`}>
                    <CardContent className="p-6 md:p-8 text-center relative h-full flex flex-col">
                      <div className={`w-16 h-16 bg-gradient-to-br ${product.gradient} rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {React.createElement(product.icon, { className: "text-white text-2xl w-8 h-8" })}
                      </div>

                      <div className="flex items-center justify-center gap-2 mb-4">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                          {product.title}
                        </h3>
                        {product.isAdminOnly && (
                          <Crown className="w-5 h-5 text-orange-500" title="מיועד למנהלי מערכת" />
                        )}
                        {product.isPremium && (
                          <Star className="w-5 h-5 text-yellow-500" title="דורש מנוי פרימיום" />
                        )}
                      </div>

                      <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors flex-1 text-sm md:text-base">
                        {getProductDescription(product.type, isSchoolsMode)}
                      </p>

                      <div className="mt-4 pt-4 border-t border-gray-200/50">
                        <span className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors">
                          לחצו לגלישה →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {availableProducts.length > 6 && (
              <div className="text-center mt-12">
                <p className="text-gray-600 text-lg mb-6">
                  ועוד תכנים נוספים מחכים לכם!
                </p>
                <Button variant="outline" size="lg" className="border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50">
                  צפו בכל התכנים
                  <Sparkles className="w-4 h-4 mr-2" />
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trust Signals Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {isSchoolsMode ? "למה בתי ספר בוחרים בנו?" : "למה מורים בוחרים בנו?"}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {isSchoolsMode
                ? "פתרונות מותאמים לבתי ספר עם התמקדות באיכות, בטחון ותמיכה מקצועית"
                : "אמון ואמינות שמבוססים על איכות, מקצועיות וחדשנות חינוכית"
              }
            </p>
          </div>

          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {trustSignals.map((signal, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white text-2xl">{signal.icon}</span>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 group-hover:text-gray-800 transition-colors">
                  {signal.title}
                </h3>
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                  {signal.description}
                </p>
              </div>
            ))}
          </div>

          {isSchoolsMode && (
            <div className="mt-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12 text-center">
              <div className="max-w-3xl mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <GraduationCap className="text-white w-10 h-10" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  פתרון מקיף לבתי ספר
                </h3>
                <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                  מערכת מלאה הכוללת ניהול משתמשים, דוחות מתקדמים, מעקב התקדמות ופלטפורמת תכנים איכותית המותאמת לתכנית הלימודים הישראלית
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>ניהול מרכזי</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>דוחות מפורטים</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>תמיכה מקצועית</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Content Creators Section - Conditional */}
      {shouldShowContentCreatorsSection() && (
        <section className="py-16 md:py-24 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 rounded-full px-4 py-2 text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                קהילת יוצרי תוכן
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {isContentCreator
                  ? "ברוכים הבאים לקהילת יוצרי התוכן"
                  : isSchoolsMode
                    ? "הצטרפו לקהילת יוצרי התוכן"
                    : "מורים יוצרים תכנים איכותיים"
                }
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {isContentCreator
                  ? "כבר אתם חלק מהקהילה! גלו את הכלים והמשאבים שלכם"
                  : "הצטרפו למורים שכבר יוצרים ומשתפים תכנים איכותיים עם הקהילה"
                }
              </p>
            </div>

            <div className="grid gap-8 md:gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {isSchoolsMode ? "יצירת תכנים ברמת המוסד" : "יצירה ושיתוף תכנים"}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {isSchoolsMode
                          ? "פתחו תכנים מותאמים למוסד החינוכי שלכם ושתפו עם מורים נוספים"
                          : "פתחו תכנים חינוכיים איכותיים ושתפו אותם עם מורים ברחבי הארץ"
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        הכרה והערכה מקצועית
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        קבלו הכרה על התכנים שלכם, בנו מוניטין מקצועי ותרמו לקהילה החינוכית
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        כלים מתקדמים ליצירה
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        גישה לכלי יצירה מתקדמים, תבניות מוכנות ותמיכה טכנית מלאה
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  {isContentCreator ? (
                    <Link to="/creator-portal">
                      <Button size="lg" className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                        <Users className="w-5 h-5 ml-2" />
                        כניסה לפורטל יוצרי תוכן
                      </Button>
                    </Link>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link to="/creator-signup">
                        <Button size="lg" className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                          <Star className="w-5 h-5 ml-2" />
                          הצטרפו כיוצרי תוכן
                        </Button>
                      </Link>
                      <Button variant="outline" size="lg" className="border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 px-8 py-3 rounded-xl">
                        <MessageCircle className="w-5 h-5 ml-2" />
                        לפרטים נוספים
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-3xl blur-2xl transform rotate-3"></div>
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                  alt="קהילת יוצרי תוכן"
                  className="relative z-10 w-full h-80 object-cover rounded-3xl shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-700"
                />
                <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 z-20">
                  <p className="text-sm text-gray-700 font-medium text-center">
                    למעלה מ-{isSchoolsMode ? "50 מוסדות חינוך" : "200 מורים"} כבר משתפים תכנים באיכות גבוהה
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Subscription Benefits Section - Conditional */}
      {shouldShowSubscriptionOffer() && (
        <section className="py-16 md:py-24 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 rounded-full px-4 py-2 text-sm font-medium mb-4">
                <Crown className="w-4 h-4" />
                {isSchoolsMode ? "מנוי מוסדי" : "מנוי פרימיום"}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {isSchoolsMode ? "פתרון מנוי מותאם לבתי ספר" : "שדרגו למנוי פרימיום"}
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {isSchoolsMode
                  ? "קבלו גישה מלאה לכל התכנים, כלי הניהול והתמיכה המקצועית"
                  : "גישה בלתי מוגבלת לכל התכנים החינוכיים, הכלים המתקדמים והתכונות הפרימיום"
                }
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Free Features */}
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">תכנים בסיסיים</h3>
                  <p className="text-2xl font-bold text-gray-600">חינם</p>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-600">גישה לתכנים בסיסיים</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-600">עד 3 הורדות בחודש</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-600">תמיכה בסיסית</span>
                  </li>
                </ul>

                <Button variant="outline" className="w-full" size="lg">
                  התחילו בחינם
                </Button>
              </div>

              {/* Premium Plan */}
              <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-3xl p-8 shadow-2xl text-white relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-full text-sm font-bold">
                    הכי פופולרי
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {isSchoolsMode ? "מנוי מוסדי" : "מנוי פרימיום"}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold">₪99</p>
                    <p className="text-white/80">לחודש</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span>גישה בלתי מוגבלת לכל התכנים</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span>הורדות בלתי מוגבלות</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span>כלי יצירה מתקדמים</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span>תמיכה מקצועית מלאה</span>
                  </li>
                  {isSchoolsMode && (
                    <>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-white" />
                        <span>ניהול מרכזי</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-white" />
                        <span>דוחות מתקדמים</span>
                      </li>
                    </>
                  )}
                </ul>

                <Button
                  className="w-full bg-white text-orange-600 hover:bg-gray-50"
                  size="lg"
                  onClick={() => setShowSubscriptionModal(true)}
                >
                  התחילו מנוי עכשיו
                  <Star className="w-4 h-4 mr-2" />
                </Button>
              </div>

              {/* Enterprise/School Plan */}
              {isSchoolsMode && (
                <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-blue-200">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">מנוי ארגוני</h3>
                    <p className="text-2xl font-bold text-gray-600">מותאם אישית</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-600">כל התכנות מהמנוי המוסדי</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-600">הכשרות מקצועיות</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-600">תמיכה מוקדית 24/7</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-600">אינטגרציה עם מערכות קיימות</span>
                    </li>
                  </ul>

                  <Button variant="outline" className="w-full border-blue-200 hover:border-blue-300 hover:bg-blue-50" size="lg">
                    <Phone className="w-4 h-4 ml-2" />
                    צרו קשר להצעה
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-16 text-center">
              <p className="text-gray-600 mb-6 leading-relaxed">
                {isSchoolsMode
                  ? "למעלה מ-200 בתי ספר כבר נהנים מהתכנים שלנו"
                  : "למעלה מ-5,000 מורים כבר נהנים מהתכנים שלנו"
                }
              </p>
              <div className="flex justify-center items-center gap-8 opacity-60">
                <span className="text-sm text-gray-500">✓ ביטול בכל עת</span>
                <span className="text-sm text-gray-500">✓ 30 יום החזר מלא</span>
                <span className="text-sm text-gray-500">✓ תמיכה בעברית</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* School Solutions Section - Schools Mode Only */}
      {isSchoolsMode && (
        <section className="py-16 md:py-24 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 rounded-full px-4 py-2 text-sm font-medium mb-4">
                <GraduationCap className="w-4 h-4" />
                פתרונות למוסדות חינוך
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                פלטפורמה מקיפה לבתי ספר
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                מערכת מלאה המותאמת לצרכים הייחודיים של מוסדות חינוך עם כלי ניהול מתקדמים,
                תכנים איכותיים ותמיכה מקצועית מלאה
              </p>
            </div>

            <div className="grid gap-12 lg:grid-cols-2 items-center mb-16">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                  ניהול מרכזי ובקרה מלאה
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        ניהול משתמשים מתקדם
                      </h4>
                      <p className="text-gray-600 leading-relaxed">
                        הוספה, עריכה וניהול של מורים, תלמידים וצוות בקלות. ניהול הרשאות ותפקידים ברמת המוסד
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        דוחות מתקדמים וניתוח נתונים
                      </h4>
                      <p className="text-gray-600 leading-relaxed">
                        מעקב אחר התקדמות התלמידים, שימוש במשאבים ויעילות המערכת עם דוחות מפורטים וגרפים חזותיים
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        התאמה אישית לצרכי בית הספר
                      </h4>
                      <p className="text-gray-600 leading-relaxed">
                        התאמת המערכת לצרכים הספציפיים של המוסד, מיתוג אישי וחיבור למערכות הקיימות
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-3xl blur-2xl transform -rotate-3"></div>
                <img
                  src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                  alt="ניהול מערכת בית ספר"
                  className="relative z-10 w-full h-96 object-cover rounded-3xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-700"
                />
              </div>
            </div>

            {/* Key Features Grid */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-16">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center group hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">אבטחת נתונים</h4>
                <p className="text-gray-600 text-sm">הגנה מלאה על נתוני התלמידים והמורים לפי תקני GDPR</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center group hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">תכנית לימודים</h4>
                <p className="text-gray-600 text-sm">מותאם לתכנית הלימודים הישראלית עם עדכונים שוטפים</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center group hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">תמיכה מקצועית</h4>
                <p className="text-gray-600 text-sm">תמיכה טכנית ופדגוגית מלאה עם ייעוץ מקצועי</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center group hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">מעקב התקדמות</h4>
                <p className="text-gray-600 text-sm">מעקב מפורט אחר התקדמות כל תלמיד וכיתה</p>
              </div>
            </div>

            {/* Success Statistics */}
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-blue-100">
              <div className="text-center mb-12">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  תוצאות מוכחות במוסדות החינוך
                </h3>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  בתי ספר שהטמיעו את המערכת דיווחו על שיפור משמעותי בתהליכי הלמידה וההוראה
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-3 text-center">
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">95%</div>
                  <p className="text-gray-600 font-medium">משביעות רצון מהמורים</p>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-green-600 mb-2">40%</div>
                  <p className="text-gray-600 font-medium">חיסכון בזמן הכנת שיעורים</p>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-purple-600 mb-2">200+</div>
                  <p className="text-gray-600 font-medium">מוסדות חינוך משתמשים</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Dynamic Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 rounded-full px-4 py-2 text-sm font-medium mb-4">
                <MessageCircle className="w-4 h-4" />
                מה אומרים עלינו
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {isSchoolsMode ? "מה אומרים מנהלי בתי ספר" : "מה אומרים המורים"}
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {isSchoolsMode
                  ? "מוסדות חינוך ברחבי הארץ משתפים את החוויה שלהם עם הפלטפורמה"
                  : "מורים ברחבי הארץ משתפים את החוויה שלהם עם התכנים שלנו"
                }
              </p>
            </div>

            <div className={`grid gap-8 ${
              testimonials.length === 1 ? 'max-w-2xl mx-auto' :
              testimonials.length === 2 ? 'grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto' :
              testimonials.length <= 4 ? 'grid-cols-1 md:grid-cols-2' :
              'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 shadow-lg border border-gray-200 group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Quote Icon */}
                  <div className="mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto md:mx-0">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Testimonial Content */}
                  <blockquote className="text-gray-700 text-lg leading-relaxed mb-6 group-hover:text-gray-800 transition-colors">
                    "{testimonial.content || testimonial.text}"
                  </blockquote>

                  {/* Rating Stars */}
                  {(testimonial.rating || testimonial.stars) && (
                    <div className="flex justify-center md:justify-start gap-1 mb-6">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < (testimonial.rating || testimonial.stars)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Author Info */}
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    {(testimonial.avatar || testimonial.image) ? (
                      <img
                        src={testimonial.avatar || testimonial.image}
                        alt={testimonial.name || testimonial.author}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white font-semibold text-lg">
                          {(testimonial.name || testimonial.author)?.charAt(0)}
                        </span>
                      </div>
                    )}

                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-lg">
                        {testimonial.name || testimonial.author}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {testimonial.title || testimonial.role || (isSchoolsMode ? "מנהל/ת בית ספר" : "מור/ה")}
                      </p>
                      {(testimonial.school || testimonial.organization) && (
                        <p className="text-gray-500 text-xs">
                          {testimonial.school || testimonial.organization}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Call to Action for More Testimonials */}
            {testimonials.length >= 3 && (
              <div className="text-center mt-16">
                <p className="text-gray-600 text-lg mb-6">
                  {isSchoolsMode
                    ? "למעלה מ-200 מוסדות חינוך כבר נהנים מהפלטפורמה"
                    : "למעלה מ-5,000 מורים כבר משתמשים בתכנים שלנו"
                  }
                </p>
                <div className="flex justify-center items-center gap-8 text-sm text-gray-500">
                  <span className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    4.8/5 דירוג ממוצע
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    100% המלצות חיוביות
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Dynamic CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-500 via-purple-600 to-teal-600 text-white relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-green-400/15 to-emerald-400/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-blue-400/15 to-cyan-400/15 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              {isSchoolsMode ? "מוכנים להתחיל?" : "הגיע הזמן להתחיל!"}
            </div>

            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              {isSchoolsMode ? (
                <>
                  <span className="block">מוכנים לשפר את</span>
                  <span className="block bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                    המוסד החינוכי שלכם?
                  </span>
                </>
              ) : (
                <>
                  <span className="block">מוכנים לשפר את</span>
                  <span className="block bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                    השיעורים שלכם?
                  </span>
                </>
              )}
            </h2>

            <p className="text-xl md:text-2xl text-purple-100 leading-relaxed max-w-4xl mx-auto">
              {isSchoolsMode ? (
                currentUser ? (
                  "הגיע הזמן לשדרג את המערכת החינוכית שלכם עם פתרון מקיף ומתקדם"
                ) : (
                  "הצטרפו לבתי הספר שכבר נהנים מפלטפורמה מקיפה לחינוך דיגיטלי"
                )
              ) : (
                currentUser ? (
                  "הגיע הזמן לגלות תכנים חדשים ולשפר את חוויית ההוראה שלכם"
                ) : (
                  "הצטרפו לקהילת המורים שכבר נהנים מתכנים איכותיים ומותאמים אישית"
                )
              )}
            </p>

            {/* Dynamic Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
              {currentUser ? (
                // Logged-in user CTAs
                <>
                  {availableProducts.length > 0 && (
                    <Link to={availableProducts[0].url}>
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 px-12 py-6 text-xl font-semibold rounded-2xl shadow-2xl hover-lift border-0"
                      >
                        {React.createElement(availableProducts[0].icon, { className: "w-6 h-6 ml-2" })}
                        {availableProducts[0].title}
                      </Button>
                    </Link>
                  )}

                  {settings?.subscription_system_enabled && shouldShowSubscriptionOffer() && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-white bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 hover:border-white px-12 py-6 text-xl font-semibold rounded-2xl hover-lift"
                      onClick={() => setShowSubscriptionModal(true)}
                    >
                      <Crown className="w-6 h-6 ml-2" />
                      {ctaTexts[currentMode].primary}
                    </Button>
                  )}
                </>
              ) : (
                // Non-logged-in user CTAs
                <>
                  <Link to="/signup">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 px-12 py-6 text-xl font-semibold rounded-2xl shadow-2xl hover-lift border-0"
                    >
                      <Sparkles className="w-6 h-6 ml-2" />
                      {isSchoolsMode ? "התחילו ניסיון חינם" : "הירשמו עכשיו"}
                    </Button>
                  </Link>

                  {availableProducts.length > 0 && (
                    <Link to={availableProducts[0].url}>
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-2 border-white bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 hover:border-white px-12 py-6 text-xl font-semibold rounded-2xl hover-lift"
                      >
                        {React.createElement(availableProducts[0].icon, { className: "w-6 h-6 ml-2" })}
                        {ctaTexts[currentMode].secondary}
                      </Button>
                    </Link>
                  )}
                </>
              )}

              {/* Contact CTA for schools */}
              {isSchoolsMode && (
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 hover:border-white px-12 py-6 text-xl font-semibold rounded-2xl hover-lift"
                >
                  <Phone className="w-6 h-6 ml-2" />
                  צרו קשר לייעוץ
                </Button>
              )}
            </div>

            {/* Trust indicators */}
            <div className="pt-12 border-t border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="flex items-center justify-center gap-3 text-purple-100">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-lg">
                    מאות תכנים לשימוש בכיתה
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3 text-purple-100">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-lg">תוכן מותאם לתוכנית הלימודים</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-purple-100">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-lg">
                    {isSchoolsMode ? "התקנה ותמיכה מלאה" : "גישה מיידית"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}