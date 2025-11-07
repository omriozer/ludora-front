import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/contexts/UserContext";
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
  const { settings } = useUser();

  // Function to check if navigation item should be visible
  const shouldShowNavItem = (itemKey) => {
    if (!settings) return false;
    
    const isEnabled = settings[`nav_${itemKey}_enabled`] !== false;
    if (!isEnabled) return false;

    const visibility = settings[`nav_${itemKey}_visibility`] || 'public';
    return visibility === 'public'; // Only show public items in 404
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="text-8xl font-bold text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text mb-4">
            404
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            הדף לא נמצא
          </h1>
          <p className="text-gray-600 text-lg">
            הדף שחיפשת אינו קיים או הועבר למקום אחר
          </p>
        </div>

        {/* Available Pages */}
        {availablePages.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              דפים זמינים:
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {availablePages.map((page, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <Link
                      to={page.url}
                      className="flex items-center gap-3 text-right hover:text-purple-600 transition-colors"
                    >
                      <page.icon className="w-6 h-6 text-purple-500" />
                      <div>
                        <div className="font-semibold">{page.title}</div>
                        <div className="text-sm text-gray-500">{page.description}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 mr-auto text-gray-400" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div>
          <Link to="/">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
              <Home className="w-5 h-5 ml-2" />
              חזרה לעמוד הבית
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}