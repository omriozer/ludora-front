import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Workshop, Category, User, Purchase, Settings } from "@/services/entities";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  Play,
  BookOpen,
  Video,
  Eye,
  Monitor,
  AlertCircle, // Added AlertCircle for remaining spots warning
  Edit // Added Edit icon for admin button
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { motion } from "framer-motion";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import PriceDisplayTag from "@/components/ui/PriceDisplayTag";

export default function Workshops() {
  const navigate = useNavigate();

  const [workshops, setWorkshops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredWorkshops, setFilteredWorkshops] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [publishFilter, setPublishFilter] = useState("all"); // New filter for admins
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userPurchases, setUserPurchases] = useState([]);
  const [catalogTexts, setCatalogTexts] = useState({
    title: `קטלוג ${getProductTypeName('workshop', 'plural')}`,
    subtitle: `${getProductTypeName('workshop', 'plural')} אונליין ומוקלטות לבחירתך במגוון תחומים`,
    search: `חפשי ${getProductTypeName('workshop', 'singular')}...`,
    registerNow: "הירשמו עכשיו",
    upcoming: `${getProductTypeName('workshop', 'plural')} קרובות`,
    recordings: "הקלטות",
    allCategories: "כל הקטגוריות",
    noUpcoming: `אין ${getProductTypeName('workshop', 'plural')} קרובות`,
    noUpcomingSubtitle: `${getProductTypeName('workshop', 'plural')} חדשות יפורסמו בקרוב`,
    noRecordings: "אין הקלטות זמינות",
    noRecordingsSubtitle: "הקלטות יועלו בהמשך",
    getAccess: "רכישה",
    watchRecording: "צפייה בהקלטה",
    loading: `טוען ${getProductTypeName('workshop', 'plural')}...`,
    accessUntil: "גישה עד",
    lifetimeAccess: "גישה לכל החיים",
    owned: "ברשותך",
    recordingNotYetAvailable: "הקלטה עדיין לא זמינה",
    professionalWorkshops: `${getProductTypeName('workshop', 'plural')} מקצועיות`,
    viewDetails: "צפייה בפרטים"
  });

  useEffect(() => {
    loadData();
  }, []);

  const filterWorkshops = useCallback(() => {
    let filtered = workshops;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(workshop =>
        workshop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workshop.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(workshop => workshop.category === selectedCategory);
    }

    // Publish status filter (only for admins/sysadmins)
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'sysadmin')) {
      if (publishFilter === "published") {
        filtered = filtered.filter(workshop => workshop.is_published === true);
      } else if (publishFilter === "unpublished") {
        filtered = filtered.filter(workshop => workshop.is_published === false);
      }
      // "all" shows both published and unpublished
    }

    setFilteredWorkshops(filtered);
  }, [workshops, searchTerm, selectedCategory, publishFilter, currentUser]);

  useEffect(() => {
    filterWorkshops();
  }, [filterWorkshops]);

  const getUserPurchaseForProduct = (productId) => {
    return userPurchases.find(purchase =>
      purchase.purchasable_id === productId &&
      purchase.purchasable_type === 'workshop' &&
      purchase.payment_status === 'paid'
    );
  };

  const hasActiveAccess = (purchase) => {
    if (!purchase) return false;

    // Check if it's lifetime access
    if (purchase.purchased_lifetime_access) return true;

    // Check if access_until is set and still valid
    if (purchase.access_until && new Date(purchase.access_until) > new Date()) return true;

    // If no access_until is set and it's not lifetime, check if it should have lifetime access
    // This is for backwards compatibility with older purchases that didn't explicitly store lifetime
    // This part should be re-evaluated as purchase.access_until will be explicitly set for timed access
    // For now, if no access_until or lifetime flag, assume lifetime for existing items that might have been lifetime by default
    if (!purchase.access_until && !purchase.purchased_lifetime_access) {
      return true; // Assume lifetime for backwards compatibility
    }

    return false;
  };

  const loadData = async () => {
    try {
      // Check if workshops are accessible to current user
      let settings = null;
      try {
        const settingsData = await Settings.find();
        if (settingsData.length > 0) {
          settings = settingsData[0];
        }
      } catch (error) {
        console.warn("Error fetching settings:", error); // Settings not found, proceed normally
      }

      // Check workshops visibility
      const workshopsVisibility = settings?.nav_workshops_visibility || 'public';
      let fetchedUserForVisibility = null; // Use a distinct variable name for the user fetched for visibility check

      try {
        fetchedUserForVisibility = await User.me();
      } catch (error) {
        // User not logged in, fetchedUserForVisibility remains null
      }

      // Check access permissions (backup check - primary protection is in ConditionalRoute)
      const isActualAdmin = fetchedUserForVisibility?.role === 'admin' && !fetchedUserForVisibility?._isImpersonated;
      const isContentCreator = fetchedUserForVisibility && !!fetchedUserForVisibility.content_creator_agreement_sign_date;

      let hasAccess = false;
      switch (workshopsVisibility) {
        case 'public':
          hasAccess = true;
          break;
        case 'logged_in_users':
          hasAccess = !!fetchedUserForVisibility;
          break;
        case 'admin_only':
          hasAccess = isActualAdmin;
          break;
        case 'admins_and_creators':
          hasAccess = isActualAdmin || isContentCreator;
          break;
        case 'hidden':
          hasAccess = false;
          break;
        default:
          hasAccess = true;
      }

      if (!hasAccess) {
        navigate(fetchedUserForVisibility ? "/dashboard" : "/");
        return;
      }

      // If not redirected, proceed with loading texts and other data
      const texts = {
        title: `קטלוג ${getProductTypeName('workshop', 'plural')}`,
        subtitle: `${getProductTypeName('workshop', 'plural')} אונליין ומוקלטות לבחירתך במגוון תחומים`,
        search: `חפשי ${getProductTypeName('workshop', 'singular')}...`,
        registerNow: "הירשמו עכשיו",
        upcoming: `${getProductTypeName('workshop', 'plural')} קרובות`,
        recordings: "הקלטות",
        allCategories: "כל הקטגוריות",
        noUpcoming: `אין ${getProductTypeName('workshop', 'plural')} קרובות`,
        noUpcomingSubtitle: `${getProductTypeName('workshop', 'plural')} חדשות יפורסמו בקרוב`,
        noRecordings: "אין הקלטות זמינות",
        noRecordingsSubtitle: "הקלטות יועלו בהמשך",
        getAccess: "רכישה",
        watchRecording: "צפייה בהקלטה",
        loading: `טוען ${getProductTypeName('workshop', 'plural')}...`,
        accessUntil: "גישה עד",
        lifetimeAccess: "גישה לכל החיים",
        owned: "ברשותך",
        recordingNotYetAvailable: "הקלטה עדיין לא זמינה",
        professionalWorkshops: `${getProductTypeName('workshop', 'plural')} מקצועיות`,
        viewDetails: "צפייה בפרטים"
      };
      setCatalogTexts(texts);

      // Reuse the user fetched for visibility check
      let user = fetchedUserForVisibility;
      setCurrentUser(user); // Update the state with the current user

      let purchases = [];
      if (user) {
        purchases = await Purchase.filter({ buyer_user_id: user.id, payment_status: 'paid' });
        setUserPurchases(purchases);
      }

      // Load workshops based on user role
      let workshopsData = [];
      if (user && (user.role === 'admin' || user.role === 'sysadmin')) {
        // Admins and sysadmins see ALL workshops (published and unpublished)
        workshopsData = await Workshop.find();
      } else if (user && user.role === 'content_creator') {
        // Content creators see all published workshops + their own unpublished workshops
        const [publishedWorkshops, ownWorkshops] = await Promise.all([
          Workshop.filter({ is_published: true }),
          Workshop.filter({ creator_id: user.id }) // Get all workshops created by this user
        ]);
        
        // Combine and deduplicate (in case some of their workshops are published)
        const workshopMap = new Map();
        [...publishedWorkshops, ...ownWorkshops].forEach(workshop => {
          workshopMap.set(workshop.id, workshop);
        });
        workshopsData = Array.from(workshopMap.values());
      } else {
        // Regular users and non-authenticated users see only published workshops
        workshopsData = await Workshop.filter({ is_published: true });
      }

      const categoriesData = await Category.find({}, "name");
      setWorkshops(workshopsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const now = new Date();
  
  // Separate workshops based on type and date, not just date
  const upcomingWorkshops = filteredWorkshops.filter(workshop => {
    const scheduledDate = workshop.scheduled_date ? new Date(workshop.scheduled_date) : null;
    const workshopType = workshop.workshop_type || workshop.type || 'both';
    
    // If it's recorded only, it should go to recordings tab
    if (workshopType === 'recorded') {
      return false;
    }
    
    // If it has a scheduled date and it's in the future, it's upcoming
    if (scheduledDate && scheduledDate > now) {
      return true;
    }
    
    // If it has no scheduled date but is online_live or both, consider it upcoming
    if (!scheduledDate && (workshopType === 'online_live' || workshopType === 'both')) {
      return true;
    }
    
    return false;
  });

  const pastWorkshops = filteredWorkshops.filter(workshop => {
    const scheduledDate = workshop.scheduled_date ? new Date(workshop.scheduled_date) : null;
    const workshopType = workshop.workshop_type || workshop.type || 'both';
    
    // If it's recorded only, it should go to recordings tab
    if (workshopType === 'recorded') {
      return true;
    }
    
    // If it has a scheduled date and it's in the past, it's a recording
    if (scheduledDate && scheduledDate <= now) {
      return true;
    }
    
    return false;
  });

  // Debug logging to help understand workshop categorization
  if (process.env.NODE_ENV === 'development') {
    console.log('Workshop categorization:', {
      total: filteredWorkshops.length,
      upcoming: upcomingWorkshops.length,
      past: pastWorkshops.length,
      workshops: filteredWorkshops.map(w => ({
        title: w.title,
        type: w.workshop_type || w.type,
        scheduled_date: w.scheduled_date,
        categorized_as: upcomingWorkshops.includes(w) ? 'upcoming' : pastWorkshops.includes(w) ? 'past' : 'uncategorized'
      }))
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LudoraLoadingSpinner
          message={catalogTexts.loading}
          status="loading"
          size="lg"
          theme="arcade"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full px-6 py-3 text-sm font-bold mb-6 shadow-lg shadow-blue-500/25">
            <Calendar className="w-5 h-5" />
            {catalogTexts.professionalWorkshops}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent mb-6">
            {catalogTexts.title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            {catalogTexts.subtitle}
          </p>
        </div>

        {/* Enhanced Search and Filter */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-blue-500/10 p-4 sm:p-6 lg:p-8 mb-10 border border-white/20">
          <div className="flex flex-col gap-4 lg:gap-6">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="absolute right-4 sm:right-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 sm:w-6 sm:h-6 z-10" />
              <Input
                placeholder={catalogTexts.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-12 sm:pr-16 h-12 sm:h-14 text-base sm:text-lg bg-gray-50/50 border-2 border-gray-200/50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 placeholder:text-gray-400 w-full"
              />
            </div>

            {/* Filter Section */}
            <div className="flex items-center gap-3 w-full">
              <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 flex-shrink-0" />
              
              {/* Category Filter */}
              <div className="flex-1 min-w-0">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-12 sm:h-14 bg-gray-50/50 border-2 border-gray-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 text-base sm:text-lg w-full">
                    <SelectValue placeholder={catalogTexts.allCategories} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2 shadow-xl">
                    <SelectItem value="all" className="text-base sm:text-lg py-3 rounded-xl">
                      {catalogTexts.allCategories}
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name} className="text-base sm:text-lg py-3 rounded-xl">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Admin/Sysadmin Publish Status Filter */}
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'sysadmin') && (
                <div className="flex-1 min-w-0">
                  <Select value={publishFilter} onValueChange={setPublishFilter}>
                    <SelectTrigger className="h-12 sm:h-14 bg-gray-50/50 border-2 border-gray-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 text-base sm:text-lg w-full">
                      <SelectValue placeholder="סטטוס פרסום" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2 shadow-xl">
                      <SelectItem value="all" className="text-base sm:text-lg py-3 rounded-xl">
                        כל {getProductTypeName('workshop', 'plural')}
                      </SelectItem>
                      <SelectItem value="published" className="text-base sm:text-lg py-3 rounded-xl">
                        מפורסמות בלבד
                      </SelectItem>
                      <SelectItem value="unpublished" className="text-base sm:text-lg py-3 rounded-xl">
                        לא מפורסמות בלבד
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Workshops Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-8">
          {/* Admin/Sysadmin Summary */}
          {currentUser && (currentUser.role === 'admin' || currentUser.role === 'sysadmin') && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-blue-500/10 p-4 mb-6 border border-white/20">
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">
                    מפורסמות: <span className="font-bold">{workshops.filter(w => w.is_published).length}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700">
                    לא מפורסמות: <span className="font-bold">{workshops.filter(w => !w.is_published).length}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">
                    סך הכל: <span className="font-bold">{workshops.length}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-lg grid-cols-2 bg-white/80 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-white/20 h-16">
              <TabsTrigger
                value="upcoming"
                className="flex items-center gap-3 rounded-xl py-4 px-6 text-base font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 transition-all duration-300"
              >
                <Calendar className="w-5 h-5" />
                {getProductTypeName('workshop', 'plural')} אונליין ({upcomingWorkshops.length})
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="flex items-center gap-3 rounded-xl py-4 px-6 text-base font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 transition-all duration-300"
              >
                <Video className="w-5 h-5" />
                {getProductTypeName('workshop', 'plural')} מוקלטות ({pastWorkshops.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upcoming">
            {upcomingWorkshops.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {upcomingWorkshops.map((workshop) => {
                  const currentWorkshopPurchase = getUserPurchaseForProduct(workshop.id);
                  const currentWorkshopHasAccess = hasActiveAccess(currentWorkshopPurchase);
                  return (
                    <WorkshopCard
                      key={workshop.id}
                      workshop={workshop}
                      userPurchase={currentWorkshopPurchase}
                      hasAccess={currentWorkshopHasAccess}
                      currentUser={currentUser}
                      catalogTexts={catalogTexts}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                  <Calendar className="w-16 h-16 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-4">אין {getProductTypeName('workshop', 'plural')} חיות או קרובות</h3>
                <p className="text-lg text-gray-500">{getProductTypeName('workshop', 'plural')} חדשות ומפגשים חיים יפורסמו בקרוב</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastWorkshops.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pastWorkshops.map((workshop) => {
                  const currentWorkshopPurchase = getUserPurchaseForProduct(workshop.id);
                  const currentWorkshopHasAccess = hasActiveAccess(currentWorkshopPurchase);
                  return (
                    <WorkshopCard
                      key={workshop.id}
                      workshop={workshop}
                      isPast={true}
                      userPurchase={currentWorkshopPurchase}
                      hasAccess={currentWorkshopHasAccess}
                      currentUser={currentUser}
                      catalogTexts={catalogTexts}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                  <Video className="w-16 h-16 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-4">אין הקלטות או {getProductTypeName('workshop', 'plural')} מוקלטות</h3>
                <p className="text-lg text-gray-500">הקלטות ו{getProductTypeName('workshop', 'plural')} מוקלטות יועלו בהמשך</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function WorkshopCard({ workshop, isPast = false, userPurchase, hasAccess, currentUser, catalogTexts }) {
  const navigate = useNavigate();
  const [spotsLeft, setSpotsLeft] = useState(null);
  const [showSpotsWarning, setShowSpotsWarning] = useState(false);

  // Helper function to check if user can access unpublished workshop
  const canAccessUnpublished = () => {
    if (workshop.is_published) return true;
    if (!currentUser) return false;
    return currentUser.role === 'admin' || 
           currentUser.role === 'sysadmin' || 
           currentUser.id === workshop.creator_id;
  };

  // Determine if this is a workshop product and check its display logic
  const isWorkshopProduct = workshop.product_type === 'workshop';
  const workshopType = workshop.workshop_type || 'both';

  // For workshop products, determine display based on type and date
  const now = new Date();
  const scheduledDate = workshop.scheduled_date ? new Date(workshop.scheduled_date) : null;
  const hasScheduledDate = scheduledDate !== null;
  const isPastDate = hasScheduledDate && scheduledDate <= now;

  // Determine what to show based on workshop type and date
  const shouldShowAsRecording = isPastDate && (workshopType === 'both' || workshopType === 'online_live');
  const isRecordedOnly = workshopType === 'recorded';
  const isOnlineLive = workshopType === 'online_live';

  const checkRemainingSpots = useCallback(() => {
    if (!workshop.max_participants || workshop.max_participants <= 0) return;

    // Only check spots for 'workshop' product_type and if it's an upcoming/live workshop
    if (workshop.product_type === 'workshop' && !isPast && !shouldShowAsRecording && !isRecordedOnly) {
      const fetchSpots = async () => {
        try {
          // Count paid purchases for this workshop
          const purchases = await Purchase.filter({
            purchasable_id: workshop.id,
            purchasable_type: 'Workshop',
            payment_status: 'paid'
          });

          const totalRegistered = purchases.length;
          const remaining = workshop.max_participants - totalRegistered;
          const remainingPercentage = (remaining / workshop.max_participants) * 100;

          setSpotsLeft(remaining);

          // Show warning only if less than 20% spots remaining
          if (remainingPercentage < 20 && remaining > 0) {
            setShowSpotsWarning(true);
          } else {
            setShowSpotsWarning(false);
          }
        } catch (error) {
          console.error("Error checking remaining spots:", error);
          setSpotsLeft(null);
          setShowSpotsWarning(false);
        }
      };
      fetchSpots();
    } else {
      setSpotsLeft(null);
      setShowSpotsWarning(false);
    }
  }, [workshop.id, workshop.max_participants, workshop.product_type, isPast, shouldShowAsRecording, isRecordedOnly]); // Dependencies for useCallback

  useEffect(() => {
    checkRemainingSpots();
  }, [checkRemainingSpots]);

  const getButtonText = () => {
    if (!canAccessUnpublished()) {
      return "לא זמין";
    }

    if (hasAccess) {
      if (isPast || shouldShowAsRecording || isRecordedOnly) {
        return catalogTexts.watchRecording;
      }
      return `הצטרף ל${getProductTypeName('workshop', 'singular')}`;
    }

    if (isPast || shouldShowAsRecording || isRecordedOnly) {
      return catalogTexts.getAccess;
    }
    return catalogTexts.registerNow;
  };

  const getButtonIcon = () => {
    if (hasAccess) {
      return <Play className="w-4 h-4 ml-2" />;
    }
    return <BookOpen className="w-4 h-4 ml-2" />;
  };

  const handleButtonClick = () => {
    if (!canAccessUnpublished()) {
      return; // Do nothing for unpublished workshops for regular users
    }

    if (hasAccess) {
      if (isPast || shouldShowAsRecording || isRecordedOnly) {
        if (workshop.video_file_url || workshop.recording_url) {
          navigate(`/video?workshop=${workshop.id}`);
        } else {
          // No recording available yet (this case is covered by a warning message now)
          return;
        }
      } else if (workshop.meeting_link || workshop.zoom_link) {
        // Online live workshop - open meeting link
        const meetingUrl = workshop.meeting_link || workshop.zoom_link;
        window.open(meetingUrl, '_blank');
      } else {
        // Default to video viewer for future or mixed workshops if not explicitly a meeting
        navigate(`/video?workshop=${workshop.id}`);
      }
    } else {
      // Create pending purchase and redirect to checkout
      (async () => {
        try {
          const {
            requireAuthentication,
            getUserIdFromToken,
            findProductForEntity,
            createPendingPurchase,
            showPurchaseSuccessToast,
            showPurchaseErrorToast
          } = await import('@/utils/purchaseHelpers');

          if (!requireAuthentication(navigate, '/checkout')) {
            return;
          }

          const userId = getUserIdFromToken();
          if (!userId) {
            showPurchaseErrorToast('לא ניתן לזהות את המשתמש', 'בהוספה לעגלה');
            return;
          }

          const productRecord = await findProductForEntity('workshop', workshop.id);

          if (!productRecord) {
            showPurchaseErrorToast('לא נמצא מוצר מתאים לרכישה', 'בהוספה לעגלה');
            return;
          }

          if (!productRecord.price || productRecord.price <= 0) {
            showPurchaseErrorToast('מחיר המוצר לא זמין', 'בהוספה לעגלה');
            return;
          }

          await createPendingPurchase({
            entityType: 'workshop',
            entityId: workshop.id,
            price: productRecord.price,
            userId,
            metadata: {
              product_title: workshop.title,
              source: 'Workshops_page'
            }
          });

          showPurchaseSuccessToast(workshop.title, false);
          navigate('/checkout');

        } catch (error) {
          const { showPurchaseErrorToast } = await import('@/utils/purchaseHelpers');
          showPurchaseErrorToast(error, 'בהוספה לעגלה');
        }
      })();
    }
  };

  const handleDetailsClick = () => {
    if (isWorkshopProduct) {
      navigate(`/workshop-details?id=${workshop.id}`);
    } else {
      navigate(`/registration?workshop=${workshop.id}`);
    }
  };

  const getPlaceholderImage = () => {
    const baseUrl = "https://images.unsplash.com/";
    if (isWorkshopProduct) {
      switch (workshopType) {
        case 'online_live':
          return `${baseUrl}photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop&crop=center`;
        case 'recorded':
          return `${baseUrl}photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop&crop=center`;
        case 'both':
        default:
          return `${baseUrl}photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop&crop=center`;
      }
    } else {
      switch (workshop.type) {
        case 'online_live':
          return `${baseUrl}photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop&crop=center`;
        case 'recorded':
          return `${baseUrl}photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop&crop=center`;
        default:
          return `${baseUrl}photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop&crop=center`;
      }
    }
  };

  const getWorkshopTypeLabel = () => {
    if (isWorkshopProduct) {
      if (shouldShowAsRecording) return "הקלטה זמינה";
      switch (workshopType) {
        case 'online_live':
          return "אונליין בזמן אמת";
        case 'recorded':
          return "מוקלט";
        default:
          return getProductTypeName('workshop', 'singular');
      }
    } else {
      switch (workshop.type) {
        case 'online_live':
          return "אונליין בזמן אמת";
        case 'recorded':
          return "מוקלט";
        case 'both':
          return "אונליין + מוקלט";
        default:
          return getProductTypeName('workshop', 'singular');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full"
    >
      <Card className={`
        ${workshop.is_published 
          ? 'bg-white/90 backdrop-blur-sm hover:bg-white hover:shadow-xl hover:shadow-blue-500/10' 
          : 'bg-red-50/90 backdrop-blur-sm hover:bg-red-50 hover:shadow-xl hover:shadow-red-500/10 border-red-200'
        } 
        transition-all duration-500 h-full flex flex-col border-0 rounded-2xl overflow-hidden group
      `}>
        {/* Bigger image section */}
        <div className="h-56 overflow-hidden relative flex-shrink-0">
          <img
            src={workshop.image_url || getPlaceholderImage()}
            alt={workshop.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
          
          {/* Right side badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {/* Category badge - only show if category exists */}
            {workshop.category && workshop.category.trim() && (
              <Badge className="bg-white/95 text-gray-800 font-medium px-3 py-1 rounded-full shadow-md border-0 text-sm">
                {workshop.category}
              </Badge>
            )}

            {/* Unpublished badge - show for non-published workshops */}
            {!workshop.is_published && (
              <Badge className="bg-red-500/95 text-white font-bold px-3 py-1 rounded-full shadow-md border-0 text-sm animate-pulse">
                לא מפורסם
              </Badge>
            )}

            {/* Creator badge - show if current user is content creator and this is their workshop */}
            {currentUser && currentUser.role === 'content_creator' && currentUser.id === workshop.creator_id && (
              <Badge className="bg-purple-500/95 text-white font-bold px-3 py-1 rounded-full shadow-md border-0 text-sm">
                ה{getProductTypeName('workshop', 'singular')} שלי
              </Badge>
            )}
          </div>

          {/* Workshop type badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className="bg-white/95 border-0 font-medium px-2 py-1 rounded-full shadow-md text-xs">
              <div className="flex items-center gap-1">
                {getWorkshopTypeLabel()}
                {isOnlineLive && <Monitor className="w-3 h-3 text-blue-500" />}
                {(isRecordedOnly || shouldShowAsRecording) && <Video className="w-3 h-3 text-green-500" />}
              </div>
            </Badge>
          </div>

          {/* Price badge */}
          <div className="absolute bottom-3 right-3">
            <PriceDisplayTag
              originalPrice={workshop.price}
              discount={workshop.discount}
              variant="badge"
              size="md"
              showDiscount={false}
            />
          </div>
        </div>

        {/* Much more compact content section */}
        <CardContent className="p-4 flex-grow flex flex-col text-right">
          {/* Unpublished warning in content area */}
          {!workshop.is_published && (
            <div className="mb-3 p-2 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 justify-end">
                <span className="font-bold text-red-800 text-xs">{getProductTypeName('workshop', 'singular')} לא מפורסמת - לא זמינה לציבור</span>
                <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
              </div>
            </div>
          )}

          {/* Title */}
          <h3 className="text-base font-bold text-gray-900 mb-3 line-clamp-2 leading-tight text-right">
            {workshop.title}
          </h3>

          {/* Access status */}
          {hasAccess && (
            <div className="mb-3 p-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 justify-end">
                <span className="font-bold text-green-800 text-xs">{catalogTexts.owned}</span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="text-xs text-green-700 text-right mt-1">
                {(() => {
                  const purchase = userPurchase;
                  if (purchase?.purchased_lifetime_access) {
                    return catalogTexts.lifetimeAccess;
                  }
                  if (purchase?.access_until) {
                    return `${catalogTexts.accessUntil} ${format(new Date(purchase.access_until), 'dd/MM/yyyy', { locale: he })}`;
                  } else {
                    return catalogTexts.lifetimeAccess;
                  }
                })()}
              </div>
            </div>
          )}

          {/* Recording availability - friendlier message */}
          {!hasAccess && shouldShowAsRecording && !workshop.recording_url && (
            <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-blue-800 font-medium text-xs">הקלטה תעלה בקרוב</span>
                <Video className="w-3 h-3 text-blue-600 flex-shrink-0" />
              </div>
            </div>
          )}

          {!hasAccess && shouldShowAsRecording && workshop.recording_url && (
            <div className="mb-3 p-2 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg">
              <div className="text-gray-700 font-medium text-center text-xs">
                ה{getProductTypeName('workshop', 'singular')} הסתיימה - זמינה כהקלטה
              </div>
            </div>
          )}

          {/* Compact workshop details - only essential info */}
          <div className="space-y-1 text-xs text-gray-600 mb-3 flex-grow">
            {hasScheduledDate && (
              <div className="flex items-center gap-2 justify-end">
                <div className="text-right">
                  <span className="font-bold text-gray-900">
                    {format(scheduledDate, 'dd/MM/yyyy', { locale: he })}
                  </span>
                  <span className="text-gray-500 mr-1">
                    {format(scheduledDate, 'HH:mm', { locale: he })}
                  </span>
                </div>
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-3 h-3 text-blue-600" />
                </div>
              </div>
            )}

            {workshop.duration_minutes && (
              <div className="flex items-center gap-2 justify-end">
                <span className="font-medium">{workshop.duration_minutes} דקות</span>
                <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3 h-3 text-purple-600" />
                </div>
              </div>
            )}

            {!isPast && !shouldShowAsRecording && !isRecordedOnly && workshop.max_participants && (
              <div className="flex items-center gap-2 justify-end">
                <span className="font-medium">עד {workshop.max_participants} משתתפים</span>
                <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-3 h-3 text-green-600" />
                </div>
              </div>
            )}

            {(isPast || shouldShowAsRecording || isRecordedOnly) && !hasAccess && (
              <div className="flex items-center gap-2 justify-end">
                <span className="font-medium text-emerald-700">
                  ברכישה: גישה למשך {workshop.recording_access_days || 30} יום
                </span>
                <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Play className="w-3 h-3 text-emerald-600" />
                </div>
              </div>
            )}

            {/* Spots warning - only when relevant */}
            {showSpotsWarning && spotsLeft !== null && spotsLeft > 0 && (
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg justify-end">
                <span className="font-bold text-orange-800 text-xs">נותרו רק {spotsLeft} מקומות!</span>
                <AlertCircle className="w-3 h-3 text-orange-600 flex-shrink-0" />
              </div>
            )}

            {spotsLeft === 0 && (
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg justify-end">
                <span className="font-bold text-red-800 text-xs">ה{getProductTypeName('workshop', 'singular')} מלאה</span>
                <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
              </div>
            )}
          </div>

          {/* Compact buttons - removed price section */}
          <div className="mt-auto">
            {/* Main action button */}
            <Button
              onClick={handleButtonClick}
              disabled={spotsLeft === 0 || !canAccessUnpublished()}
              className={`
                w-full h-9 rounded-xl font-bold text-sm transition-all duration-300 shadow-md mb-2
                ${!canAccessUnpublished()
                  ? 'bg-gray-400 cursor-not-allowed opacity-75'
                  : hasAccess 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/25' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/25'
                }
                ${(spotsLeft === 0 || !canAccessUnpublished()) 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-lg hover:-translate-y-0.5'
                }
                text-white border-0
              `}
            >
              <div className="flex items-center justify-center gap-2">
                {getButtonIcon()}
                <span>{getButtonText()}</span>
              </div>
            </Button>

            {/* Secondary buttons row */}
            <div className="flex gap-1">
              {/* View details button - wider */}
              <Button
                onClick={handleDetailsClick}
                className="flex-1 h-8 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-lg font-medium transition-all duration-300 hover:shadow-sm text-xs"
              >
                <Eye className="w-3 h-3 ml-1" />
                פרטים
              </Button>

              {/* Admin edit button - smaller */}
              {currentUser && currentUser.role === 'admin' && (
                <Button
                  onClick={() => navigate(`/products?edit=${workshop.id}&type=workshop`)}
                  className="w-8 h-8 bg-orange-100 border border-orange-200 text-orange-600 hover:bg-orange-200 hover:border-orange-300 rounded-lg transition-all duration-300 hover:shadow-sm flex-shrink-0"
                  title={`עריכת ${getProductTypeName('workshop', 'singular')}`}
                >
                  <Edit className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
