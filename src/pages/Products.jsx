import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Workshop, Course, File, Tool, Product, Category, User, Settings } from "@/services/entities";
import { deleteFile } from "@/services/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductModal from '@/components/modals/ProductModal';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  BookOpen,
  Play,
  AlertCircle,
  CheckCircle,
  Package,
  User as UserIcon,
  Users,
  FileType,
  Image,
  Video,
  AlignLeft
} from "lucide-react";
import { getProductTypeName } from '@/config/productTypes';
import { formatPriceSimple } from '@/lib/utils';

export default function Products() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [message, setMessage] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContentCreator, setIsContentCreator] = useState(false);
  const [showAllContent, setShowAllContent] = useState(true);

  // Access context and permissions
  const [isContentCreatorMode, setIsContentCreatorMode] = useState(false);
  const [contentCreatorPermissions, setContentCreatorPermissions] = useState({
    workshops: true,
    courses: true,
    files: true,
    tools: true
  });
  const [selectedTab, setSelectedTab] = useState("file");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      // Check access permissions
      const hasAdminAccess = user.role === 'admin' || user.role === 'sysadmin';
      const hasContentCreatorAccess = user.content_creator_agreement_sign_date;

      setIsAdmin(hasAdminAccess);
      setIsContentCreator(hasContentCreatorAccess);

      // Detect access context
      const contextParam = searchParams.get('context');
      const isInContentCreatorMode = contextParam === 'creator' && hasContentCreatorAccess;
      setIsContentCreatorMode(isInContentCreatorMode);

      // Load content creator permissions if in content creator mode
      if (isInContentCreatorMode) {
        try {
          const settingsData = await Settings.find();
          const settings = settingsData.length > 0 ? settingsData[0] : {};
          setContentCreatorPermissions({
            workshops: settings.allow_content_creator_workshops !== false,
            courses: settings.allow_content_creator_courses !== false,
            files: settings.allow_content_creator_files !== false,
            tools: settings.allow_content_creator_tools !== false
          });
        } catch (error) {
          console.warn('Failed to load content creator permissions:', error);
          // Use defaults if settings can't be loaded
        }
      }

      if (hasAdminAccess || hasContentCreatorAccess) {
        // Determine what products to load
        let productsQuery = {};
        if (!hasAdminAccess && hasContentCreatorAccess) {
          // Content creators see only their own content
          productsQuery = { creator_user_id: user.id };
        } else if (hasAdminAccess && !showAllContent) {
          // Admins/sysadmins can choose to see only their own content
          productsQuery = { creator_user_id: user.id };
        }
        // If hasAdminAccess && showAllContent, load all products (empty query)

        // Fetch all products from the unified Product table with joined entity data
        const [allProductsData, categoriesData] = await Promise.all([
          Product.find(productsQuery),
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
  }, [showAllContent]);

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
      default:
        return false;
    }
  }, [isContentCreatorMode, contentCreatorPermissions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Separate useEffect to handle edit parameter after products are loaded
  useEffect(() => {
    if (products.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const editProductId = urlParams.get('edit');
      if (editProductId) {
        const productToEdit = products.find(p => p.id === editProductId);
        if (productToEdit) {
          handleEdit(productToEdit);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [products]);

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const handleModalSave = () => {
    loadData();
  };

  const handleDelete = async (product) => {
    if (!confirm("האם למחוק את המוצר?")) return;

    try {
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
          console.log(`${fileToDelete.type} deleted successfully:`, fileToDelete.file_uri);
        } catch (fileError) {
          console.warn(`Failed to delete ${fileToDelete.type}:`, fileError);
          // Continue with product deletion even if file deletion fails
        }
      }

      // Delete from the correct entity type
      switch (product.product_type) {
        case 'workshop':
          await Workshop.delete(product.id);
          break;
        case 'course':
          await Course.delete(product.id);
          break;
        case 'file':
          await File.delete(product.id);
          break;
        case 'tool':
          await Tool.delete(product.id);
          break;
        default:
          throw new Error('Unknown product type');
      }

      setMessage({ type: 'success', text: 'המוצר נמחק בהצלחה' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה במחיקת המוצר' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const getFilteredProducts = () => {
    return products.filter(product => product.product_type === selectedTab);
  };

  const getProductIcon = (type) => {
    switch (type) {
      case 'workshop':
        return <Play className="w-5 h-5 text-blue-500" />;
      case 'course':
        return <BookOpen className="w-5 h-5 text-green-500" />;
      case 'file':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'tool':
        return <Package className="w-5 h-5 text-orange-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getProductTypeLabel = (type) => {
    return getProductTypeName(type, 'singular') || 'מוצר';
  };

  const getProductTypeIcon = (type) => {
    switch (type) {
      case 'workshop':
        return Play;
      case 'course':
        return BookOpen;
      case 'file':
        return FileText;
      case 'tool':
        return Package;
      default:
        return Package;
    }
  };

  const getProductTypeBadgeColor = (type) => {
    switch (type) {
      case 'workshop':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'course':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'file':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'tool':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDataIndicators = (product) => {
    const hasDescription = product.description && product.description.trim().length > 0;
    const hasLongDescription = product.description && product.description.trim().length > 100;
    const hasImage = product.image_url && product.image_url.trim().length > 0;
    const hasVideo = (product.marketing_video_type && product.marketing_video_id && product.marketing_video_id.trim().length > 0) ||
                     (product.video_file_url && product.video_file_url.trim().length > 0);

    return (
      <div className="flex items-center justify-center gap-1">
        <FileType
          className={`w-3.5 h-3.5 ${hasDescription ? 'text-green-600' : 'text-gray-300'}`}
          title={hasDescription ? 'יש תיאור' : 'אין תיאור'}
        />
        <AlignLeft
          className={`w-3.5 h-3.5 ${hasLongDescription ? 'text-blue-600' : 'text-gray-300'}`}
          title={hasLongDescription ? 'יש תיאור מפורט' : 'אין תיאור מפורט'}
        />
        <Image
          className={`w-3.5 h-3.5 ${hasImage ? 'text-purple-600' : 'text-gray-300'}`}
          title={hasImage ? 'יש תמונה' : 'אין תמונה'}
        />
        <Video
          className={`w-3.5 h-3.5 ${hasVideo ? 'text-red-600' : 'text-gray-300'}`}
          title={hasVideo ? 'יש סרטון' : 'אין סרטון'}
        />
      </div>
    );
  };

  if (!isAdmin && !isContentCreator) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין לך הרשאות גישה לדף ניהול המוצרים. רק מנהלים ויוצרי תוכן יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
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
                
                {/* Action Button */}
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

        {/* Message Alert */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-4 sm:mb-6">
            {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Product Modal */}
        <ProductModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          editingProduct={editingProduct}
          onSave={handleModalSave}
          currentUser={currentUser}
          canCreateProductType={canCreateProductType}
          isContentCreatorMode={isContentCreatorMode}
        />

        {/* Enhanced Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg border border-slate-200/60 p-2 md:p-3 mb-4 md:mb-6 ring-1 ring-slate-900/5">
            <TabsList className="flex w-full flex-wrap justify-center lg:justify-center lg:gap-6 bg-slate-50/50 backdrop-blur-sm gap-1 md:gap-2 p-1 rounded-lg md:rounded-xl">
              <TabsTrigger
                value="file"
                className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium px-2 py-2 md:px-4 md:py-3 rounded-md md:rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-50 flex-1 lg:flex-none min-w-0"
              >
                <FileText className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">{getProductTypeName('file', 'plural')}</span>
                <span className="md:hidden">קבצים</span>
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                  {products.filter(p => p.product_type === 'file').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="course"
                className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium px-2 py-2 md:px-4 md:py-3 rounded-md md:rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-50 flex-1 lg:flex-none min-w-0"
              >
                <BookOpen className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">{getProductTypeName('course', 'plural')}</span>
                <span className="md:hidden">קורסים</span>
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                  {products.filter(p => p.product_type === 'course').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="workshop"
                className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium px-2 py-2 md:px-4 md:py-3 rounded-md md:rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-50 flex-1 lg:flex-none min-w-0"
              >
                <Play className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">{getProductTypeName('workshop', 'plural')}</span>
                <span className="md:hidden">סדנאות</span>
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                  {products.filter(p => p.product_type === 'workshop').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="tool"
                className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium px-2 py-2 md:px-4 md:py-3 rounded-md md:rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-50 flex-1 lg:flex-none min-w-0"
              >
                <Package className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">{getProductTypeName('tool', 'plural')}</span>
                <span className="md:hidden">כלים</span>
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                  {products.filter(p => p.product_type === 'tool').length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={selectedTab} className="space-y-6">
            {getFilteredProducts().length > 0 ? (
              <>
                {/* Mobile/Tablet Card Layout */}
                <div className="block lg:hidden space-y-4">
                  {getFilteredProducts().map((product, index) => {
                    const IconComponent = getProductTypeIcon(product.product_type);
                    return (
                      <div
                        key={product.id}
                        className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-4 hover:shadow-xl transition-all duration-300 ring-1 ring-slate-900/5"
                      >
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-900 text-lg leading-tight mb-2" dir="rtl">
                              {product.title}
                            </h3>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product)}
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
                              {formatPriceSimple(product.price, (!product.original_price && product.original_price !== 0) && product.price === 0)}
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
                      <div className="col-span-1 text-center">נתונים</div>
                      <div className={`${isAdmin && showAllContent ? 'col-span-1' : 'col-span-1'} text-center`}>מחיר</div>
                      {isAdmin && showAllContent && (
                        <div className="col-span-1 text-center">יוצר</div>
                      )}
                      <div className="col-span-1 text-center">קטגוריה</div>
                      <div className="col-span-1 text-center">סוג</div>
                      <div className="col-span-1 text-center">סטטוס</div>
                      <div className={`${isAdmin && showAllContent ? 'col-span-5' : 'col-span-6'} text-right`}>כותרת</div>
                    </div>
                  </div>

                {/* Modern Table Body */}
                <div className="divide-y divide-gray-100">
                  {getFilteredProducts().map((product, index) => {
                    const IconComponent = getProductTypeIcon(product.product_type);
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product)}
                              className="h-8 w-8 p-0 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Data Indicators */}
                        <div className="col-span-1 text-center">
                          {getDataIndicators(product)}
                        </div>

                        {/* Price */}
                        <div className={`${isAdmin && showAllContent ? 'col-span-1' : 'col-span-1'} text-center`}>
                          <div className="font-bold text-base" dir="rtl">
                            <span className={product.price > 0 ? "text-emerald-600" : "text-blue-600"}>
                              {formatPriceSimple(product.price, (!product.original_price && product.original_price !== 0) && product.price === 0)}
                            </span>
                            {product.original_price && product.original_price > product.price && (
                              <div className="text-xs text-gray-500 line-through">
                                {product.original_price} ₪
                              </div>
                            )}
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

                        {/* File Type */}
                        <div className="col-span-1 text-center">
                          {product.product_type === 'file' && product.file_type ? (
                            <Badge variant="outline" className="font-medium uppercase bg-purple-50 text-purple-700 border-purple-200">
                              {product.file_type}
                            </Badge>
                          ) : product.product_type !== 'file' ? (
                            <Badge className={getProductTypeBadgeColor(product.product_type) + " font-medium"}>
                              {getProductTypeLabel(product.product_type)}
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
                            <h3 className="font-bold text-slate-900 text-base leading-tight mb-1">
                              {product.title}
                            </h3>
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
        </Tabs>
      </div>
    </div>
  );
}