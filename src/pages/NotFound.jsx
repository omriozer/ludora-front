import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/contexts/UserContext";
import {
  canUserSeeItem,
  isActualAdmin,
  isContentCreator,
  getVisibleNavItems,
  getNavItemVisibility,
  isNavItemEnabled
} from "@/utils/navigationUtils";
import {
  Home,
  ArrowRight,
  FileText,
  Play,
  Calendar,
  BookOpen,
  Users
} from "lucide-react";

export default function NotFound() {
  const { settings, currentUser, isImpersonating } = useUser();

  // Function to check if navigation item should be visible using full 5-tier permission system
  const shouldShowNavItem = (itemKey) => {
    if (!settings) return false;

    // Check if item is enabled
    if (!isNavItemEnabled(settings, `nav_${itemKey}_enabled`)) {
      return false;
    }

    // Check visibility permissions using full 5-tier system
    const visibility = getNavItemVisibility(settings, `nav_${itemKey}_visibility`, 'public');
    const actualAdmin = isActualAdmin(currentUser, isImpersonating);
    const contentCreator = isContentCreator(currentUser);

    return canUserSeeItem(visibility, currentUser, actualAdmin, contentCreator);
  };

  const availablePages = [];

  if (shouldShowNavItem('files')) {
    availablePages.push({
      title: settings?.nav_files_text || getProductTypeName('file', 'plural'),
      url: PRODUCT_TYPES.file.url,
      icon: FileText,
      description: `${getProductTypeName('file', 'plural')} דיגיטליים`
    });
  }

  if (shouldShowNavItem('games')) {
    availablePages.push({
      title: settings?.nav_games_text || getProductTypeName('game', 'plural'),
      url: PRODUCT_TYPES.game.url,
      icon: Play,
      description: `${getProductTypeName('game', 'plural')} חינוכיים אינטראקטיביים`
    });
  }

  if (shouldShowNavItem('workshops')) {
    availablePages.push({
      title: settings?.nav_workshops_text || getProductTypeName('workshop', 'plural'),
      url: PRODUCT_TYPES.workshop.url,
      icon: Calendar,
      description: `${getProductTypeName('workshop', 'plural')} מקצועיות`
    });
  }

  if (shouldShowNavItem('courses')) {
    availablePages.push({
      title: settings?.nav_courses_text || getProductTypeName('course', 'plural'),
      url: PRODUCT_TYPES.course.url,
      icon: BookOpen,
      description: `${getProductTypeName('course', 'plural')} מקוונים`
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-blue-50/60 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">

        {/* Modern 404 Hero Section */}
        <div className="mb-12">
          <div className="relative mb-8">
            {/* Decorative background elements */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-200/30 via-pink-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
            </div>

            {/* Main 404 text */}
            <div className="text-9xl font-black text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text mb-6 tracking-tight">
              404
            </div>

            {/* Ludora branding integration */}
            <div className="mb-4">
              <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-wide">
                הדף לא נמצא ב
                <span className="text-transparent bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text"> Ludora</span>
              </h1>
              <p className="text-gray-600 text-xl max-w-2xl mx-auto leading-relaxed">
                הדף שחיפשת אינו קיים או הועבר למקום אחר.
                <br className="hidden sm:block" />
                בחר מהאפשרויות הזמינות להמשך הדרך
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Available Pages Grid */}
        {availablePages.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center justify-center gap-3">
              <div className="w-8 h-0.5 bg-gradient-to-r from-purple-600 to-transparent"></div>
              תוכן זמין עבורך
              <div className="w-8 h-0.5 bg-gradient-to-l from-blue-600 to-transparent"></div>
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {availablePages.map((page, index) => (
                <Card
                  key={index}
                  className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-0 shadow-lg bg-white/80 backdrop-blur-sm"
                >
                  <CardContent className="p-6">
                    <Link
                      to={page.url}
                      className="block text-right space-y-4 h-full"
                    >
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center group-hover:from-purple-200 group-hover:to-blue-200 transition-all duration-300">
                          <page.icon className="w-6 h-6 text-purple-600 group-hover:text-blue-600 transition-colors duration-300" />
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors duration-300 transform group-hover:translate-x-1" />
                      </div>

                      <div className="space-y-2">
                        <div className="font-bold text-lg text-gray-900 group-hover:text-purple-700 transition-colors duration-300">
                          {page.title}
                        </div>
                        <div className="text-sm text-gray-600 leading-relaxed">
                          {page.description}
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Back to Home Button */}
        <div className="space-y-4">
          <Link to="/">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600 hover:from-purple-700 hover:via-purple-800 hover:to-blue-700 text-white px-10 py-6 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-lg font-semibold"
            >
              <Home className="w-6 h-6 ml-3" />
              חזרה לעמוד הבית
            </Button>
          </Link>

          {/* Additional help text */}
          <p className="text-sm text-gray-500 mt-6 max-w-md mx-auto">
            זקוק לעזרה? ניתן לפנות לתמיכה דרך עמוד הבית או לחפש בקטלוג המוצרים
          </p>
        </div>
      </div>
    </div>
  );
}