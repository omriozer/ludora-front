import { useState, useEffect, useCallback } from "react";
import { Game, Workshop, Course, File, Tool, LessonPlan } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { luderror } from "@/lib/ludlog";
import {
  Users,
  Plus,
  TrendingUp,
  Crown,
  AlertCircle,
  CheckCircle,
  FileText,
  Play,
  Calendar,
  BookOpen,
  Eye,
  Edit,
  Settings as SettingsIcon,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { NAV_ITEMS } from "@/config/productTypes";

export default function ContentCreatorPortal() {
  const { currentUser, settings, isLoading: userLoading, isAdmin } = useUser();
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [stats, setStats] = useState({
    games: { total: 0, published: 0 },
    files: { total: 0, published: 0 },
    tools: { total: 0, published: 0 },
    workshops: { total: 0, published: 0 },
    courses: { total: 0, published: 0 },
    lesson_plans: { total: 0, published: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use global user and settings from UserContext
      const userData = currentUser;
      const currentSettings = settings || {};

      // Moved inside useCallback to prevent dependency issues
      const checkAvailableFeatures = (user, settings) => {
        const features = [];
        const hasAdminAccess = isAdmin();
        
        // Define all possible features using centralized configuration
        const featureDefinitions = [
          NAV_ITEMS.files,
          NAV_ITEMS.tools,
          NAV_ITEMS.games,
          NAV_ITEMS.workshops,
          NAV_ITEMS.courses,
          NAV_ITEMS.lesson_plans
        ].map(navItem => {
          return {
            key: navItem.key,
            name: navItem.text,
            description: navItem.description,
            icon: navItem.key === 'files' ? FileText :
                  navItem.key === 'tools' ? SettingsIcon :
                  navItem.key === 'games' ? Play :
                  navItem.key === 'workshops' ? Calendar :
                  navItem.key === 'courses' ? BookOpen :
                  navItem.key === 'lesson_plans' ? BookOpen : FileText,
            gradient: navItem.gradient,
            bgGradient: navItem.gradient.replace('from-', 'from-').replace('via-', '').replace('to-', 'to-').replace(/(\d+)/g, '50'),
            createUrl: `/${navItem.key}?context=creator`,
            manageUrl: `/${navItem.key}?context=creator`
          };
        });

        // Moved inside useCallback to prevent dependency issues
        const shouldShowFeature = (visibility, hasAdminAccess) => {
          const isContentCreator = currentUser && !!currentUser.content_creator_agreement_sign_date;

          switch (visibility) {
            case 'public':
              return true;
            case 'logged_in_users':
              return !!currentUser;
            case 'admin_only':
              return hasAdminAccess;
            case 'admins_and_creators':
              return hasAdminAccess || isContentCreator;
            case 'hidden':
              return false;
            default:
              return true;
          }
        };

        // Check each feature against settings and content creator permissions
        featureDefinitions.forEach(feature => {
          const visibility = settings[`nav_${feature.key}_visibility`] || 'public';
          const enabled = settings[`nav_${feature.key}_enabled`] !== false;

          // Check content creator permissions for non-admin users
          let hasContentCreatorPermission = true;
          if (!hasAdminAccess) {
            const permissionKey = `allow_content_creator_${feature.key}`;
            hasContentCreatorPermission = settings[permissionKey] === true;
          }

          if (enabled && shouldShowFeature(visibility, hasAdminAccess) && hasContentCreatorPermission) {
            features.push({
              ...feature,
              visibility,
              displayName: feature.name
            });
          }
        });

        return features;
      };

      const features = checkAvailableFeatures(userData, currentSettings);
      setAvailableFeatures(features);

      // Load stats for available features
      await loadStats(userData, features);

    } catch (error) {
      luderror.ui("Error loading data", error);
      showMessage('error', 'שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  }, [currentUser, settings, showMessage]); // showMessage is a dependency, as it's defined outside

  const loadStats = async (user, features) => {
    try {
      const newStats = {
        games: { total: 0, published: 0 },
        files: { total: 0, published: 0 },
        tools: { total: 0, published: 0 },
        workshops: { total: 0, published: 0 },
        courses: { total: 0, published: 0 },
        lesson_plans: { total: 0, published: 0 }
      };

      // Load games stats if games feature is available
      if (features.some(f => f.key === NAV_ITEMS.games.key)) {
        try {
          const userGames = await Game.filter({ created_by_id: user.id });
          newStats.games.total = userGames.length;
          newStats.games.published = userGames.filter(game => game.is_published).length;
        } catch (error) {
          // Skip silently - not critical
        }
      }

      // Load stats for individual entity types
      const entityPromises = [];

      if (features.some(f => f.key === NAV_ITEMS.files.key)) {
        entityPromises.push(
          File.filter({ created_by_id: user.id }).then(files => ({
            key: NAV_ITEMS.files.key,
            data: files
          })).catch(error => {
            return { key: NAV_ITEMS.files.key, data: [] };
          })
        );
      }

      if (features.some(f => f.key === NAV_ITEMS.tools.key)) {
        entityPromises.push(
          Tool.filter({ created_by_id: user.id }).then(tools => ({
            key: NAV_ITEMS.tools.key,
            data: tools
          })).catch(error => {
            return { key: NAV_ITEMS.tools.key, data: [] };
          })
        );
      }

      if (features.some(f => f.key === NAV_ITEMS.workshops.key)) {
        entityPromises.push(
          Workshop.filter({ created_by_id: user.id }).then(workshops => ({
            key: NAV_ITEMS.workshops.key,
            data: workshops
          })).catch(error => {
            return { key: NAV_ITEMS.workshops.key, data: [] };
          })
        );
      }

      if (features.some(f => f.key === NAV_ITEMS.courses.key)) {
        entityPromises.push(
          Course.filter({ created_by_id: user.id }).then(courses => ({
            key: NAV_ITEMS.courses.key,
            data: courses
          })).catch(error => {
            return { key: NAV_ITEMS.courses.key, data: [] };
          })
        );
      }

      if (features.some(f => f.key === NAV_ITEMS.lesson_plans.key)) {
        entityPromises.push(
          LessonPlan.filter({ created_by_id: user.id }).then(lessonPlans => ({
            key: NAV_ITEMS.lesson_plans.key,
            data: lessonPlans
          })).catch(error => {
            return { key: NAV_ITEMS.lesson_plans.key, data: [] };
          })
        );
      }

      // Load all entity data in parallel
      if (entityPromises.length > 0) {
        try {
          const entityResults = await Promise.all(entityPromises);

          entityResults.forEach(result => {
            newStats[result.key] = {
              total: result.data.length,
              published: result.data.filter(item => item.is_published).length
            };
          });
        } catch (error) {
          // Skip silently - not critical
        }
      }

      setStats(newStats);
    } catch (error) {
      // Skip silently - not critical
    }
  };

  useEffect(() => {
    if (currentUser && !userLoading) {
      loadData();
    }
  }, [currentUser, userLoading, loadData]);

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">טוען פורטל יוצרי תוכן...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !currentUser.content_creator_agreement_sign_date) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Alert className="max-w-md border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            אין לך הרשאות גישה לפורטל יוצרי התוכן. אנא חתום על הסכם יוצר תוכן תחילה.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (availableFeatures.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md border-gray-200">
          <CardHeader className="text-center">
            <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-xl text-gray-700">אין פיצ'רים זמינים</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center">
              כרגע אין פיצ'רים זמינים ליצירת תוכן. אנא צור קשר עם מנהל המערכת.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalContent = Object.values(stats).reduce((sum, stat) => sum + stat.total, 0);
  const totalPublished = Object.values(stats).reduce((sum, stat) => sum + stat.published, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">פורטל יוצרי תוכן</h1>
            {isAdmin() && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-semibold">
                <Crown className="w-3 h-3 mr-1" />
                מנהל
              </Badge>
            )}
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            ברוכים הבאים לפורטל יוצרי התוכן! כאן תוכלו ליצור ולנהל תכנים חינוכיים איכותיים.
          </p>
        </div>

        {/* Message */}
        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            {message.type === 'success' ? 
              <CheckCircle className="h-4 w-4 text-green-600" /> : 
              <AlertCircle className="h-4 w-4 text-red-600" />
            }
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">תכנים שנוצרו</p>
                  <p className="text-3xl font-bold">{totalContent}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">תכנים פרסומים</p>
                  <p className="text-3xl font-bold">{totalPublished}</p>
                </div>
                <Eye className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-none shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">פיצ'רים זמינים</p>
                  <p className="text-3xl font-bold">{availableFeatures.length}</p>
                </div>
                <Sparkles className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableFeatures.map(feature => {
            const featureStats = stats[feature.key === 'files' ? 'files' : feature.key + 's'] || { total: 0, published: 0 };
            const IconComponent = feature.icon;
            
            return (
              <Card key={feature.key} className={`bg-gradient-to-br ${feature.bgGradient} border-none shadow-lg hover:shadow-xl transition-all duration-300 group`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-900">{feature.displayName}</CardTitle>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                    
                    {/* Visibility badge */}
                    {feature.visibility !== 'public' && (
                      <Badge variant="outline" className="text-xs">
                        {feature.visibility === 'admin_only' ? (
                          <>
                            <Crown className="w-3 h-3 mr-1" />
                            מנהלים
                          </>
                        ) : (
                          feature.visibility
                        )}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{featureStats.total}</p>
                      <p className="text-xs text-gray-600">סה"כ נוצרו</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{featureStats.published}</p>
                      <p className="text-xs text-gray-600">פורסמו</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <Link to={feature.createUrl} className="flex-1">
                      <Button className={`w-full bg-gradient-to-r ${feature.gradient} text-white hover:opacity-90 shadow-md hover:shadow-lg transition-all duration-300`}>
                        <Plus className="w-4 h-4 mr-2" />
                        צור חדש
                      </Button>
                    </Link>
                    <Link to={feature.manageUrl}>
                      <Button variant="outline" className="bg-white/60 hover:bg-white/80">
                        <Edit className="w-4 h-4 mr-2" />
                        נהל
                      </Button>
                    </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Help Section */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">זקוקים לעזרה?</h3>
              <p className="text-gray-600 mb-4">
                הפיצ'רים המוצגים כאן מבוססים על הגדרות המערכת. אם אתם לא רואים פיצ'ר מסוים, ייתכן שהוא מוסתר או מוגבל למנהלים בלבד.
              </p>
              <p className="text-sm text-gray-500">
                לשאלות נוספות או בעיות טכניות, אנא צרו קשר עם מנהל המערכת.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
