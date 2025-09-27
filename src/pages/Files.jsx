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
import {
  Search,
  FileText,
  Download,
  Filter,
  Eye,
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

export default function Files() {
  const navigate = useNavigate();

  const [fileProducts, setFileProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredFileProducts, setFilteredFileProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userPurchases, setUserPurchases] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("created_date");
  
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
  }, []);

  useEffect(() => {
    filterFiles();
  }, [fileProducts, searchTerm, selectedCategory, sortBy]);

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

      // Check access permissions
      if (filesVisibility === 'admin_only' && (!tempCurrentUser || tempCurrentUser.role !== 'admin')) {
        navigate("/");
        return;
      }

      if (filesVisibility === 'hidden') {
        navigate("/");
        return;
      }

      let purchases = [];
      if (tempCurrentUser) {
        purchases = await Purchase.filter({ buyer_user_id: tempCurrentUser.id, payment_status: 'paid' });
        setUserPurchases(purchases);
      }

      // Load file products and categories
      const [fileProductsData, categoriesData] = await Promise.all([
        Product.filter({ product_type: 'file', is_published: true }),
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

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title, 'he');
        case "price":
          return (a.price || 0) - (b.price || 0);
        case "created_date":
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    setFilteredFileProducts(filtered);
  };

  const handlePurchase = (file) => {
    const url = `/purchase?type=file&id=${file.id}`;
    window.location.href = url;
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-600 text-white rounded-full px-4 py-2 text-sm font-medium mb-6">
            <FileText className="w-4 h-4" />
            {fileTexts.professionalFiles}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {fileTexts.title}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder={fileTexts.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-12 h-12 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2 min-w-60">
              <Filter className="w-5 h-5 text-gray-500" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12 bg-gray-50 border-gray-200 rounded-lg">
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


            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-200 rounded-lg w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date">{fileTexts.sortByNewest}</SelectItem>
                <SelectItem value="title">{fileTexts.sortByTitle}</SelectItem>
                <SelectItem value="price">{fileTexts.sortByPrice}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Files Grid */}
        {filteredFileProducts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFileProducts.map((fileProduct) => {
              return (
                <FileCard
                  key={fileProduct.id}
                  file={fileProduct}
                  userPurchases={userPurchases}
                  onPurchase={handlePurchase}
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
    </div>
  );
}

function FileCard({ file, userPurchases, onPurchase, fileTexts, currentUser }) {
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
      <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {/* Fixed height image section */}
        <div className="h-48 overflow-hidden relative flex-shrink-0">
          <img
            src={file.image_url || getPlaceholderImage()}
            alt={file.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          <div className="absolute top-3 right-3">
            <Badge className="bg-purple-600 text-white">
              {file.category}
            </Badge>
          </div>
        </div>

        {/* Flexible content section */}
        <CardContent className="p-6 flex-grow flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs">
              {fileTypeIcons[file.file_type] || fileTypeIcons.other} {file.file_type?.toUpperCase() || fileTexts.fileType.toUpperCase()}
            </Badge>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 min-h-[3.5rem]">
            {file.title}
          </h3>

          {/* Access status */}
          <FileAccessStatus
            file={{ ...file, id: file.entity_id }}
            userPurchases={userPurchases}
            variant="files"
          />

          {/* Flexible description area */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
            {file.short_description || 
             (file.description && file.description.length > 120 
               ? file.description.substring(0, 120) + "..." 
               : file.description)}
          </p>

          {/* File details - fixed height section */}
          <div className="space-y-2 text-sm mb-4 min-h-[2rem]">
            {file.target_audience && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{file.target_audience}</span>
              </div>
            )}

          </div>

          {/* Tags - only show if tags exist and are not empty */}
          {file.tags && file.tags.length > 0 && file.tags.some(tag => tag && tag.trim()) && (
            <div className="flex flex-wrap gap-1 mb-4">
              {file.tags.filter(tag => tag && tag.trim()).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Fixed footer section */}
          <div className="flex items-center justify-between pt-4 border-t mt-auto">
            <div className="text-2xl font-bold text-purple-600">
              ₪{file.price}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDetailsClick}
                className="hover:bg-gray-50"
                title={fileTexts.viewDetails}
              >
                פרטים נוספים
              </Button>

              {currentUser && currentUser.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/files?edit=${file.id}`)}
                  className="hover:bg-gray-50 border-orange-200 text-orange-600"
                  title="עריכת קובץ"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}

              <GetFileButton
                file={{ ...file, id: file.entity_id }}
                userPurchases={userPurchases}
                currentUser={currentUser}
                onPurchase={onPurchase}
                variant="files"
                size="sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
