import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Workshop, Course, File, Tool, Product, Category, Game, LessonPlan } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { deleteFile } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import KitBadge from "@/components/ui/KitBadge";
import CurriculumLinkButton from "@/components/ui/CurriculumLinkButton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useConfirmation } from '@/components/ui/ConfirmationProvider';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Play,
  Package,
  User as UserIcon,
  Users,
  FileType,
  Image,
  Video,
  AlignLeft,
  RefreshCw,
  MessageSquare,
  Eye
} from "lucide-react";
import { getProductTypeName, PRODUCT_TYPES } from '@/config/productTypes';
import { formatPriceSimple } from '@/lib/utils';
import FeatureFlagService from '@/services/FeatureFlagService';
import { toast } from '@/components/ui/use-toast';
import { usePaymentPageStatusCheck } from '@/hooks/usePaymentPageStatusCheck';
import { useSubscriptionPaymentStatusCheck } from '@/hooks/useSubscriptionPaymentStatusCheck';
import { ludlog } from "@/lib/ludlog";

export default function Products() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, settings, isLoading: userLoading } = useUser();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContentCreator, setIsContentCreator] = useState(false);
  const [showAllContent, setShowAllContent] = useState(true);
  const [visibleProductTypes, setVisibleProductTypes] = useState([]);

  // Access context and permissions
  const [isContentCreatorMode, setIsContentCreatorMode] = useState(false);
  const [contentCreatorPermissions, setContentCreatorPermissions] = useState({
    workshops: true,
    courses: true,
    files: true,
    tools: true,
    games: true,
    lesson_plans: true
  });
  const [selectedTab, setSelectedTab] = useState(null);

  // Use the existing confirmation system
  const { showConfirmation } = useConfirmation();

  // Payment page status checking - check for pending payments and handle abandoned pages
  const paymentStatus = usePaymentPageStatusCheck({
    enabled: true,
    showToasts: true, // Show user notifications about payment status changes
    onStatusUpdate: (update) => {
      ludlog.payment('Products: Payment status update received:', update);

      // Refresh products list when payments are processed (user might have new access)
      if (update.type === 'continue_polling' && update.count > 0) {
        loadData();
      }
    }
  });

  // Subscription payment status checking - check for pending subscriptions and handle completion/failure
  const subscriptionPaymentStatus = useSubscriptionPaymentStatusCheck({
    enabled: true,
    showToasts: true, // Show user notifications about subscription status changes
    checkInterval: 20000, // Check every 20 seconds as specified by user
    onStatusUpdate: (update) => {
      ludlog.payment('Products: Subscription status update received:', update);

      // Reload products data when subscription is activated or cancelled
      if (update.type === 'subscription_activated' || update.type === 'subscription_cancelled') {
        loadData(); // Refresh to get updated user subscription status
      }
    }
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check access permissions
      const hasAdminAccess = currentUser.role === 'admin' || currentUser.role === 'sysadmin';
      const hasContentCreatorAccess = currentUser.content_creator_agreement_sign_date;

      setIsAdmin(hasAdminAccess);
      setIsContentCreator(hasContentCreatorAccess);

      // Load visible product types based on nav_*_visibility settings
      const productTypesToCheck = ['file', 'course', 'workshop', 'tool', 'game', 'lesson_plan'];
      const visibleTypes = [];

      for (const productType of productTypesToCheck) {
        const visibility = await FeatureFlagService.getFeatureVisibility(settings,
          productType === 'file' ? 'files' :
          productType === 'lesson_plan' ? 'lesson_plans' :
          `${productType}s`
        );

        // Product management is admin-only regardless of public visibility
        // But we respect if something is explicitly hidden
        if (visibility !== 'hidden' && (hasAdminAccess || hasContentCreatorAccess)) {
          visibleTypes.push(productType);
        }
      }

      setVisibleProductTypes(visibleTypes);

      // Set default selected tab to first visible type
      if (visibleTypes.length > 0 && !selectedTab) {
        setSelectedTab(visibleTypes[0]);
      }

      // Detect access context
      const contextParam = searchParams.get('context');
      const isInContentCreatorMode = contextParam === 'creator' && hasContentCreatorAccess;
      setIsContentCreatorMode(isInContentCreatorMode);

      // Load content creator permissions from global settings
      if (isInContentCreatorMode) {
        setContentCreatorPermissions({
          workshops: settings?.allow_content_creator_workshops !== false,
          courses: settings?.allow_content_creator_courses !== false,
          files: settings?.allow_content_creator_files !== false,
          tools: settings?.allow_content_creator_tools !== false,
          games: settings?.allow_content_creator_games !== false,
          lesson_plans: settings?.allow_content_creator_lesson_plans !== false
        });
      }

      if (hasAdminAccess || hasContentCreatorAccess) {
        // Determine what products to load
        let productsQuery = {};
        if (!hasAdminAccess && hasContentCreatorAccess) {
          // Content creators see only their own content
          productsQuery = { creator_user_id: currentUser.id };
        } else if (hasAdminAccess && !showAllContent) {
          // Admins/sysadmins can choose to see only their own content
          productsQuery = { creator_user_id: currentUser.id };
        }
        // If hasAdminAccess && showAllContent, load all products (empty query)

        // Fetch all products from the unified Product table with joined entity data
        const [allProductsData, categoriesData] = await Promise.all([
          Product.listEnriched(productsQuery),
          Category.find({}, "name")
        ]);

        const allProducts = allProductsData || [];

        // Sort by creation date (newest first)
        allProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setProducts(allProducts);
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  }, [currentUser, settings, showAllContent, selectedTab]);

  // Helper function to check if a product type can be created
  const canCreateProductType = useCallback((productType) => {
    // Tools cannot be created via UI - they are defined as constants in the Tool service class
    if (productType === 'tool') {
      return false;
    }

    // If not in content creator mode (admin access), all other product types are allowed
    if (!isContentCreatorMode) {
      return true;
    }

    // In content creator mode, check permissions
    switch (productType) {
      case 'workshop':
        return contentCreatorPermissions.workshops;
      case 'course':
        return contentCreatorPermissions.courses;
      case 'file':
        return contentCreatorPermissions.files;
      case 'game':
        return contentCreatorPermissions.games;
      case 'lesson_plan':
        return contentCreatorPermissions.lesson_plans;
      default:
        return false;
    }
  }, [isContentCreatorMode, contentCreatorPermissions]);

  useEffect(() => {
    if (currentUser && !userLoading) {
      loadData();
    }
  }, [currentUser, userLoading, loadData]);

  // Separate useEffect to handle edit parameter after products are loaded
  useEffect(() => {
    if (products.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const editProductId = urlParams.get('edit');
      if (editProductId) {
        const productToEdit = products.find(p => p.id === editProductId);
        if (productToEdit) {
          // Navigate to edit page instead of opening modal
          navigate(`/products/edit/${editProductId}`);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [products, navigate]);

  const handleEdit = (product) => {
    navigate(`/products/edit/${product.id}`);
  };

  const handleCreateNew = () => {
    navigate('/products/create');
  };

  const handleRefresh = () => {
    toast({
      title: "מרענן רשימת מוצרים",
      description: "טוען נתונים עדכניים...",
      variant: "default"
    });
    loadData();
  };

  // Extract deletion logic into separate async function
  const performProductDeletion = async (product) => {
    // Delete associated assets first
    const filesToDelete = [];

    // For workshops, collect video files
    if (product.product_type === 'workshop' && product.video_file_url) {
      filesToDelete.push({ file_uri: product.video_file_url, type: 'video' });
    }

    // For files, collect main file and preview file
    if (product.product_type === 'file') {
      if (product.file_url) {
        filesToDelete.push({ file_uri: product.file_url, type: 'main file' });
      }
      if (product.preview_file_url) {
        filesToDelete.push({ file_uri: product.preview_file_url, type: 'preview file' });
      }
    }

    // Delete all associated files
    for (const fileToDelete of filesToDelete) {
      try {
        await deleteFile({ file_uri: fileToDelete.file_uri });
      } catch (fileError) {
        // Continue with product deletion even if file deletion fails
      }
    }

    // Delete from the correct entity type
    switch (product.product_type) {
      case 'workshop':
        if (product.entity_id) {
          try {
            await Workshop.delete(product.entity_id);
          } catch (error) {
            // Continue with product deletion even if entity deletion fails
          }
        }
        break;
      case 'course':
        if (product.entity_id) {
          try {
            await Course.delete(product.entity_id);
          } catch (error) {
            // Continue with product deletion even if entity deletion fails
          }
        }
        break;
      case 'file':
        if (product.entity_id) {
          try {
            await File.delete(product.entity_id);
          } catch (error) {
            // Continue with product deletion even if entity deletion fails
          }
        }
        break;
      case 'tool':
        if (product.entity_id) {
          try {
            await Tool.delete(product.entity_id);
          } catch (error) {
            // Continue with product deletion even if entity deletion fails
          }
        }
        break;
      case 'game':
        if (product.entity_id) {
          try {
            await Game.delete(product.entity_id);
          } catch (error) {
            // Continue with product deletion even if entity deletion fails
          }
        }
        break;
      case 'lesson_plan':
        if (product.entity_id) {
          try {
            await LessonPlan.delete(product.entity_id);
          } catch (error) {
            // Continue with product deletion even if entity deletion fails
          }
        }
        break;
      default:
        throw new Error('Unknown product type');
    }

    // Finally, delete the product record itself
    try {
      await Product.delete(product.id);
    } catch (productError) {
      // Don't throw error if product doesn't exist - it might have been deleted already
      if (!productError.message?.includes('not found')) {
        throw productError; // Re-throw if it's not a "not found" error
      }
    }

    // Refresh the list to remove any stale data
    loadData();
  };

  const handleDeleteClick = async (product) => {
    try {
      await showConfirmation(
        'מחיקת מוצר',
        `האם אתה בטוח שברצונך למחוק את המוצר "${product.title}"?\n\nפעולה זו לא ניתנת לביטול ותסיר את המוצר וכל הנתונים הקשורים אליו מהמערכת.`,
        {
          confirmText: 'מחק מוצר',
          cancelText: 'ביטול',
          variant: 'danger',
          asyncOperation: () => performProductDeletion(product),
          loadingMessage: 'מוחק מוצר...',
          successMessage: 'המוצר נמחק בהצלחה!',
          errorMessage: 'שגיאה במחיקת המוצר'
        }
      );

      // The dialog now handles the success/error states and loading spinner
      // No need for additional toast calls here
    } catch (error) {
      // Error handled by confirmation dialog
    }
  };

  const getFilteredProducts = () => {
    return products.filter(product => product.product_type === selectedTab);
  };

  const getDataIndicators = (product) => {
    const hasDescription = product.description && product.description.trim().length > 0;
    const hasLongDescription = product.description && product.description.trim().length > 100;

    // Use standardized has_image field (from Product table)
    const hasImage = product.has_image === true;

    // Marketing video check (from Product table)
    const hasVideo = (product.marketing_video_type && product.marketing_video_id && product.marketing_video_id.trim().length > 0) ||
                     (product.video_file_url && product.video_file_url.trim().length > 0);

    // Product type checks
    const isFileProduct = product.product_type === 'file';
    const isLessonPlanProduct = product.product_type === 'lesson_plan';
    const supportsPreview = isFileProduct || isLessonPlanProduct;

    // Preview functionality - different field names per product type
    const hasPreview = (isFileProduct && product.allow_preview === true) ||
                       (isLessonPlanProduct && product.allow_slide_preview === true);

    // Branding - same field name for both types
    const hasBranding = supportsPreview && (product.add_branding === true);

    // Content validation - check for actual uploaded content
    const hasFileContent = isFileProduct && product.file_name && product.file_name.trim().length > 0;
    const hasLessonPlanContent = isLessonPlanProduct &&
      product.file_configs &&
      Array.isArray(product.file_configs) &&
      product.file_configs.some(config =>
        config.file_role === 'presentation' &&
        config.file_path &&
        config.file_path.toLowerCase().endsWith('.svg')
      );

    return (
      <TooltipProvider>
        <div className="flex items-center justify-center gap-1">
          {/* Standard indicators for all products */}
          <Tooltip>
            <TooltipTrigger asChild>
              <MessageSquare
                className={`w-3.5 h-3.5 cursor-help ${hasDescription ? 'text-green-600' : 'text-gray-300'}`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-800 text-white border-gray-600">
              <p className="text-xs font-medium" dir="rtl">
                {hasDescription ? 'יש תיאור למוצר' : 'אין תיאור למוצר'}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <AlignLeft
                className={`w-3.5 h-3.5 cursor-help ${hasLongDescription ? 'text-blue-600' : 'text-gray-300'}`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-800 text-white border-gray-600">
              <p className="text-xs font-medium" dir="rtl">
                {hasLongDescription ? 'יש תיאור מפורט (מעל 100 תווים)' : 'אין תיאור מפורט'}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Image
                className={`w-3.5 h-3.5 cursor-help ${hasImage ? 'text-purple-600' : 'text-gray-300'}`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-800 text-white border-gray-600">
              <p className="text-xs font-medium" dir="rtl">
                {hasImage ? 'יש תמונה למוצר' : 'אין תמונה למוצר'}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Video
                className={`w-3.5 h-3.5 cursor-help ${hasVideo ? 'text-red-600' : 'text-gray-300'}`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-800 text-white border-gray-600">
              <p className="text-xs font-medium" dir="rtl">
                {hasVideo ? 'יש סרטון שיווקי למוצר' : 'אין סרטון שיווקי למוצר'}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Preview indicators (only for files and lesson plans) */}
          {supportsPreview && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Eye
                  className={`w-3.5 h-3.5 cursor-help ${hasPreview ? 'text-cyan-600' : 'text-gray-300'}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-gray-800 text-white border-gray-600">
                <p className="text-xs font-medium" dir="rtl">
                  {hasPreview ? 'מאפשר תצוגה מקדימה' : 'לא מאפשר תצוגה מקדימה'}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {supportsPreview && (
            <Tooltip>
              <TooltipTrigger asChild>
                <img
                  src="/logo_sm.svg"
                  alt="Branding"
                  className={`w-3.5 h-3.5 cursor-help ${hasBranding ? 'opacity-100' : 'opacity-30 grayscale'}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-gray-800 text-white border-gray-600">
                <p className="text-xs font-medium" dir="rtl">
                  {hasBranding ? 'התצוגה המקדימה כולל מיתוג' : 'התצוגה המקדימה ללא מיתוג'}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Conditional content indicators (at the end) */}
          {isFileProduct && (
            <Tooltip>
              <TooltipTrigger asChild>
                <FileType
                  className={`w-3.5 h-3.5 cursor-help ${hasFileContent ? 'text-orange-600' : 'text-gray-300'}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-gray-800 text-white border-gray-600">
                <p className="text-xs font-medium" dir="rtl">
                  {hasFileContent ? 'יש קובץ מועלה' : 'אין קובץ מועלה'}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {isLessonPlanProduct && (
            <Tooltip>
              <TooltipTrigger asChild>
                <FileType
                  className={`w-3.5 h-3.5 cursor-help ${hasLessonPlanContent ? 'text-orange-600' : 'text-gray-300'}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-gray-800 text-white border-gray-600">
                <p className="text-xs font-medium" dir="rtl">
                  {hasLessonPlanContent ? 'יש מצגת SVG' : 'אין מצגת SVG'}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  };

  // Handle unauthorized access with toast and redirect
  useEffect(() => {
    if (!userLoading && !isLoading && !isAdmin && !isContentCreator) {
      toast({
        title: "אין הרשאות גישה",
        description: "רק מנהלים ויוצרי תוכן יכולים לגשת לדף ניהול המוצרים",
        variant: "destructive"
      });
      navigate('/');
      return;
    }
  }, [userLoading, isLoading, isAdmin, isContentCreator, navigate, toast]);

  if (!isAdmin && !isContentCreator) {
    return null; // Component will redirect before rendering
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20" dir="rtl">
      <div className="max-w-full mx-auto px-0 py-2 sm:px-1 sm:py-3 lg:px-8 xl:px-16 lg:py-4">
        {/* Modern Header */}
        <div className="mb-4 md:mb-6">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border border-blue-100/50 shadow-lg backdrop-blur-sm ring-1 ring-blue-900/5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 md:p-3 rounded-lg md:rounded-xl shadow-lg">
                  <Package className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    ניהול מוצרים
                  </h1>
                  <p className="text-gray-600 text-sm sm:text-base md:text-lg mt-1 hidden sm:block">
                    נהל וארגן את {getProductTypeName('file', 'plural')}, {getProductTypeName('course', 'plural')} ו{getProductTypeName('workshop', 'plural')} שלך במקום אחד
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-3">
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{products.filter(p => p.is_published).length} פורסמו</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-500">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>{products.filter(p => !p.is_published).length} טיוטות</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                {/* Admin Toggle */}
                {isAdmin && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 border border-white/20">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Switch
                        checked={showAllContent}
                        onCheckedChange={setShowAllContent}
                        id="show-all-content"
                      />
                      <label htmlFor="show-all-content" className="text-sm font-medium">
                        {showAllContent ? (
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            כל התוכן במערכת
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            התוכן שלי בלבד
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm hover:shadow-md transition-all duration-200 px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4 md:w-5 md:h-5 ml-1.5 md:ml-2" />
                  רענן
                </Button>
                <Button
                  onClick={handleCreateNew}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5 ml-1.5 md:ml-2" />
                  מוצר חדש
                </Button>
              </div>
            </div>
          </div>
        </div>



        {/* Enhanced Tabs */}
        {visibleProductTypes.length > 0 && (
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg border border-slate-200/60 p-2 md:p-3 mb-4 md:mb-6 ring-1 ring-slate-900/5">
              <TabsList className="flex w-full flex-wrap justify-center lg:justify-center lg:gap-6 bg-slate-50/50 backdrop-blur-sm gap-1 md:gap-2 p-1 rounded-lg md:rounded-xl">
                {visibleProductTypes.map(productType => {
                  const config = PRODUCT_TYPES[productType];
                  const IconComponent = config.icon;

                  // Get gradient colors for active state
                  const getActiveGradient = (type) => {
                    switch (type) {
                      case 'file': return 'data-[state=active]:from-purple-500 data-[state=active]:to-purple-600';
                      case 'course': return 'data-[state=active]:from-green-500 data-[state=active]:to-green-600';
                      case 'workshop': return 'data-[state=active]:from-blue-500 data-[state=active]:to-blue-600';
                      case 'tool': return 'data-[state=active]:from-orange-500 data-[state=active]:to-orange-600';
                      case 'game': return 'data-[state=active]:from-pink-500 data-[state=active]:to-pink-600';
                      case 'lesson_plan': return 'data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600';
                      default: return 'data-[state=active]:from-gray-500 data-[state=active]:to-gray-600';
                    }
                  };

                  return (
                    <TabsTrigger
                      key={productType}
                      value={productType}
                      className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium px-2 py-2 md:px-4 md:py-3 rounded-md md:rounded-lg data-[state=active]:bg-gradient-to-r ${getActiveGradient(productType)} data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-50 flex-1 lg:flex-none min-w-0`}
                    >
                      <IconComponent className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden md:inline">{config.plural}</span>
                      <span className="md:hidden">{config.navText}</span>
                      <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                        {products.filter(p => p.product_type === productType).length}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {selectedTab && (
              <TabsContent value={selectedTab} className="space-y-6">
                {getFilteredProducts().length > 0 ? (
              <>
                {/* Mobile/Tablet Card Layout */}
                <div className="block lg:hidden space-y-4">
                  {getFilteredProducts().map((product) => {
                    return (
                      <div
                        key={product.id}
                        className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-4 hover:shadow-xl transition-all duration-300 ring-1 ring-slate-900/5"
                      >
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2" dir="rtl">
                              <h3 className="font-bold text-slate-900 text-lg leading-tight text-right flex-1">
                                {product.title}
                              </h3>
                              <KitBadge product={product} variant="compact" size="sm" />
                            </div>
                            {product.short_description && (
                              <p className="text-sm text-slate-600 mb-3" dir="rtl">
                                {product.short_description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 mr-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-700 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <CurriculumLinkButton
                              product={product}
                              variant="table"
                              size="sm"
                              className="h-9 w-9 p-0 rounded-lg"
                              onLinksUpdated={loadData}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(product)}
                              className="h-9 w-9 p-0 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Data Indicators */}
                        <div className="flex justify-center mb-3">
                          <div className="bg-slate-50 rounded-lg px-3 py-2">
                            <div className="text-xs text-slate-500 mb-1 text-center">נתונים זמינים</div>
                            {getDataIndicators(product)}
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Price */}
                          <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">מחיר</div>
                            <div className="text-lg font-bold text-blue-600" dir="rtl">
                              {formatPriceSimple(product.price, product.price === 0)}
                            </div>
                            {product.access_days && (
                              <div className="text-xs text-slate-500 mt-1" dir="rtl">
                                {(product.access_days === null || product.access_days === undefined) ? 'לכל החיים' : `${product.access_days} ימים`}
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">סטטוס</div>
                            <Badge
                              variant={product.is_published ? "default" : "secondary"}
                              className={`font-medium ${product.is_published ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}
                            >
                              {product.is_published ? "פורסם" : "טיוטה"}
                            </Badge>
                          </div>

                          {/* File Type */}
                          <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">סוג קובץ</div>
                            {product.product_type === 'file' && product.file_type ? (
                              <Badge variant="outline" className="font-medium uppercase bg-purple-50 text-purple-700 border-purple-200">
                                {product.file_type}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </div>

                          {/* Category */}
                          <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">קטגוריה</div>
                            {product.category ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {product.category}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </div>

                          {/* Creator (Admin only) */}
                          {isAdmin && showAllContent && (
                            <div className="col-span-2 text-center">
                              <div className="text-xs text-slate-500 mb-1">יוצר</div>
                              <div className="text-sm font-medium text-slate-900">
                                {product.creator?.full_name || 'Ludora'}
                              </div>
                              {product.creator?.email && (
                                <div className="text-xs text-slate-500 mt-1">
                                  {product.creator.email}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Tags and Additional Info */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <div className="flex flex-wrap gap-2 justify-center">
                            {product.target_audience && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <Users className="w-3 h-3 ml-1" />
                                {product.target_audience && product.target_audience.length > 15 ? `${product.target_audience.substring(0, 12)}...` : product.target_audience}
                              </Badge>
                            )}
                            {product.marketing_video_type && product.marketing_video_id && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                <Play className="w-3 h-3 ml-1" />
                                סרטון
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden lg:block bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden ring-1 ring-slate-900/5">
                  {/* Modern Table Header */}
                  <div className="bg-gradient-to-l from-slate-50 to-white px-4 py-4 border-b border-slate-200/60 backdrop-blur-sm">
                    <div className="grid grid-cols-12 gap-2 items-center text-sm font-bold text-slate-700">
                      <div className="col-span-1 text-center">פעולות</div>
                      <div className="col-span-2 text-center">נתונים</div>
                      <div className={`${isAdmin && showAllContent ? 'col-span-1' : 'col-span-1'} text-center`}>מחיר</div>
                      {isAdmin && showAllContent && (
                        <div className="col-span-1 text-center">יוצר</div>
                      )}
                      <div className="col-span-1 text-center">קטגוריה</div>
                      <div className="col-span-1 text-center">סטטוס</div>
                      <div className={`${isAdmin && showAllContent ? 'col-span-5' : 'col-span-6'} text-right`}>כותרת</div>
                    </div>
                  </div>

                {/* Modern Table Body */}
                <div className="divide-y divide-gray-100">
                  {getFilteredProducts().map((product, index) => {
                    return (
                      <div
                        key={product.id}
                        className={`grid grid-cols-12 gap-2 items-center px-3 py-3 hover:bg-gradient-to-l hover:from-blue-50/40 hover:to-indigo-50/20 transition-all duration-300 border-b border-slate-100/50 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        }`}
                      >
                        {/* Actions */}
                        <div className="col-span-1 text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <CurriculumLinkButton
                              product={product}
                              variant="table"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg transition-colors"
                              onLinksUpdated={loadData}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(product)}
                              className="h-8 w-8 p-0 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Data Indicators */}
                        <div className="col-span-2 text-center">
                          {getDataIndicators(product)}
                        </div>

                        {/* Price */}
                        <div className={`${isAdmin && showAllContent ? 'col-span-1' : 'col-span-1'} text-center`}>
                          <div className="font-bold text-base" dir="rtl">
                            <span className={product.price > 0 ? "text-emerald-600" : "text-blue-600"}>
                              {formatPriceSimple(product.price, product.price === 0)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1" dir="rtl">
                            {(product.access_days === null || product.access_days === undefined) ? 'לכל החיים' : `${product.access_days} ימים`}
                          </div>
                        </div>

                        {/* Creator (Admin only) */}
                        {isAdmin && showAllContent && (
                          <div className="col-span-1 text-center">
                            <div className="text-sm">
                              <div className="font-medium text-slate-900">
                                {product.creator?.full_name || 'Ludora'}
                              </div>
                              {product.creator?.email && (
                                <div className="text-xs text-slate-500">
                                  {product.creator.email}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Category */}
                        <div className="col-span-1 text-center">
                          {product.category ? (
                            <Badge variant="outline" className="font-medium border-slate-300 text-slate-700 bg-slate-50 text-xs">
                              {product.category.length > 8 ? `${product.category.substring(0, 6)}...` : product.category}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </div>

                        {/* Status */}
                        <div className="col-span-1 text-center">
                          <Badge
                            variant={product.is_published ? "default" : "secondary"}
                            className={`font-medium ${product.is_published ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}
                          >
                            {product.is_published ? "פורסם" : "טיוטה"}
                          </Badge>
                        </div>

                        {/* Title */}
                        <div className={`${isAdmin && showAllContent ? 'col-span-5' : 'col-span-6'} text-right`}>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1" dir="rtl">
                              <h3 className="font-bold text-slate-900 text-base leading-tight text-right flex-1">
                                {product.title}
                              </h3>
                              <KitBadge product={product} variant="default" size="sm" />
                            </div>
                            {product.short_description && (
                              <p className="text-sm text-slate-600 line-clamp-1 mb-2">
                                {product.short_description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 justify-end mt-1">
                              {product.target_audience && (
                                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                                  <Users className="w-3 h-3 ml-1" />
                                  {product.target_audience && product.target_audience.length > 20 ? `${product.target_audience.substring(0, 17)}...` : product.target_audience}
                                </Badge>
                              )}
                              {product.marketing_video_type && product.marketing_video_id && (
                                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border-red-200">
                                  <Play className="w-3 h-3 ml-1" />
                                  סרטון
                                </Badge>
                              )}
                              {product.tags && product.tags.length > 0 && (
                                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-slate-50 text-slate-600 border-slate-200">
                                  {product.tags?.length || 0} תגיות
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 mx-auto max-w-md">
                  <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">אין מוצרים עדיין</h3>
                  <p className="text-gray-500 mb-6 leading-relaxed">
                    כאשר תוסיף מוצרים חדשים, הם יופיעו כאן
                  </p>
                  <Button
                    onClick={handleCreateNew}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    צור מוצר ראשון
                  </Button>
                </div>
              </div>
            )}
              </TabsContent>
            )}
          </Tabs>
        )}

        {/* Empty state when no product types are visible */}
        {visibleProductTypes.length === 0 && !isLoading && (
          <div className="text-center py-20 text-gray-500">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 mx-auto max-w-md">
              <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-3">אין מוצרים זמינים</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">
                לא נמצאו סוגי מוצרים נגישים על פי הגדרות התצוגה
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}