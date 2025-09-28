import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Workshop, Course, File, Tool, Category, User, Settings } from "@/services/entities";
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
  Users
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
  const [showAllContent, setShowAllContent] = useState(false);

  // Access context and permissions
  const [isContentCreatorMode, setIsContentCreatorMode] = useState(false);
  const [contentCreatorPermissions, setContentCreatorPermissions] = useState({
    workshops: true,
    courses: true,
    files: true,
    tools: true
  });
  const [selectedTab, setSelectedTab] = useState("all");

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

        // Fetch from all entity types and combine
        const [workshopsData, coursesData, filesData, toolsData, categoriesData] = await Promise.all([
          Workshop.find(productsQuery),
          Course.find(productsQuery),
          File.find(productsQuery),
          Tool.find(productsQuery),
          Category.find({}, "name")
        ]);

        // Combine all entities into a single products array with product_type field
        const allProducts = [
          ...workshopsData.map(item => ({ ...item, product_type: 'workshop' })),
          ...coursesData.map(item => ({ ...item, product_type: 'course' })),
          ...filesData.map(item => ({ ...item, product_type: 'file' })),
          ...toolsData.map(item => ({ ...item, product_type: 'tool' }))
        ];

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
    // If not in content creator mode (admin access), all product types are allowed
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
      case 'tool':
        return contentCreatorPermissions.tools;
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
      // For workshops, delete uploaded video file first if it exists
      if (product.product_type === 'workshop' && product.video_file_url) {
        try {
          await deleteFile({ file_uri: product.video_file_url });
          console.log('Video file deleted successfully:', product.video_file_url);
        } catch (fileError) {
          console.warn('Failed to delete video file:', fileError);
          // Continue with workshop deletion even if file deletion fails
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
    if (selectedTab === "all") return products;
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 sm:p-8 border border-blue-100/50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    ניהול מוצרים
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    נהל וארגן את {getProductTypeName('file', 'plural')}, {getProductTypeName('course', 'plural')} ו{getProductTypeName('workshop', 'plural')} שלך במקום אחד
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{products.filter(p => p.is_published).length} פורסמו</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>{products.filter(p => !p.is_published).length} טיוטות</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Admin Toggle */}
                {isAdmin && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
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
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
                >
                  <Plus className="w-5 h-5 ml-2" />
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 mb-8">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-transparent gap-2">
              <TabsTrigger 
                value="all" 
                className="flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-50"
              >
                <Package className="w-4 h-4" />
                <span>הכל</span>
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                  {products.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="file" 
                className="flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-50"
              >
                <FileText className="w-4 h-4" />
                <span>{getProductTypeName('file', 'plural')}</span>
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                  {products.filter(p => p.product_type === 'file').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="course" 
                className="flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-50"
              >
                <BookOpen className="w-4 h-4" />
                <span>{getProductTypeName('course', 'plural')}</span>
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                  {products.filter(p => p.product_type === 'course').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="workshop" 
                className="flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-50"
              >
                <Play className="w-4 h-4" />
                <span>{getProductTypeName('workshop', 'plural')}</span>
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                  {products.filter(p => p.product_type === 'workshop').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="tool" 
                className="flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 hover:bg-gray-50"
              >
                <Package className="w-4 h-4" />
                <span>{getProductTypeName('tool', 'plural')}</span>
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                  {products.filter(p => p.product_type === 'tool').length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={selectedTab} className="space-y-4">
            {getFilteredProducts().length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Modern Table Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 items-center text-sm font-semibold text-gray-700">
                    <div className="col-span-4 text-right">מוצר</div>
                    <div className="col-span-2 text-center">סוג</div>
                    <div className="col-span-2 text-center">קטגוריה</div>
                    {isAdmin && showAllContent && (
                      <div className="col-span-2 text-center">יוצר</div>
                    )}
                    <div className={`${isAdmin && showAllContent ? 'col-span-1' : 'col-span-2'} text-center`}>מחיר</div>
                    <div className={`${isAdmin && showAllContent ? 'col-span-1' : 'col-span-1'} text-center`}>סטטוס</div>
                    <div className="col-span-1 text-center flex items-center justify-center">פעולות</div>
                  </div>
                </div>

                {/* Modern Table Body */}
                <div className="divide-y divide-gray-100">
                  {getFilteredProducts().map((product, index) => {
                    const IconComponent = getProductTypeIcon(product.product_type);
                    return (
                      <div 
                        key={product.id} 
                        className={`grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        {/* Product Info */}
                        <div className="col-span-4 text-right">
                          <div className="flex items-center gap-4 justify-end">
                            {/* Product Image or Icon */}
                            <div className="flex-shrink-0">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.title}
                                  className="w-12 h-12 object-cover rounded-lg shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                                  <IconComponent className="w-6 h-6 text-indigo-500" />
                                </div>
                              )}
                            </div>
                            {/* Title and Description */}
                            <div className="min-w-0 flex-1 text-right">
                              <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">
                                {product.title}
                              </h3>
                              {product.short_description && (
                                <p className="text-sm text-gray-600 line-clamp-1">
                                  {product.short_description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Type */}
                        <div className="col-span-2 text-center">
                          <Badge className={getProductTypeBadgeColor(product.product_type) + " font-medium"}>
                            <IconComponent className="w-3 h-3 ml-1" />
                            {getProductTypeLabel(product.product_type)}
                          </Badge>
                        </div>

                        {/* Category */}
                        <div className="col-span-2 text-center">
                          {product.category ? (
                            <Badge variant="outline" className="font-medium">
                              {product.category}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>

                        {/* Creator (Admin only) */}
                        {isAdmin && showAllContent && (
                          <div className="col-span-2 text-center">
                            {product.creator ? (
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {product.creator.full_name || product.creator.email}
                                </div>
                                {product.creator.full_name && (
                                  <div className="text-xs text-gray-500">
                                    {product.creator.email}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">לא ידוע</span>
                            )}
                          </div>
                        )}

                        {/* Price */}
                        <div className={`${isAdmin && showAllContent ? 'col-span-1' : 'col-span-2'} text-center`}>
                          <div className="font-bold text-lg">
                            <span className={product.price > 0 ? "text-green-600" : "text-blue-600"}>
                              {formatPriceSimple(product.price, !product.original_price && product.price === 0)}
                            </span>
                          </div>
                          {/* Access info as subtitle */}
                          <div className="text-xs text-gray-500 mt-1">
                            {product.access_days === null ? 'לכל החיים' : `${product.access_days} ימים`}
                          </div>
                        </div>

                        {/* Status */}
                        <div className={`${isAdmin && showAllContent ? 'col-span-1' : 'col-span-1'} text-center`}>
                          <Badge 
                            variant={product.is_published ? "default" : "secondary"}
                            className="font-medium"
                          >
                            {product.is_published ? "פורסם" : "טיוטה"}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product)}
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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