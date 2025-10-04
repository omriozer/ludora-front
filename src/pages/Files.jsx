import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Product, File, Category, Purchase, User, Settings } from "@/services/entities"; // Using Product entity for file products
import { PRODUCT_TYPES, getProductTypeName, formatGradeRange } from "@/config/productTypes";
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
  CheckCircle,
  GraduationCap,
  BookOpen
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { motion } from "framer-motion";
import GetFileButton from "@/components/files/GetFileButton";
import FileAccessStatus from "@/components/files/FileAccessStatus";
import { hasActiveAccess, getUserPurchaseForFile } from "@/components/files/fileAccessUtils";
import { formatPrice } from "@/lib/utils";
import PriceDisplayTag from "@/components/ui/PriceDisplayTag";
import { apiRequest } from "@/utils/api";
import { getProductImageUrl } from "@/utils/videoUtils.js";
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
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  
  // Texts
  const [fileTexts, setFileTexts] = useState({
    title: getProductTypeName('file', 'plural'),
    subtitle: "כלים דיגיטליים, תבניות ומשאבים מוכנים להורדה שיעזרו לכם ליצור חוויות למידה מהנות",
    searchPlaceholder: `חפש ${getProductTypeName('file', 'plural')}...`,
    allCategories: "כל הקטגוריות",
    allGrades: "כל הכיתות",
    allSubjects: "כל המקצועות",
    sortByNewest: "החדשים ביותר",
    sortByTitle: "לפי כותרת",
    sortByPrice: "לפי מחיר",
    noFiles: `לא נמצאו ${getProductTypeName('file', 'plural')}`,
    noFilesDesc: "נסה לשנות את הסינון או החיפוש",
    watchFile: `צפייה ב${getProductTypeName('file', 'singular')}`,
    previewFile: "תצוגה מקדימה",
    getAccess: "רכישה",
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
  }, [fileProducts, searchTerm, selectedCategory, selectedGrade, selectedSubject]);

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
        title: getProductTypeName('file', 'plural'),
        subtitle: "כלים דיגיטליים, תבניות ומשאבים מוכנים להורדה שיעזרו לכם ליצור חוויות למידה מהנות",
        searchPlaceholder: `חפש ${getProductTypeName('file', 'plural')}...`,
        allCategories: "כל הקטגוריות",
        allGrades: "כל הכיתות",
        sortByNewest: "החדשים ביותר",
        sortByTitle: "לפי כותרת",
        sortByPrice: "לפי מחיר",
        noFiles: `לא נמצאו ${getProductTypeName('file', 'plural')}`,
        noFilesDesc: "נסה לשנות את הסינון או החיפוש",
        downloadFile: `הורדת ${getProductTypeName('file', 'singular')}`,
        previewFile: "תצוגה מקדימה",
        getAccess: "רכישה",
        owned: "ברשותך",
        lifetimeAccess: "גישה לכל החיים",
        accessUntil: "גישה עד",
        professionalFiles: getProductTypeName('file', 'plural'),
        viewDetails: "צפייה בפרטים",
        downloads: "הורדות",
        fileType: `סוג ${getProductTypeName('file', 'singular')}`
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

    // Grade filter
    if (selectedGrade !== "all") {
      const gradeNum = parseInt(selectedGrade);
      filtered = filtered.filter(product => {
        if (!product.type_attributes) return false;
        const { grade_min, grade_max } = product.type_attributes;

        // If both grade_min and grade_max are set, check if selected grade is in range
        if (grade_min && grade_max) {
          return gradeNum >= grade_min && gradeNum <= grade_max;
        }
        // If only grade_min is set, check if selected grade is >= min
        if (grade_min && !grade_max) {
          return gradeNum >= grade_min;
        }
        // If only grade_max is set, check if selected grade is <= max
        if (!grade_min && grade_max) {
          return gradeNum <= grade_max;
        }
        // If neither is set, don't filter by grade
        return false;
      });
    }

    // Subject filter
    if (selectedSubject !== "all") {
      filtered = filtered.filter(product => {
        if (!product.type_attributes) return false;
        return product.type_attributes.subject === selectedSubject;
      });
    }

    // Sorting is now handled by the API, no need to sort here
    setFilteredFileProducts(filtered);
  };

  const handlePurchase = async (file) => {
    // Import purchase helpers
    const {
      requireAuthentication,
      getUserIdFromToken,
      findProductForEntity,
      createPendingPurchase,
      showPurchaseSuccessToast,
      showPurchaseErrorToast
    } = await import('@/utils/purchaseHelpers');

    // Check authentication
    if (!requireAuthentication(navigate, '/checkout')) {
      return;
    }

    const userId = getUserIdFromToken();
    if (!userId) {
      showPurchaseErrorToast('לא ניתן לזהות את המשתמש', 'בהוספה לעגלה');
      return;
    }

    try {
      // Find Product record for this file
      const productRecord = await findProductForEntity('file', file.id);

      if (!productRecord) {
        showPurchaseErrorToast('לא נמצא מוצר מתאים לרכישה', 'בהוספה לעגלה');
        return;
      }

      if (!productRecord.price || productRecord.price <= 0) {
        showPurchaseErrorToast('מחיר המוצר לא זמין', 'בהוספה לעגלה');
        return;
      }

      // Create pending purchase
      await createPendingPurchase({
        entityType: 'file',
        entityId: file.id,
        price: productRecord.price,
        userId,
        metadata: {
          product_title: file.title,
          source: 'Files_page'
        }
      });

      // Show success message and redirect to checkout
      showPurchaseSuccessToast(file.title, false);
      navigate('/checkout');

    } catch (error) {
      showPurchaseErrorToast(error, 'בהוספה לעגלה');
    }
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

            {/* Grade filter - full width on mobile, flex on larger screens */}
            <div className="flex items-center gap-2 w-full">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="h-10 sm:h-12 bg-gray-50 border-gray-200 rounded-lg w-full">
                  <SelectValue placeholder={fileTexts.allGrades} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{fileTexts.allGrades}</SelectItem>
                  <SelectItem value="1">כיתה א'</SelectItem>
                  <SelectItem value="2">כיתה ב'</SelectItem>
                  <SelectItem value="3">כיתה ג'</SelectItem>
                  <SelectItem value="4">כיתה ד'</SelectItem>
                  <SelectItem value="5">כיתה ה'</SelectItem>
                  <SelectItem value="6">כיתה ו'</SelectItem>
                  <SelectItem value="7">כיתה ז'</SelectItem>
                  <SelectItem value="8">כיתה ח'</SelectItem>
                  <SelectItem value="9">כיתה ט'</SelectItem>
                  <SelectItem value="10">כיתה י'</SelectItem>
                  <SelectItem value="11">כיתה יא'</SelectItem>
                  <SelectItem value="12">כיתה יב'</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject filter - full width on mobile, flex on larger screens */}
            <div className="flex items-center gap-2 w-full">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500 flex-shrink-0" />
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-10 sm:h-12 bg-gray-50 border-gray-200 rounded-lg w-full">
                  <SelectValue placeholder={fileTexts.allSubjects} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{fileTexts.allSubjects}</SelectItem>
                  {/* Get unique subjects from fileProducts */}
                  {Array.from(new Set(
                    fileProducts
                      .filter(file => file.type_attributes && file.type_attributes.subject)
                      .map(file => file.type_attributes.subject)
                  )).sort().map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
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
            src={(file.image_url && file.image_url !== '') ? getProductImageUrl(file) : getPlaceholderImage()}
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
            {file.type_attributes && formatGradeRange(file.type_attributes.grade_min, file.type_attributes.grade_max) && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" />
                <span className="text-blue-700 truncate">
                  {formatGradeRange(file.type_attributes.grade_min, file.type_attributes.grade_max)}
                </span>
              </div>
            )}
            {file.type_attributes && file.type_attributes.subject && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-500 flex-shrink-0" />
                <span className="text-cyan-700 truncate">
                  {file.type_attributes.subject}
                </span>
              </div>
            )}
            {file.marketing_video_type && file.marketing_video_id && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Play className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
                <span className="text-red-600 text-xs truncate">
                  {file.marketing_video_title || 'סרטון הסבר זמין'}
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
                className="rounded-full hover:bg-gray-50 hover:border-purple-300 transition-colors duration-200 text-xs sm:text-sm px-2 sm:px-3 border-2"
                title={fileTexts.viewDetails}
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                פרטים נוספים
              </Button>

              {currentUser && currentUser.role === 'admin' && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(file)}
                  className="rounded-full hover:bg-orange-50 border-orange-200 text-orange-600 hover:border-orange-300 transition-colors duration-200 px-2 sm:px-3 border-2"
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
