import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Course, Category, Purchase, User, Settings } from "@/services/entities"; // Using Course entity instead of Product
import { getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Filter,
  Play,
  Clock,
  BookOpen,
  Star,
  Users,
  ShoppingCart,
  Eye,
  Edit
} from "lucide-react";
import { getText } from "../components/utils/getText";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const hasActiveAccess = (purchase) => {
  if (!purchase) return false;

  // Check if it's lifetime access
  if (purchase.purchased_lifetime_access) return true;

  // Check if access_until is set and still valid
  if (purchase.access_until && new Date(purchase.access_until) > new Date()) return true;

  // If no access_until is set and it's not lifetime, assume lifetime for backwards compatibility
  if (!purchase.access_until && !purchase.purchased_lifetime_access) {
    return true;
  }

  return false;
};

export default function Courses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userPurchases, setUserPurchases] = useState([]);
  const [coursesTexts, setCoursesTexts] = useState({
    title: `${getProductTypeName('course', 'plural')} מקצועיים`,
    subtitle: `${getProductTypeName('course', 'plural')} מקיפים לפיתוח מקצועי של מורים`,
    search: `חפשו ${getProductTypeName('course', 'singular')}...`,
    startCourse: `התחלת ${getProductTypeName('course', 'singular')}`,
    continueCourse: `המשך ${getProductTypeName('course', 'singular')}`,
    getAccess: "קבלת גישה",
    owned: "ברשותך",
    allCategories: "כל הקטגוריות",
    modules: "מודולים",
    totalDuration: "משך כולל",
    noCourses: `אין ${getProductTypeName('course', 'plural')} זמינים`,
    noCoursesSubtitle: `${getProductTypeName('course', 'plural')} חדשים יתווספו בקרוב`,
    loading: `טוען ${getProductTypeName('course', 'plural')}...`,
    enrolled: "נרשמת",
    targetAudience: "קהל יעד",
    minutes: "דקות",
    lifetimeAccess: "גישה לכל החיים",
    accessUntil: "גישה עד",
    professionalCourses: `${getProductTypeName('course', 'plural')} מקצועיים`
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, searchTerm, selectedCategory]);

  const loadData = async () => {
    try {
      const texts = {
        title: await getText("courses.title", `${getProductTypeName('course', 'plural')} מקצועיים`),
        subtitle: await getText("courses.subtitle", `${getProductTypeName('course', 'plural')} מקיפים לפיתוח מקצועי של מורים`),
        search: await getText("courses.search", `חפשו ${getProductTypeName('course', 'singular')}...`),
        startCourse: await getText("courses.startCourse", `התחלת ${getProductTypeName('course', 'singular')}`),
        continueCourse: await getText("courses.continueCourse", `המשך ${getProductTypeName('course', 'singular')}`),
        getAccess: await getText("courses.getAccess", "קבלת גישה"),
        owned: await getText("courses.owned", "ברשותך"),
        allCategories: await getText("courses.allCategories", "כל הקטגוריות"),
        modules: await getText("courses.modules", "מודולים"),
        totalDuration: await getText("courses.totalDuration", "משך כולל"),
        noCourses: await getText("courses.noCourses", `אין ${getProductTypeName('course', 'plural')} זמינים`),
        noCoursesSubtitle: await getText("courses.noCourses.subtitle", `${getProductTypeName('course', 'plural')} חדשים יתווספו בקרוב`),
        loading: await getText("courses.loading", `טוען ${getProductTypeName('course', 'plural')}...`),
        enrolled: await getText("courses.enrolled", "נרשמת"),
        targetAudience: await getText("courses.targetAudience", "קהל יעד"),
        minutes: await getText("courses.minutes", "דקות"),
        lifetimeAccess: await getText("courses.lifetimeAccess", "גישה לכל החיים"),
        accessUntil: await getText("courses.accessUntil", "גישה עד"),
        professionalCourses: await getText("courses.professionalCourses", `${getProductTypeName('course', 'plural')} מקצועיים`)
      };
      setCoursesTexts(texts);

      let tempCurrentUser = null;
      try {
        tempCurrentUser = await User.me();
        setCurrentUser(tempCurrentUser);
      } catch (error) {
        // User not logged in, tempCurrentUser remains null
      }

      // Check if courses are accessible to current user
      let settings = null;
      try {
        const settingsData = await Settings.find();
        if (settingsData.length > 0) {
          settings = settingsData[0];
        }
      } catch (error) {
        // Settings not found, proceed normally
        console.warn("Settings could not be loaded:", error);
      }

      // Check courses visibility
      const coursesVisibility = settings?.nav_courses_visibility || 'public';

      // If courses are admin only or hidden, check access
      if (coursesVisibility === 'admin_only' && (!tempCurrentUser || tempCurrentUser.role !== 'admin')) {
        // Redirect to home or show access denied
        navigate("/");
        return;
      }

      if (coursesVisibility === 'hidden') {
        // Redirect to home
        navigate("/");
        return;
      }

      let purchases = [];
      if (tempCurrentUser) {
        purchases = await Purchase.filter({ buyer_user_id: tempCurrentUser.id, payment_status: 'paid' });
        setUserPurchases(purchases);
      }

      const [coursesData, categoriesData] = await Promise.all([
        Course.filter({ is_published: true }),
        Category.find({}, "name")
      ]);

      setCourses(coursesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const filterCourses = () => {
    let filtered = courses;

    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.tags && course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }


    setFilteredCourses(filtered);
  };

  const getUserPurchaseForProduct = (courseId) => {
    return userPurchases.find(purchase =>
      ((purchase.purchasable_type === 'course' && purchase.purchasable_id === courseId) ||
       (purchase.product_id === courseId)) && // Backwards compatibility
      purchase.payment_status === 'paid'
    );
  };

  const handleStartCourse = (course) => {
    const url = `/course?course=${course.id}`;
    window.location.href = url;
  };

  const handlePurchase = (course) => {
    const url = `/purchase?type=course&id=${course.id}`;
    window.location.href = url;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{coursesTexts.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{coursesTexts.title}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {coursesTexts.subtitle}
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder={coursesTexts.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-12"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex items-center gap-2 min-w-48">
              <Filter className="w-5 h-5 text-gray-500" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={coursesTexts.allCategories} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{coursesTexts.allCategories}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                userPurchase={getUserPurchaseForProduct(course.id)}
                onStartCourse={handleStartCourse}
                onPurchase={handlePurchase}
                coursesTexts={coursesTexts}
                currentUser={currentUser}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">{coursesTexts.noCourses}</h3>
            <p className="text-gray-500">{coursesTexts.noCoursesSubtitle}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({ course, userPurchase, onStartCourse, onPurchase, coursesTexts, currentUser }) {
  const navigate = useNavigate();
  const hasAccess = hasActiveAccess(userPurchase);

  const moduleCount = course.course_modules ? course.course_modules.length : 0;

  const handleDetailsClick = () => {
    navigate(`/course-details?type=course&id=${course.id}`);
  };

  // Get placeholder image for courses
  const getPlaceholderImage = () => {
    const baseUrl = "https://images.unsplash.com/";
    return `${baseUrl}photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop&crop=center`;
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group h-full flex flex-col">
      {/* Fixed height image section */}
      <div className="h-48 overflow-hidden relative flex-shrink-0">
        <img
          src={course.image_url || getPlaceholderImage()}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="absolute top-3 right-3">
          <Badge className="bg-green-600 text-white">
            {course.category}
          </Badge>
        </div>
      </div>

      {/* Flexible content section */}
      <CardContent className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 min-h-[3.5rem]">
          {course.title}
        </h3>

        {hasAccess && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded-lg mb-3">
            <div className="font-medium">{coursesTexts.enrolled}</div>
            {userPurchase?.purchased_lifetime_access ? (
              <div className="text-xs">{coursesTexts.lifetimeAccess}</div>
            ) : userPurchase?.access_until ? (
              <div className="text-xs">
                {coursesTexts.accessUntil} {format(new Date(userPurchase.access_until), 'dd/MM/yyyy', { locale: he })}
              </div>
            ) : (
              <div className="text-xs">{coursesTexts.lifetimeAccess}</div>
            )}
          </div>
        )}

        {/* Flexible description area */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
          {course.short_description ||
           (course.description && course.description.length > 120
             ? course.description.substring(0, 120) + "..."
             : course.description)}
        </p>

        {/* Course details - fixed height section */}
        <div className="space-y-2 text-sm mb-4 min-h-[4rem]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{moduleCount} {coursesTexts.modules}</span>
          </div>

          {course.total_duration_minutes && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{course.total_duration_minutes} {coursesTexts.minutes}</span>
            </div>
          )}

          {course.target_audience && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{course.target_audience}</span>
            </div>
          )}
        </div>

        {/* Tags - only show if tags exist and are not empty */}
        {course.tags && course.tags.length > 0 && course.tags.some(tag => tag && tag.trim()) && (
          <div className="flex flex-wrap gap-1 mb-4">
            {course.tags.filter(tag => tag && tag.trim()).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Fixed footer section */}
        <div className="flex items-center justify-between pt-4 border-t mt-auto">
          <div className="text-2xl font-bold text-green-600">
            ₪{course.price}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDetailsClick}
            >
              <Eye className="w-4 h-4" />
            </Button>

            {currentUser && currentUser.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/courses?edit=${course.id}`)}
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
                title="עריכת קורס"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}

            {hasAccess ? (
              <Button
                onClick={() => onStartCourse(course)}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Play className="w-4 h-4 ml-2" />
                {userPurchase?.first_accessed ? coursesTexts.continueCourse : coursesTexts.startCourse}
              </Button>
            ) : (
              <Button
                onClick={() => onPurchase(course)}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 ml-2" />
                {coursesTexts.getAccess}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
