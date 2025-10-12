import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { File, Category, User, Settings } from "@/services/entities";
import { getProductTypeName, formatGradeRange } from "@/config/productTypes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ProductModal from '@/components/modals/ProductModal';
import {
  Search,
  FileText,
  Eye,
  AlertCircle,
  Users,
  Play,
  Edit,
  TrendingUp,
  GraduationCap,
  BookOpen,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import FileAccessStatus from "@/components/files/FileAccessStatus";
import PriceDisplayTag from "@/components/ui/PriceDisplayTag";
import { apiRequest } from "@/utils/api";
import { getProductImageUrl } from "@/utils/videoUtils.js";
import ProductActionBar from "@/components/ui/ProductActionBar";
import PdfViewer from "@/components/pdf/PdfViewer";
import { apiDownload } from "@/services/apiClient";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";

export default function Files() {
  const navigate = useNavigate();

  const [fileProducts, setFileProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredFileProducts, setFilteredFileProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedFileForViewer, setSelectedFileForViewer] = useState(null);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedAudience, setSelectedAudience] = useState("all");
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
  }, [fileProducts, searchTerm, selectedCategory, selectedGrade, selectedSubject, selectedAudience]);

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
        allSubjects: "כל המקצועות",
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

      // Load file products, categories, and settings - then enrich with purchase data
      const [fileProductsData, categoriesData, settingsData] = await Promise.all([
        apiRequest(`/entities/products/list?product_type=file&sort_by=${sortBy}&sort_order=${sortOrder}`),
        Category.find({}),
        Settings.find()
      ]);

      // Set global settings
      if (settingsData.length > 0) {
        setGlobalSettings(settingsData[0]);
      }

      // If user is logged in, enrich products with purchase data
      let enrichedProducts = fileProductsData;
      if (tempCurrentUser) {
        try {
          const { Purchase } = await import('@/services/entities');
          const userPurchases = await Purchase.filter({
            buyer_user_id: tempCurrentUser.id
          });

          // Attach purchase data to each product
          enrichedProducts = fileProductsData.map(product => {
            const purchase = userPurchases.find(p =>
              p.purchasable_type === 'file' && p.purchasable_id === product.entity_id
            );
            return {
              ...product,
              purchase: purchase || null
            };
          });
        } catch (error) {
          console.error('Error loading user purchases:', error);
          // Continue with products without purchase data
        }
      }

      setFileProducts(enrichedProducts);
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

    // Audience filter
    if (selectedAudience !== "all") {
      filtered = filtered.filter(product => {
        return product.target_audience === selectedAudience;
      });
    }

    // Sorting is now handled by the API, no need to sort here
    setFilteredFileProducts(filtered);
  };

  // Handle when item is added to cart - update the product state
  const handleCartUpdate = (productId, newPurchase) => {
    setFileProducts(prevProducts =>
      prevProducts.map(product =>
        product.id === productId
          ? { ...product, purchase: newPurchase }
          : product
      )
    );
  };

  // Enhanced file access logic with PDF viewer support (same as ProductDetails)
  const handleFileAccess = async (file) => {
    if (!file.id && !file.entity_id) return;

    // Check if it's a PDF file
    const isPdf = file.file_type === 'pdf' || file.file_name?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // Open PDF in viewer modal
      setSelectedFileForViewer(file);
      setPdfViewerOpen(true);
    } else {
      // For non-PDF files, use direct download
      try {
        // Use apiDownload to get blob with auth headers
        const blob = await apiDownload(`/assets/download/file/${file.entity_id || file.id}`);

        // Create blob URL and open in new tab
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');

        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } catch (error) {
        console.error('Error downloading file:', error);
      }
    }
  };

  // Handle PDF preview for users without access (same as ProductDetails)
  const handlePdfPreview = (file) => {
    setSelectedFileForViewer(file);
    setPdfViewerOpen(true);
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

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedGrade("all");
    setSelectedSubject("all");
    setSelectedAudience("all");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <LudoraLoadingSpinner
          message={`טוען ${getProductTypeName('file', 'plural')}...`}
          size="lg"
          theme="creative"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5Q0E5QjciIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        {/* Enhanced Compact Header */}
        <div className="flex items-center justify-between py-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {fileTexts.title}
            </h1>
          </div>
          <div className="text-xs text-gray-500">
            {filteredFileProducts.length} קבצים
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6 mx-4 sm:mx-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Ultra Compact Search and Filters */}
        <div className="mb-3" dir="rtl">
          <div className="flex flex-wrap items-center gap-2 p-2 bg-white/50 rounded-lg border">
            {/* Compact Search - Right side */}
            <div className="flex items-center gap-1 flex-1 min-w-48">
              <Input
                placeholder={fileTexts.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0 p-1 text-right"
                dir="rtl"
              />
              <Search className="w-4 h-4 text-gray-400" />
            </div>

            {/* Reset button first (rightmost in RTL) */}
            {(searchTerm || selectedCategory !== "all" || selectedGrade !== "all" || selectedSubject !== "all" || selectedAudience !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 px-3 text-xs text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 font-medium"
              >
                <X className="w-3 h-3 mr-1" />
                נקה
              </Button>
            )}

            {/* Compact Filters in RTL order */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort Order Toggle Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC")}
                className="h-7 px-2 text-xs border-gray-300 hover:bg-gray-50 flex items-center gap-1"
                title={`מיון ${sortOrder === "DESC" ? "יורד" : "עולה"} - לחץ להחלפה`}
              >
                {sortOrder === "DESC" ? (
                  <>
                    <span className="text-xs">יורד</span>
                    <TrendingUp className="w-3 h-3 rotate-180" />
                  </>
                ) : (
                  <>
                    <span className="text-xs">עולה</span>
                    <TrendingUp className="w-3 h-3" />
                  </>
                )}
              </Button>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-7 text-xs w-20 border-gray-300 text-right" dir="rtl">
                  <SelectValue>
                    {sortBy === "created_at" ? "חדש" :
                     sortBy === "updated_at" ? "עודכן" :
                     sortBy === "title" ? "שם" :
                     sortBy === "price" ? "מחיר" :
                     sortBy === "downloads_count" ? "הורדות" : "מיון"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">החדשים ביותר</SelectItem>
                  <SelectItem value="updated_at">עודכנו לאחרונה</SelectItem>
                  <SelectItem value="title">שם הקובץ</SelectItem>
                  <SelectItem value="price">מחיר</SelectItem>
                  <SelectItem value="downloads_count">הורדות</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="h-7 text-xs w-20 border-gray-300 text-right" dir="rtl">
                  <SelectValue>
                    {selectedGrade === "all" ? "כיתה" :
                     selectedGrade === "1" ? "א" : selectedGrade === "2" ? "ב" : selectedGrade === "3" ? "ג" :
                     selectedGrade === "4" ? "ד" : selectedGrade === "5" ? "ה" : selectedGrade === "6" ? "ו" :
                     selectedGrade === "7" ? "ז" : selectedGrade === "8" ? "ח" : selectedGrade === "9" ? "ט" :
                     selectedGrade === "10" ? "י" : selectedGrade === "11" ? "יא" : "יב"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{fileTexts.allGrades}</SelectItem>
                  {Array.from({length: 12}, (_, i) => i + 1).map((grade) => (
                    <SelectItem key={grade} value={String(grade)}>
                      כיתה {grade === 1 ? "א" : grade === 2 ? "ב" : grade === 3 ? "ג" :
                            grade === 4 ? "ד" : grade === 5 ? "ה" : grade === 6 ? "ו" :
                            grade === 7 ? "ז" : grade === 8 ? "ח" : grade === 9 ? "ט" :
                            grade === 10 ? "י" : grade === 11 ? "יא" : "יב"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-7 text-xs w-24 border-gray-300 text-right" dir="rtl">
                  <SelectValue placeholder="מקצוע">
                    {selectedSubject === "all" ? fileTexts.allSubjects : selectedSubject}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{fileTexts.allSubjects}</SelectItem>
                  {globalSettings?.study_subjects && Object.entries(globalSettings.study_subjects).map(([key, label]) => (
                    <SelectItem key={key} value={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                <SelectTrigger className="h-7 text-xs w-24 border-gray-300 text-right" dir="rtl">
                  <SelectValue placeholder="קהל יעד">
                    {selectedAudience === "all" ? "כל הקהלים" : selectedAudience}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקהלים</SelectItem>
                  {globalSettings?.audiance_targets?.file?.map((audience) => (
                    <SelectItem key={audience} value={audience}>{audience}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-7 text-xs w-24 border-gray-300 text-right" dir="rtl">
                  <SelectValue placeholder="קטגוריה">
                    {selectedCategory === "all" ? fileTexts.allCategories : selectedCategory}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{fileTexts.allCategories}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Files Grid */}
        {filteredFileProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr"
          >
            {filteredFileProducts.map((fileProduct, index) => {
              return (
                <motion.div
                  key={fileProduct.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                    ease: "easeOut"
                  }}
                  className="h-full"
                >
                  <FileCard
                    file={fileProduct}
                    onCartUpdate={handleCartUpdate}
                    onEdit={handleEdit}
                    fileTexts={fileTexts}
                    currentUser={currentUser}
                    onFileAccess={handleFileAccess}
                    onPdfPreview={handlePdfPreview}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center py-16 sm:py-24"
          >
            <div className="max-w-md mx-auto">
              <div className="relative mb-8">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-purple-600" />
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{fileTexts.noFiles}</h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">{fileTexts.noFilesDesc}</p>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="w-full sm:w-auto bg-white/80 backdrop-blur-sm hover:bg-white border-2 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-700 rounded-full px-6 py-3 font-semibold transition-all duration-300 hover:shadow-lg"
                >
                  <Search className="w-5 h-5 mr-2" />
                  נקה את כל הפילטרים
                </Button>
                <div className="text-sm text-gray-500 mt-4">
                  או נסה לחפש עם מילות מפתח אחרות
                </div>
              </div>
            </div>
          </motion.div>
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

      {/* PDF Viewer Modal (same as ProductDetails) */}
      {pdfViewerOpen && selectedFileForViewer && (
        <PdfViewer
          fileId={selectedFileForViewer.entity_id || selectedFileForViewer.id}
          fileName={selectedFileForViewer.file_name || `${selectedFileForViewer.title}.pdf`}
          hasAccess={selectedFileForViewer.purchase?.payment_status === 'completed'}
          allowPreview={selectedFileForViewer.allow_preview}
          onClose={() => {
            setPdfViewerOpen(false);
            setSelectedFileForViewer(null);
          }}
        />
      )}
    </div>
  );
}

function FileCard({ file, onCartUpdate, onEdit, fileTexts, currentUser, onFileAccess, onPdfPreview }) {
  const navigate = useNavigate();

  // Handle successful cart addition
  const handleCartSuccess = (newPurchase) => {
    if (onCartUpdate) {
      onCartUpdate(file.id, newPurchase);
    }
  };

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
      <Card className="group bg-white/95 backdrop-blur-sm hover:shadow-2xl hover:shadow-purple-500/25 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 h-full flex flex-col border-0 shadow-xl overflow-hidden rounded-3xl min-h-[380px] relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/50 before:to-transparent before:pointer-events-none">
        {/* Enhanced image section with premium overlay */}
        <div className="h-36 sm:h-40 overflow-hidden relative flex-shrink-0 bg-gradient-to-br from-slate-50 to-slate-100">
          <img
            src={(file.image_url && file.image_url !== '') ? getProductImageUrl(file) : getPlaceholderImage()}
            alt={file.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-multiply"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/20 to-transparent"></div>

          {/* Floating badges with glassmorphism */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Badge className="bg-white/20 backdrop-blur-md text-white shadow-2xl text-xs font-bold px-3 py-2 rounded-2xl border border-white/20 hover:bg-white/30 transition-all duration-300">
              {file.category}
            </Badge>
          </div>

          {/* Enhanced file type indicator */}
          <div className="absolute top-4 left-4">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-2xl text-sm font-bold px-4 py-2.5 rounded-2xl border-0 flex items-center gap-2 hover:from-emerald-600 hover:to-teal-700 transition-all duration-300">
              <span className="text-xl">{fileTypeIcons[file.file_type] || fileTypeIcons.other}</span>
              <span className="uppercase tracking-wider">{file.file_type || 'FILE'}</span>
            </div>
          </div>

          {/* Premium free indicator */}
          {file.price === 0 && (
            <div className="absolute bottom-4 left-4">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-4 py-2 rounded-2xl shadow-2xl animate-pulse">
                <span className="text-sm">🎁 חינם</span>
              </div>
            </div>
          )}

          {/* Subtle corner accent */}
          <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-purple-500/20 to-transparent"></div>
        </div>

        {/* Premium content section with optimized spacing */}
        <CardContent className="p-3 sm:p-4 flex-grow flex flex-col space-y-2 relative z-10">
          {/* Enhanced title section */}
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-[1.2] line-clamp-2 min-h-[2.5rem] hover:text-purple-700 transition-colors duration-300 cursor-pointer group-hover:text-purple-600 tracking-tight">
              {file.title}
            </h3>

            {/* Refined access status */}
            <div className="transform group-hover:scale-105 transition-transform duration-300">
              <FileAccessStatus
                file={{ ...file, id: file.entity_id }}
                userPurchases={[]}
                variant="files"
              />
            </div>
          </div>

          {/* Flexible content area that expands to fill available space */}
          <div className="flex-grow space-y-2">
            {/* Description */}
            <div>
              <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                {file.short_description ||
                 (file.description && file.description.length > 100
                   ? file.description.substring(0, 100) + "..."
                   : file.description)}
              </p>
            </div>

            {/* Enhanced metadata section with premium design */}
            <div className="space-y-2">
              {/* Primary metadata with improved styling */}
              <div className="grid grid-cols-1 gap-2 text-sm">
                {file.target_audience && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-slate-800 font-semibold truncate text-sm">{file.target_audience}</span>
                    </div>
                    {/* Enhanced subject display - under audience when both exist */}
                    {file.type_attributes && file.type_attributes.subject && (
                      <div className="flex items-center justify-center">
                        <Badge className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white font-bold px-3 py-1.5 shadow-lg rounded-xl border-0 hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm">
                          <span className="text-sm mr-1">📚</span>
                          {file.type_attributes.subject}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Enhanced subject display - standalone when no audience */}
                {!file.target_audience && file.type_attributes && file.type_attributes.subject && (
                  <div className="flex items-center justify-center">
                    <Badge className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white font-bold px-3 py-1.5 shadow-lg rounded-xl border-0 hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm">
                      <span className="text-sm mr-1">📚</span>
                      {file.type_attributes.subject}
                    </Badge>
                  </div>
                )}

                {/* Enhanced grade range display */}
                {file.type_attributes && formatGradeRange(file.type_attributes.grade_min, file.type_attributes.grade_max) && (
                  <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-100 hover:from-purple-100 hover:to-violet-100 transition-all duration-300">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-slate-800 font-semibold text-sm">
                      {formatGradeRange(file.type_attributes.grade_min, file.type_attributes.grade_max)}
                    </span>
                  </div>
                )}
              </div>

              {/* Enhanced secondary metadata */}
              <div className="flex items-center justify-between">
                {file.allow_preview && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200 hover:bg-green-100 transition-all duration-300">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Eye className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-green-700 font-semibold text-xs">תצוגה מקדימה</span>
                  </div>
                )}
                {file.marketing_video_type && file.marketing_video_id && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full border border-red-200 hover:bg-red-100 transition-all duration-300">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <Play className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-red-700 font-semibold text-xs">
                      {file.marketing_video_title && file.marketing_video_title.length > 0
                        ? file.marketing_video_title
                        : 'סרטון'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced tags display */}
            {file.tags && file.tags.length > 0 && file.tags.some(tag => tag && tag.trim()) && (
              <div className="flex flex-wrap gap-2">
                {file.tags.filter(tag => tag && tag.trim()).slice(0, 3).map((tag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 text-violet-700 hover:from-violet-100 hover:to-purple-100 hover:border-violet-300 transition-all duration-300 px-3 py-1.5 rounded-full font-medium shadow-sm hover:shadow-md"
                  >
                    {tag}
                  </Badge>
                ))}
                {file.tags.filter(tag => tag && tag.trim()).length > 3 && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-medium shadow-sm"
                  >
                    +{file.tags.filter(tag => tag && tag.trim()).length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Premium footer with optimized design */}
          <div className="pt-4 border-t border-slate-200/70 mt-auto space-y-3">
            {/* Enhanced price section */}
            <div className="flex justify-center">
              <div className="relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-3 border border-purple-100/70 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent rounded-xl"></div>
                <div className="relative">
                  <PriceDisplayTag
                    originalPrice={file.price}
                    discount={file.discount}
                    variant="gradient"
                    size="md"
                    showDiscount={true}
                  />
                </div>
              </div>
            </div>

            {/* Premium action buttons */}
            <div className="flex flex-col gap-2">
              {/* Primary action with enhanced styling */}
              <div className="transform hover:scale-[1.02] transition-transform duration-300">
                <ProductActionBar
                  product={file}
                  size="default"
                  className="w-full text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  showCartButton={true}
                  onPurchaseSuccess={handleCartSuccess}
                  onFileAccess={onFileAccess}
                  onPdfPreview={onPdfPreview}
                />
              </div>

              {/* Enhanced secondary actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDetailsClick}
                  className="flex-1 rounded-xl bg-white/70 backdrop-blur-sm hover:bg-white border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 text-sm px-3 py-2 flex items-center justify-center gap-2 font-semibold text-slate-700 hover:text-purple-700"
                  title={fileTexts.viewDetails}
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">פרטים נוספים</span>
                  <span className="sm:hidden">פרטים</span>
                </Button>

                {currentUser && currentUser.role === 'admin' && onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(file)}
                    className="rounded-xl bg-white/70 backdrop-blur-sm hover:bg-orange-50 border-orange-200 text-orange-600 hover:border-orange-300 hover:shadow-lg transition-all duration-300 px-3 py-2 font-semibold"
                    title="עריכת קובץ"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Add PDF viewer modal at the end of the Files component (same as ProductDetails)