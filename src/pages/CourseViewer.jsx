
import React, { useState, useEffect, useCallback } from "react";
import { Course, Purchase, User } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  CheckCircle,
  Lock,
  BookOpen,
  Clock,
  FileText,
  ArrowRight,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { getText } from "../components/utils/getText";
import VideoPlayer from '../components/VideoPlayer'; // Added import for VideoPlayer
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";

export default function CourseViewer() {
  const [course, setCourse] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userPurchase, setUserPurchase] = useState(null);
  const [currentModule, setCurrentModule] = useState(0);
  const [completedModules, setCompletedModules] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [courseTexts, setCourseTexts] = useState({});

  const loadData = useCallback(async () => {
    try {
      const texts = {
        title: await getText("courseViewer.title", `צופה ${getProductTypeName('course', 'singular')}`),
        moduleCompleted: await getText("courseViewer.moduleCompleted", "מודול הושלם"),
        nextModule: await getText("courseViewer.nextModule", "המודול הבא"),
        prevModule: await getText("courseViewer.prevModule", "המודול הקודם"),
        courseProgress: await getText("courseViewer.courseProgress", `התקדמות ב${getProductTypeName('course', 'singular')}`),
        modules: await getText("courseViewer.modules", "מודולים"),
        duration: await getText("courseViewer.duration", "משך"),
        materials: await getText("courseViewer.materials", "חומרי עזר"),
        completed: await getText("courseViewer.completed", "הושלם"),
        locked: await getText("courseViewer.locked", "נעול"),
        noAccess: await getText("courseViewer.noAccess", `אין לך גישה ל${getProductTypeName('course', 'singular')} זה`),
        accessExpired: await getText("courseViewer.accessExpired", `הגישה ל${getProductTypeName('course', 'singular')} פגה`),
        courseNotFound: await getText("courseViewer.courseNotFound", `ה${getProductTypeName('course', 'singular')} לא נמצא`),
        loading: await getText("courseViewer.loading", `טוען ${getProductTypeName('course', 'singular')}...`)
      };
      setCourseTexts(texts);

      const urlParams = new URLSearchParams(window.location.search);
      const courseId = urlParams.get('course');
      
      if (!courseId) {
        setMessage({ type: 'error', text: `מזהה ${getProductTypeName('course', 'singular')} חסר` });
        setIsLoading(false);
        return;
      }

      const user = await User.me();
      setCurrentUser(user);

      const courseData = await Course.get(courseId);
      if (!courseData) {
        setMessage({ type: 'error', text: texts.courseNotFound });
        setIsLoading(false);
        return;
      }
      setCourse(courseData);

      // Check user access
      const purchases = await Purchase.filter({ 
        buyer_email: user.email, 
        product_id: courseId,
        payment_status: 'paid'
      });
      
      const validPurchase = purchases.find(p => 
        p.access_until && new Date(p.access_until) > new Date()
      );
      
      if (!validPurchase) {
        setMessage({ type: 'error', text: texts.noAccess });
        setIsLoading(false);
        return;
      }
      
      setUserPurchase(validPurchase);

      // Load user progress (you might want to create a CourseProgress entity)
      // For now, using localStorage
      const progressKey = `course_${courseId}_progress`;
      const savedProgress = localStorage.getItem(progressKey);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setCompletedModules(new Set(progress.completedModules || []));
        setCurrentModule(progress.currentModule || 0);
      }

    } catch (error) {
      console.error("Error loading course:", error);
      setMessage({ type: 'error', text: `שגיאה בטעינת ה${getProductTypeName('course', 'singular')}` });
    }
    setIsLoading(false);
  }, []); // Empty dependency array - texts are loaded inside the function

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markModuleCompleted = (moduleIndex) => {
    const newCompleted = new Set(completedModules);
    newCompleted.add(moduleIndex);
    setCompletedModules(newCompleted);
    
    // Save progress
    const progressKey = `course_${course.id}_progress`;
    const progress = {
      completedModules: Array.from(newCompleted),
      currentModule: currentModule,
      lastAccessed: new Date().toISOString()
    };
    localStorage.setItem(progressKey, JSON.stringify(progress));
    
    // Update purchase record
    if (userPurchase) {
      Purchase.update(userPurchase.id, {
        ...userPurchase,
        last_accessed: new Date().toISOString(),
        first_accessed: userPurchase.first_accessed || new Date().toISOString()
      });
    }
  };

  const goToModule = (moduleIndex) => {
    setCurrentModule(moduleIndex);
    
    // Save progress
    const progressKey = `course_${course.id}_progress`;
    const progress = {
      completedModules: Array.from(completedModules),
      currentModule: moduleIndex,
      lastAccessed: new Date().toISOString()
    };
    localStorage.setItem(progressKey, JSON.stringify(progress));
  };

  const canAccessModule = (moduleIndex) => {
    if (moduleIndex === 0) return true;
    return completedModules.has(moduleIndex - 1);
  };

  const getProgressPercentage = () => {
    if (!course?.course_modules?.length) return 0;
    return (completedModules.size / course.course_modules.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{courseTexts.loading}</p>
        </div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentModuleData = course?.course_modules?.[currentModule];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              <p className="text-gray-600">{course.description}</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{courseTexts.courseProgress}</span>
              <span className="text-sm text-gray-500">
                {completedModules.size} / {course.course_modules?.length || 0} {courseTexts.modules}
              </span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Course Modules Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{courseTexts.modules}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {course.course_modules?.map((module, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentModule === index 
                          ? 'bg-blue-50 border-blue-200' 
                          : canAccessModule(index)
                          ? 'hover:bg-gray-50 border-gray-200'
                          : 'bg-gray-50 border-gray-200 cursor-not-allowed'
                      }`}
                      onClick={() => canAccessModule(index) && goToModule(index)}
                    >
                      <div className="flex items-center gap-2">
                        {completedModules.has(index) ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : canAccessModule(index) ? (
                          <Play className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                        <span className={`text-sm font-medium ${
                          canAccessModule(index) ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {module.title}
                        </span>
                      </div>
                      {module.duration_minutes && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {module.duration_minutes} דקות
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentModuleData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{currentModuleData.title}</CardTitle>
                    <Badge variant={completedModules.has(currentModule) ? "default" : "secondary"}>
                      {completedModules.has(currentModule) ? courseTexts.completed : `מודול ${currentModule + 1}`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Module Video */}
                  {currentModuleData.video_url && (
                    <div className="mb-6">
                      <VideoPlayer
                        video_url={currentModuleData.video_url}
                        is_private={currentModuleData.video_is_private}
                        product_id={course.id}
                        className="aspect-video"
                        title={`${currentModuleData.title} - וידיאו`}
                      />
                    </div>
                  )}

                  {/* Module Description */}
                  {currentModuleData.description && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">תיאור המודול</h3>
                      <p className="text-gray-700">{currentModuleData.description}</p>
                    </div>
                  )}

                  {/* Materials */}
                  {currentModuleData.materials && currentModuleData.materials.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{courseTexts.materials}</h3>
                      <div className="space-y-2">
                        {currentModuleData.materials.map((material, index) => (
                          <a
                            key={index}
                            href={material}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                          >
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">חומר עזר {index + 1}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Module Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => goToModule(currentModule - 1)}
                      disabled={currentModule === 0}
                    >
                      <ArrowRight className="w-4 h-4 ml-2" />
                      {courseTexts.prevModule}
                    </Button>

                    <div className="flex gap-2">
                      {!completedModules.has(currentModule) && (
                        <Button
                          onClick={() => markModuleCompleted(currentModule)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 ml-2" />
                          {courseTexts.moduleCompleted}
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => goToModule(currentModule + 1)}
                      disabled={currentModule >= (course.course_modules?.length || 0) - 1}
                    >
                      {courseTexts.nextModule}
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
