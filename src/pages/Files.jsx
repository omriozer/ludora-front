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

export default function Files() {
  const navigate = useNavigate();

  const [fileProducts, setFileProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredFileProducts, setFilteredFileProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
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

      // Load file products and categories - then enrich with purchase data
      const [fileProductsData, categoriesData] = await Promise.all([
        apiRequest(`/entities/products/list?product_type=file&is_published=true&sort_by=${sortBy}&sort_order=${sortOrder}`),
        Category.find({})
      ]);

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
            {(searchTerm || selectedCategory !== "all" || selectedGrade !== "all" || selectedSubject !== "all") && (
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
                  {Array.from(new Set(
                    fileProducts
                      .filter(file => file.type_attributes && file.type_attributes.subject)
                      .map(file => file.type_attributes.subject)
                  )).sort().map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
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

              <ProductActionBar
                product={file}
                size="sm"
                className="text-xs sm:text-sm"
                showCartButton={true}
                onPurchaseSuccess={handleCartSuccess}
                onFileAccess={onFileAccess}
                onPdfPreview={onPdfPreview}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Add PDF viewer modal at the end of the Files component (same as ProductDetails)