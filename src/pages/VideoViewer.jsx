import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Workshop, Course, File, Tool, Purchase } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import SecureVideoPlayer from "../components/SecureVideoPlayer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductTypeName, PRODUCT_TYPES } from "@/config/productTypes";
import { getApiBase, purchaseUtils } from "@/utils/api.js";
import {
  Calendar,
  Clock,
  Play,
  Users,
  AlertCircle,
  CheckCircle,
  Video,
  ExternalLink,
  ArrowRight,
  Home,
  Sparkles,
  Monitor // Added Monitor icon
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  requireAuthentication,
  getUserIdFromToken,
  findProductForEntity,
  createPendingPurchase,
  showPurchaseSuccessToast,
  showPurchaseErrorToast
} from '@/utils/purchaseHelpers';

export default function VideoViewer() {
  const navigate = useNavigate();
  const { currentUser, isLoading: userLoading } = useUser();

  const [workshop, setWorkshop] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workshopStatus, setWorkshopStatus] = useState(null); // 'upcoming', 'live', 'past_no_recording', 'past_with_recording'
  const [timeLeft, setTimeLeft] = useState({ weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showMeetingLink, setShowMeetingLink] = useState(false); // Renamed from showZoomLink

  useEffect(() => {
    if (!userLoading && currentUser) {
      loadData();
    }
  }, [userLoading, currentUser]);

  // Countdown timer effect
  useEffect(() => {
    if (workshopStatus === 'upcoming' && workshop?.scheduled_date) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const scheduledTime = new Date(workshop.scheduled_date).getTime();
        const difference = scheduledTime - now;

        if (difference > 0) {
          const weeks = Math.floor(difference / (1000 * 60 * 60 * 24 * 7));
          const days = Math.floor((difference % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);

          setTimeLeft({ weeks, days, hours, minutes, seconds });

          // Show meeting link 10 minutes before, only if a link exists
          setShowMeetingLink(difference <= 10 * 60 * 1000 && workshop.meeting_link);
        } else {
          setTimeLeft({ weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
          setShowMeetingLink(true && workshop.meeting_link); // Once time is 0 or negative, assume link should be visible if exists.
          clearInterval(interval); // Stop the countdown
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [workshopStatus, workshop?.scheduled_date, workshop?.meeting_link]); // Added meeting_link to dependencies

  // Helper function to get secure streaming URL for local videos
  const getSecureVideoUrl = (videoUrl) => {
    if (!videoUrl) return null;

    // If it's already a URL (YouTube, external), return as-is
    if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
      return videoUrl;
    }

    // For all non-external URLs (including /api/videos/), use the secure streaming endpoint
    const urlParams = new URLSearchParams(window.location.search);
    const entityId = urlParams.get('workshop') || urlParams.get('course') || urlParams.get('id');
    const entityType = urlParams.get('type') || 'workshop';

    if (entityId && entityType) {
      const apiBase = getApiBase();
      // Remove trailing /api from apiBase if it exists, then add the media path
      const baseUrl = apiBase.replace(/\/api\/?$/, '');
      const finalUrl = `${baseUrl}/api/media/stream/${entityType}/${entityId}`;


      return finalUrl;
    }

    // Fallback to original URL
    return videoUrl;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const entityId = urlParams.get('workshop') || urlParams.get('course') || urlParams.get('id');
      const entityType = urlParams.get('type') || 'workshop'; // Default to workshop for backward compatibility

      if (!entityId) {
        setError('מזהה פריט חסר');
        setIsLoading(false);
        return;
      }

      // User data is now available from global UserContext

      // Load entity data based on type
      let entityData;
      switch(entityType.toLowerCase()) {
        case 'workshop':
          entityData = await Workshop.findById(entityId);
          break;
        case 'course':
          entityData = await Course.findById(entityId);
          break;
        case 'file':
          entityData = await File.findById(entityId);
          break;
        case 'tool':
          entityData = await Tool.findById(entityId);
          break;
        default:
          // Fallback to workshop
          entityData = await Workshop.findById(entityId);
      }
      if (!entityData) {
        setError('פריט לא נמצא');
        setIsLoading(false);
        return;
      }
      setWorkshop(entityData);

      // Determine workshop status based on workshop_type
      const now = new Date();
      const scheduledDate = entityData.scheduled_date ? new Date(entityData.scheduled_date) : null;
      const hasVideo = entityData.video_file_url || entityData.recording_url;

      let status;

      if (entityData.workshop_type === 'recorded') {
        status = hasVideo ? 'past_with_recording' : 'past_no_recording';
      } else if (entityData.workshop_type === 'online_live') {
        if (scheduledDate) {
          if (scheduledDate > now) {
            status = 'upcoming';
          } else { // scheduledDate <= now
            status = hasVideo ? 'past_with_recording' : 'past_no_recording';
          }
        } else {
          // Online live workshop should ideally have a scheduled date. Treat as no recording available if missing.
          status = 'past_no_recording';
        }
      } else {
        // Fallback for workshops without explicit type (old behavior)
        if (scheduledDate) {
          if (scheduledDate > now) {
            status = 'upcoming';
          } else { // scheduledDate <= now
            status = entityData.recording_url ? 'past_with_recording' : 'past_no_recording';
          }
        } else {
          // No scheduled date - assume it's a recorded-only workshop (old behavior)
          status = entityData.recording_url ? 'past_with_recording' : 'past_no_recording';
        }
      }
      
      setWorkshopStatus(status);

      // Check user's access via Purchase entities
      let hasPurchaseAccess = false;

      // Check Purchase using new schema with fallback to legacy
      const purchases = await Purchase.filter({
        buyer_user_id: currentUser.id // Use new schema first
      });

      // If no purchases found with new schema, try legacy email-based lookup
      if (purchases.length === 0) {
        const legacyPurchases = await Purchase.filter({
          buyer_user_id: currentUser.id,
          payment_status: 'paid' // Legacy status check
        });
        purchases.push(...legacyPurchases);
      }

      // Filter purchases for this specific entity using utility functions
      const entityPurchases = purchases.filter(purchase => {
        const purchaseEntityType = purchaseUtils.getEntityType(purchase);
        const purchaseEntityId = purchaseUtils.getEntityId(purchase);
        return purchaseEntityType === entityType.toLowerCase() && purchaseEntityId === entityId;
      });

      if (entityPurchases.length > 0) {
        const userPurchase = entityPurchases[0];
        // Use utility functions to check access
        if (purchaseUtils.isPaymentCompleted(userPurchase) && purchaseUtils.isAccessActive(userPurchase)) {
          hasPurchaseAccess = true;
        }
      }

      // User has access if purchase allows it
      if (hasPurchaseAccess) {
        setHasAccess(true);
      } else {
        // Check if item is free - if so, auto-grant access by creating purchase record
        if (parseFloat(entityData.price || 0) === 0) {

          try {
            // Create purchase with new schema
            const purchaseData = {
              buyer_user_id: currentUser.id, // New schema uses user ID
              purchasable_type: entityType.toLowerCase(),
              purchasable_id: entityId,
              payment_status: 'completed', // New schema uses 'completed'
              payment_amount: 0,
              original_price: 0,
              discount_amount: 0,
              access_expires_at: null, // null = lifetime access
              first_accessed_at: new Date(),
              metadata: {
                environment: 'production',
                auto_granted: true,
                entity_title: entityData.title
              }
            };

            await Purchase.create(purchaseData);
            setHasAccess(true);
          } catch (autoAccessError) {
            setError('שגיאה במתן גישה אוטומטית');
            setIsLoading(false);
            return;
          }
        } else {
          setError(`אין לך הרשמה או רכישה עבור ${getProductTypeName('workshop', 'singular')} זו`);
          setIsLoading(false);
          return;
        }
      }

    } catch (error) {
      setError('שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">טוען {getProductTypeName('workshop', 'singular')}...</h2>
          <p className="text-gray-600">אנא המתן רגע</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">אופס! משהו השתבש</h1>
              <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  חזור
                </Button>
                <Button
                  onClick={() => navigate(PRODUCT_TYPES.game.url)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  <Home className="w-4 h-4 ml-2" />
                  לקטלוג ה{getProductTypeName('workshop', 'plural')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">נדרשת גישה</h1>
              <p className="text-gray-600 mb-6 leading-relaxed">
                כדי לצפות ב{getProductTypeName('workshop', 'singular')} זו, עליך לרכוש גישה או להירשם מראש
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  חזור
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      if (!requireAuthentication(navigate, '/checkout')) {
                        return;
                      }

                      const userId = getUserIdFromToken();
                      if (!userId) {
                        showPurchaseErrorToast('לא ניתן לזהות את המשתמש', 'בהוספה לעגלה');
                        return;
                      }

                      const productRecord = await findProductForEntity('workshop', workshop?.id);

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
                        entityId: workshop?.id,
                        price: productRecord.price,
                        userId,
                        metadata: {
                          product_title: workshop?.title,
                          source: 'VideoViewer_page'
                        }
                      });

                      showPurchaseSuccessToast(workshop?.title, false);
                      navigate('/checkout');

                    } catch (error) {
                      showPurchaseErrorToast(error, 'בהוספה לעגלה');
                    }
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <ArrowRight className="w-4 h-4 ml-2" />
                  רכישת גישה
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Workshop status handling
  if (workshopStatus === 'upcoming') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="text-center shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Calendar className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">ה{getProductTypeName('workshop', 'singular')} בקרוב!</h1>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">{workshop?.title}</h2>
              
              {/* Countdown Timer */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">זמן עד תחילת ה{getProductTypeName('workshop', 'singular')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  {timeLeft.weeks > 0 && (
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-2xl font-bold text-blue-600">{timeLeft.weeks}</div>
                      <div className="text-sm text-gray-600">שבועות</div>
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{timeLeft.days}</div>
                    <div className="text-sm text-gray-600">ימים</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-indigo-600">{timeLeft.hours}</div>
                    <div className="text-sm text-gray-600">שעות</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">{timeLeft.minutes}</div>
                    <div className="text-sm text-gray-600">דקות</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl font-bold text-pink-600">{timeLeft.seconds}</div>
                    <div className="text-sm text-gray-600">שניות</div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">מועד ה{getProductTypeName('workshop', 'singular')}</span>
                  </div>
                  <p className="text-blue-800 font-bold text-xl">
                    {format(new Date(workshop.scheduled_date), 'EEEE, dd בMMMM yyyy בשעה HH:mm', { locale: he })}
                  </p>
                </div>
              </div>

              {/* Workshop Details */}
              <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2 justify-center">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>משך: {workshop.duration_minutes || 90} דקות</span>
                </div>
                {workshop.max_participants && (
                  <div className="flex items-center gap-2 justify-center">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>עד {workshop.max_participants} משתתפים</span>
                  </div>
                )}
              </div>

              {/* Meeting Link Section */}
              {workshop.meeting_link && (
                <div className="mb-6">
                  {showMeetingLink ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-center gap-2 text-green-700 mb-3">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">ה{getProductTypeName('workshop', 'singular')} זמינה עכשיו!</span>
                      </div>
                      <Button 
                        onClick={() => window.open(workshop.meeting_link, '_blank')}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg px-8 py-3"
                        size="lg"
                      >
                        <ExternalLink className="w-5 h-5 ml-2" />
                        הצטרף ל{getProductTypeName('workshop', 'singular')}
                      </Button>
                      {workshop.meeting_password && (
                        <p className="text-sm text-gray-600 mt-3">
                          סיסמת המפגש: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">{workshop.meeting_password}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center justify-center gap-2 text-amber-700 mb-2">
                        <Clock className="w-5 h-5" />
                        <span className="font-semibold">קישור למפגש יופיע כאן</span>
                      </div>
                      <p className="text-amber-800 text-sm">
                        הקישור ל{getProductTypeName('workshop', 'singular')} יהיה זמין 10 דקות לפני תחילת ה{getProductTypeName('workshop', 'singular')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-gray-600 mb-6 leading-relaxed">
                {showMeetingLink 
                  ? `ה${getProductTypeName('workshop', 'singular')} זמינה עכשיו! לחץ על הכפתור כדי להצטרף.`
                  : `${getProductTypeName('workshop', 'singular')} זו תתחיל בזמן המתוכנן. תוכל לחזור לכאן או לקבל התראה במייל.`
                }
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  חזור
                </Button>
                <Button 
                  onClick={() => navigate('/account')}
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <Home className="w-4 h-4 ml-2" />
                  לחשבון שלי
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (workshopStatus === 'past_no_recording') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <Card className="text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Video className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">ההקלטה בדרך אליך</h1>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{workshop?.title}</h2>
              
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-purple-700 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">עיבוד וזמינות</span>
                </div>
                <p className="text-purple-800 font-medium">
                  ההקלטה תהיה זמינה תוך 24-48 שעות
                </p>
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                ה{getProductTypeName('workshop', 'singular')} הסתיימה בהצלחה! אנחנו מעבדים את ההקלטה ונעלה אותה בהקדם האפשרי. 
                תקבל הודעה במייל ברגע שההקלטה תהיה זמינה.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  חזור
                </Button>
                <Button 
                  onClick={() => navigate('/account')}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                  <ArrowRight className="w-4 h-4 ml-2" />
                  לחשבון שלי
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Workshop with recording available (workshopStatus === 'past_with_recording')
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            onClick={() => window.history.back()}
            variant="outline"
            className="mb-4"
          >
            ← חזור
          </Button>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="aspect-video rounded-t-lg overflow-hidden">
              <SecureVideoPlayer
                videoUrl={getSecureVideoUrl(workshop.video_file_url || workshop.recording_url)}
                title={workshop.title}
                className="w-full h-full"
              />
            </div>
            
            <div className="p-6">
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl text-gray-900 mb-2">{workshop.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {workshop.category && (
                          <Badge variant="outline">{workshop.category}</Badge>
                        )}
                        <Badge className="bg-blue-600 text-white">
                          {getWorkshopTypeLabel(workshop)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {workshop.description}
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        פרטי ה{getProductTypeName('workshop', 'singular')}
                      </h3>
                      
                      <div className="space-y-3">
                        {workshop.workshop_type === 'online_live' && workshop.scheduled_date && (
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-medium">מועד ה{getProductTypeName('workshop', 'singular')} המקורית</p>
                              <p className="text-gray-600">
                                {format(new Date(workshop.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {workshop.duration_minutes && (
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium">משך זמן</p>
                              <p className="text-gray-600">{workshop.duration_minutes} דקות</p>
                            </div>
                          </div>
                        )}

                        {workshop.workshop_type === 'online_live' && workshop.max_participants && (
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-purple-600" />
                            <div>
                              <p className="font-medium">משתתפים (במקור)</p>
                              <p className="text-gray-600">עד {workshop.max_participants} משתתפים</p>
                            </div>
                          </div>
                        )}

                        {workshop.meeting_platform && workshop.workshop_type === 'online_live' && (
                          <div className="flex items-center gap-3">
                            <Monitor className="w-5 h-5 text-indigo-600" />
                            <div>
                              <p className="font-medium">פלטפורמת המפגש</p>
                              <p className="text-gray-600">{getPlatformLabel(workshop.meeting_platform)}</p>
                            </div>
                          </div>
                        )}

                        {workshop.workshop_type === 'recorded' && (
                          <div className="flex items-center gap-3">
                            <Play className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium">{getProductTypeName('workshop', 'singular')} מוקלטת</p>
                              <p className="text-gray-600">זמינה לצפייה מיידית</p>
                            </div>
                          </div>
                        )}

                        {workshop.target_audience && (
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-orange-600" />
                            <div>
                              <p className="font-medium">קהל יעד</p>
                              <p className="text-gray-600">{workshop.target_audience}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meeting Instructions for Online Live (if needed for past events) */}
                    {workshop.workshop_type === 'online_live' && hasAccess && workshop.meeting_link && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Monitor className="w-5 h-5" />
                          פרטי המפגש המקוריים
                        </h3>
                        
                        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                          <p className="text-sm text-blue-800 font-medium">
                            המפגש התקיים באמצעות:
                          </p>
                          
                          <div className="space-y-2">
                            <div>
                              <Button
                                onClick={() => window.open(workshop.meeting_link, '_blank')}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                              >
                                <ExternalLink className="w-4 h-4 ml-2" />
                                קישור למפגש המקורי
                              </Button>
                            </div>
                            
                            {workshop.meeting_password && (
                              <div className="text-sm">
                                <span className="font-medium">סיסמה: </span>
                                <code className="bg-gray-200 px-2 py-1 rounded text-gray-800">
                                  {workshop.meeting_password}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => navigate(PRODUCT_TYPES.game.url)}
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <Home className="w-4 h-4 ml-2" />
                  חזור לקטלוג ה{getProductTypeName('workshop', 'plural')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Add helper functions at the end
const getWorkshopTypeLabel = (workshop) => {
  switch (workshop.workshop_type) {
    case 'online_live':
      return `${getProductTypeName('workshop', 'singular')} אונליין חיה`;
    case 'recorded':
      return `${getProductTypeName('workshop', 'singular')} מוקלטת`;
    default:
      return getProductTypeName('workshop', 'singular');
  }
};

const getPlatformLabel = (platform) => {
  switch (platform) {
    case 'zoom':
      return 'Zoom';
    case 'google_meet':
      return 'Google Meet';
    case 'teams':
      return 'Microsoft Teams';
    case 'other':
      return 'אחר';
    default:
      return platform;
  }
};
