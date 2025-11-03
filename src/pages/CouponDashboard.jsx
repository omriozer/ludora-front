import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { apiRequest } from '@/services/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tag,
  Plus,
  BarChart3,
  Copy,
  List,
  ArrowRight,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Activity,
  Zap
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { clog, cerror } from "@/lib/utils";

export default function CouponDashboard() {
  const { currentUser, isLoading: userLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCoupons: 0,
    activeCoupons: 0,
    totalUsage: 0,
    expiringSoon: 0
  });

  useEffect(() => {
    if (currentUser && !userLoading) {
      loadData();
    }
  }, [currentUser, userLoading]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get coupon statistics
      const coupons = await apiRequest('/entities/coupon');

      // Calculate statistics
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const stats = {
        totalCoupons: coupons.length,
        activeCoupons: coupons.filter(c => c.is_active).length,
        totalUsage: coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0),
        expiringSoon: coupons.filter(c => {
          if (!c.valid_until || !c.is_active) return false;
          const expiryDate = new Date(c.valid_until);
          return expiryDate <= nextWeek && expiryDate >= now;
        }).length
      };

      setStats(stats);
    } catch (error) {
      cerror("Error loading coupon dashboard data:", error);
      toast({
        title: "שגיאה בטעינת הנתונים",
        description: "לא ניתן לטעון את נתוני לוח הבקרה",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  // Show loading while user context is loading
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-3">טוען...</span>
      </div>
    );
  }

  const dashboardItems = [
    {
      title: "ניהול קופונים",
      description: "צפייה, עריכה ומחיקה של קופונים קיימים",
      icon: <List className="w-8 h-8" />,
      link: "/coupons/manage",
      color: "bg-blue-500",
      textColor: "text-blue-500"
    },
    {
      title: "יצירת קופון חדש",
      description: "צור קופון הנחה חדש עם התאמות מותאמות אישית",
      icon: <Plus className="w-8 h-8" />,
      link: "/coupons/create",
      color: "bg-green-500",
      textColor: "text-green-500"
    },
    {
      title: "ניתוח ודוחות",
      description: "צפה בסטטיסטיקות ואנליטיקה של שימוש בקופונים",
      icon: <BarChart3 className="w-8 h-8" />,
      link: "/coupons/analytics",
      color: "bg-purple-500",
      textColor: "text-purple-500"
    },
    {
      title: "יצירה בכמויות",
      description: "צור מספר קופונים בו-זמנית עם דפוסים מותאמים",
      icon: <Copy className="w-8 h-8" />,
      link: "/coupons/bulk-generate",
      color: "bg-orange-500",
      textColor: "text-orange-500"
    }
  ];

  const statCards = [
    {
      title: "סה״כ קופונים",
      value: stats.totalCoupons,
      icon: <Tag className="w-6 h-6" />,
      color: "text-blue-600"
    },
    {
      title: "קופונים פעילים",
      value: stats.activeCoupons,
      icon: <Activity className="w-6 h-6" />,
      color: "text-green-600"
    },
    {
      title: "סה״כ שימושים",
      value: stats.totalUsage,
      icon: <TrendingUp className="w-6 h-6" />,
      color: "text-purple-600"
    },
    {
      title: "פגים בקרוב",
      value: stats.expiringSoon,
      icon: <Calendar className="w-6 h-6" />,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            מרכז ניהול קופוני הנחה
          </h1>
          <p className="text-gray-600">
            ברוכים הבאים למרכז הבקרה לניהול קופוני הנחה ומבצעים
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="mr-3">טוען נתונים...</span>
          </div>
        )}

        {/* Statistics Cards */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stat.value.toLocaleString()}
                      </p>
                    </div>
                    <div className={`${stat.color}`}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Dashboard Items */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {dashboardItems.map((item, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${item.color} text-white`}>
                      {item.icon}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {item.title}
                  </h3>

                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {item.description}
                  </p>

                  <Link to={item.link}>
                    <Button
                      className="w-full"
                      variant="outline"
                    >
                      <span className="mr-2">עבור לדף</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {!isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                פעולות מהירות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Link to="/coupons/create">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    קופון חדש
                  </Button>
                </Link>
                <Link to="/coupons/manage">
                  <Button size="sm" variant="outline">
                    <List className="w-4 h-4 mr-2" />
                    רשימת קופונים
                  </Button>
                </Link>
                <Link to="/coupons/analytics">
                  <Button size="sm" variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    דוחות
                  </Button>
                </Link>
                <Link to="/coupons/bulk-generate">
                  <Button size="sm" variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    יצירה בכמויות
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}