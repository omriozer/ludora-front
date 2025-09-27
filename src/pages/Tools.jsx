import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tool, Category, Purchase, User, Settings } from "@/services/entities"; // Using Tool entity instead of Product
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  Star,
  Eye,
  ShoppingCart,
  Edit
} from "lucide-react";
import { getText } from "../components/utils/getText";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function Tools() {
  const navigate = useNavigate();

  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredTools, setFilteredTools] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userPurchases, setUserPurchases] = useState([]);
  const [toolsTexts, setToolsTexts] = useState({
    title: getProductTypeName('tool', 'plural'),
    subtitle: "תבניות, מצגות וחומרי עזר מוכנים להורדה",
    search: `חפש ${getProductTypeName('tool', 'singular')}...`,
    allCategories: "כל הקטגוריות",
    allDifficulties: "כל הרמות",
    beginner: "מתחיל",
    intermediate: "בינוני",
    advanced: "מתקדם",
    noTools: `אין ${getProductTypeName('tool', 'plural')} זמינים`,
    noToolsSubtitle: `${getProductTypeName('tool', 'plural')} חדשים יועלו בקרוב`,
    loading: `טוען ${getProductTypeName('tool', 'plural')}...`,
    owned: "ברשותך",
    targetAudience: "קהל יעד",
    viewDetails: "פרטים נוספים",
    downloadTool: `הורדת ${getProductTypeName('tool', 'singular')}`,
    getAccess: "קבלת גישה",
    lifetimeAccess: "גישה לכל החיים",
    accessUntil: "גישה עד",
    downloadsCount: "הורדות",
    previewAvailable: "תצוגה מקדימה זמינה",
    downloadPreview: "הורד תצוגה מקדימה",
    digitalTools: getProductTypeName('tool', 'plural')
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTools();
  }, [tools, searchTerm, selectedCategory, selectedDifficulty]);

  const loadData = async () => {
    try {
      const texts = {
        title: await getText("tools.title", getProductTypeName('tool', 'plural')),
        subtitle: await getText("tools.subtitle", "תבניות, מצגות וחומרי עזר מוכנים להורדה"),
        search: await getText("tools.search", `חפש ${getProductTypeName('tool', 'singular')}...`),
        allCategories: await getText("tools.allCategories", "כל הקטגוריות"),
        allDifficulties: await getText("tools.allDifficulties", "כל הרמות"),
        beginner: await getText("tools.beginner", "מתחיל"),
        intermediate: await getText("tools.intermediate", "בינוני"),
        advanced: await getText("tools.advanced", "מתקדם"),
        noTools: await getText("tools.noTools", `אין ${getProductTypeName('tool', 'plural')} זמינים`),
        noToolsSubtitle: await getText("tools.noToolsSubtitle", `${getProductTypeName('tool', 'plural')} חדשים יועלו בקרוב`),
        loading: await getText("tools.loading", `טוען ${getProductTypeName('tool', 'plural')}...`),
        owned: await getText("tools.owned", "ברשותך"),
        targetAudience: await getText("tools.targetAudience", "קהל יעד"),
        viewDetails: await getText("tools.viewDetails", "פרטים נוספים"),
        downloadTool: await getText("tools.downloadTool", `הורדת ${getProductTypeName('tool', 'singular')}`),
        getAccess: await getText("tools.getAccess", "קבלת גישה"),
        lifetimeAccess: await getText("tools.lifetimeAccess", "גישה לכל החיים"),
        accessUntil: await getText("tools.accessUntil", "גישה עד"),
        downloadsCount: await getText("tools.downloadsCount", "הורדות"),
        previewAvailable: await getText("tools.previewAvailable", "תצוגה מקדימה זמינה"),
        downloadPreview: await getText("tools.downloadPreview", "הורד תצוגה מקדימה"),
        digitalTools: await getText("tools.digitalTools", getProductTypeName('tool', 'plural'))
      };
      setToolsTexts(texts);

      // Check if tools are accessible to current user
      let settings = null;
      try {
        const settingsData = await Settings.find();
        if (settingsData.length > 0) {
          settings = settingsData[0];
        }
      } catch (error) {
        // Settings not found, proceed normally
        console.warn("Settings not found, proceeding with default visibility for tools.", error);
      }
      const toolsVisibility = settings?.nav_tools_visibility || 'public';

      let user = null;
      let purchases = [];
      try {
        user = await User.me();
        setCurrentUser(user); // Set component state for current user
      } catch (error) {
        // User not logged in, `user` remains null
        console.log("User not logged in.");
      }

      // If tools are admin only or hidden, check access and redirect
      if (toolsVisibility === 'admin_only' && (!user || user.role !== 'admin')) {
        navigate("/");
        return; // Stop further execution
      }

      if (toolsVisibility === 'hidden') {
        navigate("/");
        return; // Stop further execution
      }

      // If access is granted, proceed to load purchases and products
      if (user) {
        purchases = await Purchase.filter({ buyer_user_id: user.id, payment_status: 'paid' });
        setUserPurchases(purchases);
      }

      const [productsData, categoriesData] = await Promise.all([
        Tool.filter({ is_published: true }),
        Category.find({}, "name")
      ]);
      
      setTools(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const filterTools = () => {
    let filtered = tools;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.tags && product.tags.some(tag => tag && tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(product => product.difficulty_level === selectedDifficulty);
    }

    setFilteredTools(filtered);
  };

  const getUserPurchaseForProduct = (toolId) => {
    return userPurchases.find(purchase => 
      ((purchase.purchasable_type === 'tool' && purchase.purchasable_id === toolId) ||
       (purchase.product_id === toolId)) && // Backwards compatibility
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
    // This case covers older purchases that might not have access_until explicitly set but implied lifetime
    if (!purchase.access_until && !purchase.purchased_lifetime_access) {
      return true; // Assume lifetime for backwards compatibility
    }
    
    return false;
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'ppt':
        return <FileImage className="w-5 h-5 text-orange-500" />;
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'zip':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleDownload = async (tool) => {
    if (!tool.tool_url && !tool.file_url) {
      console.error("No tool URL or file URL found for tool:", tool);
      return;
    }

    const downloadUrl = tool.tool_url || tool.file_url;

    try {
      // Track download first
      const purchase = getUserPurchaseForProduct(tool.id);
      if (purchase) {
        await Purchase.update(purchase.id, {
          download_count: (purchase.download_count || 0) + 1,
          last_accessed: new Date().toISOString()
        });
      }
      
      // Update tool download count
      await Tool.update(tool.id, {
        downloads_count: (tool.downloads_count || 0) + 1
      });

      // Force download using fetch and blob
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tool.title}.${tool.file_type || 'pdf'}`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error downloading file:", error);
      // Fallback to simple window.open
      window.open(downloadUrl, '_blank');
    }
  };

  const handlePurchase = (tool) => {
    const url = `/purchase?type=tool&id=${tool.id}`;
    window.location.href = url;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{toolsTexts.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{toolsTexts.title}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {toolsTexts.subtitle}
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder={toolsTexts.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-12"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="flex items-center gap-2 min-w-48">
              <Filter className="w-5 h-5 text-gray-500" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={toolsTexts.allCategories} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{toolsTexts.allCategories}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
          </div>
        </div>

        {/* Tools Grid */}
        {filteredTools.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => (
              <ToolCard 
                key={tool.id} 
                tool={tool} 
                userPurchase={getUserPurchaseForProduct(tool.id)}
                onDownload={handleDownload}
                onPurchase={handlePurchase}
                toolsTexts={toolsTexts}
                getFileIcon={getFileIcon}
                hasActiveAccess={hasActiveAccess}
                currentUser={currentUser}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">{toolsTexts.noTools}</h3>
            <p className="text-gray-500">{toolsTexts.noToolsSubtitle}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCard({ tool, userPurchase, onDownload, onPurchase, toolsTexts, getFileIcon, hasActiveAccess, currentUser }) {
  const navigate = useNavigate();
  const hasAccess = hasActiveAccess(userPurchase);

  const difficultyColors = {
    beginner: "bg-green-100 text-green-800",
    intermediate: "bg-yellow-100 text-yellow-800",
    advanced: "bg-red-100 text-red-800"
  };

  const difficultyLabels = {
    beginner: toolsTexts.beginner,
    intermediate: toolsTexts.intermediate,
    advanced: toolsTexts.advanced
  };

  const handleDetailsClick = () => {
    navigate(`/tool-details?type=tool&id=${tool.id}`);
  };

  const handlePreviewDownload = () => {
    if (tool.preview_file_url) {
      window.open(tool.preview_file_url, '_blank');
    }
  };

  const getPlaceholderImage = () => {
    const baseUrl = "https://images.unsplash.com/";
    switch (tool.file_type) {
      case 'pdf':
        return `${baseUrl}photo-1544716278-ca5e3f4abd8c?w=400&h=200&fit=crop&crop=center`;
      case 'ppt':
        return `${baseUrl}photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop&crop=center`;
      case 'docx':
        return `${baseUrl}photo-1586953208448-b95a79798f07?w=400&h=200&fit=crop&crop=center`;
      case 'zip':
        return `${baseUrl}photo-1518709268805-4e9042af2176?w=400&h=200&fit=crop&crop=center`;
      default:
        return `${baseUrl}photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&crop=center`;
    }
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group h-full flex flex-col">
      {/* Fixed height image section */}
      <div className="h-48 overflow-hidden relative flex-shrink-0">
        <img
          src={tool.image_url || getPlaceholderImage()}
          alt={tool.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="absolute top-3 right-3">
          <Badge className="bg-purple-600 text-white">
            {tool.category}
          </Badge>
        </div>
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {getFileIcon(tool.file_type)}
          <span className="text-xs text-white font-medium bg-black/50 px-2 py-1 rounded">
            {tool.file_type?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Flexible content section */}
      <CardContent className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 min-h-[3.5rem]">
          {tool.title}
        </h3>
        
        {hasAccess && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded-lg mb-3">
            <div className="font-medium">{toolsTexts.owned}</div>
            {userPurchase?.purchased_lifetime_access ? (
              <div className="text-xs">{toolsTexts.lifetimeAccess}</div>
            ) : userPurchase?.access_until ? (
              <div className="text-xs">
                {toolsTexts.accessUntil} {format(new Date(userPurchase.access_until), 'dd/MM/yyyy', { locale: he })}
              </div>
            ) : (
              <div className="text-xs">{toolsTexts.lifetimeAccess}</div>
            )}
          </div>
        )}

        {/* Flexible description area */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
          {tool.short_description || 
           (tool.description && tool.description.length > 120 
             ? tool.description.substring(0, 120) + "..." 
             : tool.description)}
        </p>

        {/* Tool details - fixed height section */}
        <div className="space-y-2 text-sm mb-4 min-h-[4rem]">
          
          {tool.target_audience && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{toolsTexts.targetAudience}:</span>
              <span className="text-gray-700">{tool.target_audience}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-gray-500">
            <Download className="w-4 h-4" />
            <span>{tool.downloads_count || 0} {toolsTexts.downloadsCount}</span>
          </div>
        </div>

        {/* Tags section */}
        {tool.tags && tool.tags.length > 0 && tool.tags.some(tag => tag && tag.trim()) && (
          <div className="flex flex-wrap gap-1 mb-4">
            {tool.tags.filter(tag => tag && tag.trim()).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Fixed footer section */}
        <div className="flex items-center justify-between pt-4 border-t mt-auto">
          <div className="text-2xl font-bold text-purple-600">
            ₪{tool.price}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDetailsClick}
              title={toolsTexts.viewDetails}
            >
              <Eye className="w-4 h-4" />
            </Button>

            {currentUser && currentUser.role === 'admin' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/tools?edit=${tool.id}`)}
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
                title={`עריכת ${getProductTypeName('tool', 'singular')}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            
            {!hasAccess && tool.preview_file_url && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePreviewDownload}
                title={toolsTexts.downloadPreview}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <FileText className="w-4 h-4" />
              </Button>
            )}
            
            {hasAccess ? (
              <Button 
                onClick={() => onDownload(tool)}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Download className="w-4 h-4 ml-2" />
                {toolsTexts.downloadTool}
              </Button>
            ) : (
              <Button 
                onClick={() => onPurchase(tool)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 ml-2" />
                {toolsTexts.getAccess}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
