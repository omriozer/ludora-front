import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Product, File, Category, Purchase, User, Settings } from "@/services/entities"; // Using Product entity for file products
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductModal from '@/components/modals/ProductModal';
import {
  Search,
  FileText,
  Download,
  Filter,
  Eye,
  Copyright,
  AlertCircle,
  Sparkles,
  Tag,
  ShoppingCart,
  Star,
  Users,
  Clock,
  Play,
  Edit,
  TrendingUp,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { getText } from "../components/utils/getText";
import { motion } from "framer-motion";
import GetFileButton from "@/components/files/GetFileButton";
import FileAccessStatus from "@/components/files/FileAccessStatus";
import { hasActiveAccess, getUserPurchaseForFile } from "@/components/files/fileAccessUtils";
import { formatPrice } from "@/lib/utils";
import PriceDisplayTag from "@/components/ui/PriceDisplayTag";
import { apiRequest } from "@/utils/api";
import GetAccessButton from "@/components/ui/GetAccessButton";

export default function Files() {
  const navigate = useNavigate();

  const [fileProducts, setFileProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredFileProducts, setFilteredFileProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  
  // Texts
  const [fileTexts, setFileTexts] = useState({
    title: getProductTypeName('file', 'plural'),
    subtitle: "כלים דיגיטליים, תבניות ומשאבים מוכנים להורדה שיעזרו לכם ליצור חוויות למידה מהנות",
    searchPlaceholder: `חפש ${getProductTypeName('file', 'plural')}...`,
    allCategories: "כל הקטגוריות",
    sortByNewest: "החדשים ביותר",
    sortByTitle: "לפי כותרת",
    sortByPrice: "לפי מחיר",
    noFiles: `לא נמצאו ${getProductTypeName('file', 'plural')}`,
    noFilesDesc: "נסה לשנות את הסינון או החיפוש",
    watchFile: `צפייה ב${getProductTypeName('file', 'singular')}`,
    previewFile: "תצוגה מקדימה",
    getAccess: "קבלת גישה",
    owned: "ברשותך",
    lifetimeAccess: "גישה לכל החיים",
    accessUntil: "גישה עד",
    professionalFiles: getProductTypeName('file', 'plural'),
    viewDetails: "פרטים נוספים",
    downloads: "הורדות",
    fileType: `סוג ${getProductTypeName('file', 'singular')}`
  });

  useEffect(() => {
    loadData();
  }, [sortBy, sortOrder]);

  useEffect(() => {
    filterFiles();
  }, [fileProducts, searchTerm, selectedCategory]);

  // Handle edit parameter from URL
  useEffect(() => {
    const loadEditFromUrl = async () => {
      if (fileProducts.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const editProductId = urlParams.get('edit');
        if (editProductId) {
          const productToEdit = fileProducts.find(p => p.id === editProductId);
          if (productToEdit) {
            // Load the actual File entity data
            try {
              const fileEntity = await File.findById(productToEdit.entity_id);
              const mergedProduct = {
                ...productToEdit,
                file_name: fileEntity.file_name || "",
                file_type: fileEntity.file_type || "pdf",
              };
              setEditingProduct(mergedProduct);
              setShowModal(true);
            } catch (error) {
              console.error("Error loading file data:", error);
            }
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    };

    loadEditFromUrl();
  }, [fileProducts]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load texts
      const texts = {
        title: await getText("files.title", getProductTypeName('file', 'plural')),
        subtitle: await getText("files.subtitle", "כלים דיגיטליים, תבניות ומשאבים מוכנים להורדה שיעזרו לכם ליצור חוויות למידה מהנות"),
        searchPlaceholder: await getText("files.searchPlaceholder", `חפש ${getProductTypeName('file', 'plural')}...`),
        allCategories: await getText("files.allCategories", "כל הקטגוריות"),
        sortByNewest: await getText("files.sortByNewest", "החדשים ביותר"),
        sortByTitle: await getText("files.sortByTitle", "לפי כותרת"),
        sortByPrice: await getText("files.sortByPrice", "לפי מחיר"),
        noFiles: await getText("files.noFiles", `לא נמצאו ${getProductTypeName('file', 'plural')}`),
        noFilesDesc: await getText("files.noFilesDesc", "נסה לשנות את הסינון או החיפוש"),
        downloadFile: await getText("files.downloadFile", `הורדת ${getProductTypeName('file', 'singular')}`),
        previewFile: await getText("files.previewFile", "תצוגה מקדימה"),
        getAccess: await getText("files.getAccess", "קבלת גישה"),
        owned: await getText("files.owned", "ברשותך"),
        lifetimeAccess: await getText("files.lifetimeAccess", "גישה לכל החיים"),
        accessUntil: await getText("files.accessUntil", "גישה עד"),
        professionalFiles: await getText("files.professionalFiles", getProductTypeName('file', 'plural')),
        viewDetails: await getText("files.viewDetails", "צפייה בפרטים"),
        downloads: await getText("files.downloads", "הורדות"),
        fileType: await getText("files.fileType", `סוג ${getProductTypeName('file', 'singular')}`)
      };
      setFileTexts(texts);

      // Check files visibility
      let settings = null;
      try {
        const settingsData = await Settings.find();
        if (settingsData.length > 0) {
          settings = settingsData[0];
        }
      } catch (error) {
        console.warn("Error fetching settings:", error);
      }

      const filesVisibility = settings?.nav_files_visibility || 'public';
      let tempCurrentUser = null;

      try {
        tempCurrentUser = await User.me();
        setCurrentUser(tempCurrentUser);
      } catch (error) {
        setCurrentUser(null);
      }

      // Check access permissions (backup check - primary protection is in ConditionalRoute)
      const isActualAdmin = tempCurrentUser?.role === 'admin' && !tempCurrentUser?._isImpersonated;
      const isContentCreator = tempCurrentUser && !!tempCurrentUser.content_creator_agreement_sign_date;

      let hasAccess = false;
      switch (filesVisibility) {
        case 'public':
          hasAccess = true;
          break;
        case 'logged_in_users':
          hasAccess = !!tempCurrentUser;
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
        navigate(tempCurrentUser ? "/dashboard" : "/");
        return;
      }

      // Load file products and categories using new endpoint
      // Products now include purchase data from the API
      const [fileProductsData, categoriesData] = await Promise.all([
        apiRequest(`/entities/products/list?product_type=file&is_published=true&sort_by=${sortBy}&sort_order=${sortOrder}`),
        Category.find({})
      ]);

      setFileProducts(fileProductsData);
      setCategories(categoriesData);
      
    } catch (error) {
      console.error("Error loading data:", error);
      setMessage({ type: 'error', text: `שגיאה בטעינת ${getProductTypeName('file', 'plural')}` });
    }
    setIsLoading(false);
  };

  const filterFiles = () => {
    let filtered = [...fileProducts];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Sorting is now handled by the API, no need to sort here
    setFilteredFileProducts(filtered);
  };

  const handlePurchase = (file) => {
    const url = `/purchase?type=file&id=${file.id}`;
    window.location.href = url;
  };

  const handleEdit = async (product) => {
    try {
      // Load the actual File entity data to get file_name
      const fileEntity = await File.findById(product.entity_id);

      // Merge Product and File data
      const mergedProduct = {
        ...product,
        file_name: fileEntity.file_name || "",
        file_type: fileEntity.file_type || "pdf",
      };

      setEditingProduct(mergedProduct);
      setShowModal(true);
    } catch (error) {
      console.error("Error loading file data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת פרטי הקובץ' });
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleProductSaved = () => {
    setShowModal(false);
    setEditingProduct(null);
    loadData(); // Reload data to show updated product
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">טוען {getProductTypeName('file', 'plural')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-600 text-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
            {fileTexts.professionalFiles}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
            {fileTexts.title}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            {fileTexts.subtitle}
          </p>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-8">
          <div className="flex flex-col gap-4">
            {/* Search bar - full width */}
            <div className="relative w-full">
              <Search className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <Input
                placeholder={fileTexts.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 sm:pr-12 h-10 sm:h-12 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            {/* Category filter - full width on mobile, flex on larger screens */}
            <div className="flex items-center gap-2 w-full">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-10 sm:h-12 bg-gray-50 border-gray-200 rounded-lg w-full">
                  <SelectValue placeholder={fileTexts.allCategories} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{fileTexts.allCategories}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort controls - stacked on mobile, side by side on larger screens */}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 sm:h-12 bg-gray-50 border-gray-200 rounded-lg w-full sm:flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">תאריך יצירה</SelectItem>
                  <SelectItem value="updated_at">תאריך עדכון</SelectItem>
                  <SelectItem value="title">כותרת</SelectItem>
                  <SelectItem value="price">מחיר</SelectItem>
                  <SelectItem value="downloads_count">הורדות</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="h-10 sm:h-12 bg-gray-50 border-gray-200 rounded-lg w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESC">יורד</SelectItem>
                  <SelectItem value="ASC">עולה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Files Grid */}
        {filteredFileProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredFileProducts.map((fileProduct) => {
              return (
                <FileCard
                  key={fileProduct.id}
                  file={fileProduct}
                  onPurchase={handlePurchase}
                  onEdit={handleEdit}
                  fileTexts={fileTexts}
                  currentUser={currentUser}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">{fileTexts.noFiles}</h3>
            <p className="text-gray-500">{fileTexts.noFilesDesc}</p>
          </div>
        )}
      </div>

      {/* Product Modal for editing */}
      {showModal && (
        <ProductModal
          isOpen={showModal}
          onClose={handleModalClose}
          editingProduct={editingProduct}
          onSave={handleProductSaved}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

function FileCard({ file, onPurchase, onEdit, fileTexts, currentUser }) {
  const navigate = useNavigate();

  const fileTypeIcons = {
    pdf: "📄",
    ppt: "📊", 
    docx: "📝",
    zip: "🗜️",
    other: "📎"
  };

  const handleDetailsClick = () => {
    navigate(`/product-details?type=file&id=${file.id}`);
  };

  const getPlaceholderImage = () => {
    const baseUrl = "https://images.unsplash.com/";
    switch (file.file_type) {
      case 'pdf':
        return `${baseUrl}photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop&crop=center`;
      case 'ppt':
        return `${baseUrl}photo-1551650975-87deedd944c3?w=400&h=300&fit=crop&crop=center`;
      case 'docx':
        return `${baseUrl}photo-1586281380614-e292c55b7ffe?w=400&h=300&fit=crop&crop=center`;
      default:
        return `${baseUrl}photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop&crop=center`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full"
    >
      <Card className="bg-white/80 backdrop-blur-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 h-full flex flex-col border-0 shadow-md overflow-hidden">
        {/* Fixed height image section */}
        <div className="h-40 sm:h-48 overflow-hidden relative flex-shrink-0">
          <img
            src={file.image_url || getPlaceholderImage()}
            alt={file.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
            <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg text-xs sm:text-sm">
              {file.category}
            </Badge>
          </div>
          {file.price === 0 && (
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
              <PriceDisplayTag
                originalPrice={file.price}
                discount={file.discount}
                variant="badge"
                size="sm"
                className="animate-pulse"
              />
            </div>
          )}
        </div>

        {/* Flexible content section */}
        <CardContent className="p-4 sm:p-6 flex-grow flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-700 font-medium">
              {fileTypeIcons[file.file_type] || fileTypeIcons.other} {file.file_type?.toUpperCase() || fileTexts.fileType.toUpperCase()}
            </Badge>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2 min-h-[2.5rem] sm:min-h-[3.5rem] hover:text-purple-700 transition-colors duration-200">
            {file.title}
          </h3>

          {/* Access status */}
          <FileAccessStatus
            file={{ ...file, id: file.entity_id }}
            userPurchases={[]}
            variant="files"
          />

          {/* Flexible description area */}
          <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-3 flex-grow">
            {file.short_description ||
             (file.description && file.description.length > 120
               ? file.description.substring(0, 120) + "..."
               : file.description)}
          </p>

          {/* File details - fixed height section */}
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm mb-3 sm:mb-4 min-h-[2rem]">
            {file.target_audience && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700 truncate">{file.target_audience}</span>
              </div>
            )}
            {file.difficulty_level && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">
                  {file.difficulty_level === 'beginner' && 'מתחילים'}
                  {file.difficulty_level === 'intermediate' && 'בינוני'}
                  {file.difficulty_level === 'advanced' && 'מתקדמים'}
                </span>
              </div>
            )}
            {file.youtube_video_id && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Play className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
                <span className="text-red-600 text-xs truncate">
                  {file.youtube_video_title || 'סרטון הסבר זמין'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Eye className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${file.allow_preview ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={`text-xs ${file.allow_preview ? 'text-green-700' : 'text-gray-500'}`}>
                {file.allow_preview ? 'תצוגה מקדימה זמינה' : 'אין תצוגה מקדימה'}
              </span>
            </div>
          </div>

          {/* Tags - only show if tags exist and are not empty */}
          {file.tags && file.tags.length > 0 && file.tags.some(tag => tag && tag.trim()) && (
            <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
              {file.tags.filter(tag => tag && tag.trim()).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors duration-200">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Enhanced footer section with centered price and buttons */}
          <div className="pt-3 sm:pt-4 border-t mt-auto space-y-3 sm:space-y-4">
            {/* Centered price section */}
            <div className="flex justify-center">
              <PriceDisplayTag
                originalPrice={file.price}
                discount={file.discount}
                variant="gradient"
                size="lg"
                showDiscount={true}
              />
            </div>

            {/* Centered buttons section */}
            <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDetailsClick}
                className="hover:bg-gray-50 hover:border-purple-300 transition-colors duration-200 text-xs sm:text-sm px-2 sm:px-3"
                title={fileTexts.viewDetails}
              >
                פרטים נוספים
              </Button>

              {currentUser && currentUser.role === 'admin' && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(file)}
                  className="hover:bg-orange-50 border-orange-200 text-orange-600 hover:border-orange-300 transition-colors duration-200 px-2 sm:px-3"
                  title="עריכת קובץ"
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              )}

              <GetAccessButton
                product={file}
                size="sm"
                className="text-xs sm:text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
