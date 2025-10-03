import React from "react";
import { useNavigate } from "react-router-dom";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import { getProductImageUrl } from "@/utils/videoUtils.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Play,
  Download,
  Eye,
  Clock,
  Users,
  Star,
  BookOpen,
  CheckCircle,
  Youtube
} from "lucide-react";
import { formatPriceSimple } from "@/lib/utils";

export default function ProductCard({ 
  product, 
  userPurchase, 
  onAccess, 
  onPurchase, 
  texts,
  showYouTubeIndicator = false 
}) {
  const navigate = useNavigate();
  const hasAccess = userPurchase && userPurchase.access_until && new Date(userPurchase.access_until) > new Date();
  

  const categoryColors = {
    workshop: "bg-blue-100 text-blue-800",
    course: "bg-purple-100 text-purple-800",
    tool: "bg-green-100 text-green-800"
  };

  const handleDetailsClick = () => {
    navigate(`/product-details?product=${product.id}`);
  };

  const getAccessButtonText = () => {
    if (!hasAccess) return texts.buyNow || "רכישה";
    
    switch (product.product_type) {
      case 'course':
        return userPurchase?.first_accessed ? (texts.continueCourse || `המשך ${getProductTypeName('course', 'singular')}`) : (texts.startCourse || `התחל ${getProductTypeName('course', 'singular')}`);
      case 'tool':
        return texts.download || "הורדה";
      case 'workshop':
        return texts.watchRecording || "צפה בהקלטה";
      default:
        return texts.access || "גישה";
    }
  };

  const getAccessButtonIcon = () => {
    if (!hasAccess) return <ShoppingCart className="w-4 h-4 ml-2" />;
    
    switch (product.product_type) {
      case 'course':
        return <Play className="w-4 h-4 ml-2" />;
      case 'tool':
        return <Download className="w-4 h-4 ml-2" />;
      case 'workshop':
        return <Play className="w-4 h-4 ml-2" />;
      default:
        return <Eye className="w-4 h-4 ml-2" />;
    }
  };

  return (
    <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Image with YouTube indicator */}
      {(product.image_url && product.image_url !== '') && (
        <div className="h-48 overflow-hidden relative">
          <img
            src={getProductImageUrl(product)}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          {showYouTubeIndicator && product.marketing_video_type && product.marketing_video_id && (
            <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
              <Youtube className="w-3 h-3" />
              <span className="text-xs">סרטון</span>
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge className={`${categoryColors[product.product_type] || "bg-gray-100 text-gray-800"} border-none`}>
            {product.category}
          </Badge>
        </div>

        <CardTitle className="text-lg leading-tight">{product.title}</CardTitle>
        
        {hasAccess && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {texts.owned || "ברשותך"}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-gray-600 text-sm line-clamp-3">{product.description}</p>

        {/* Product specific info */}
        <div className="space-y-2 text-sm">
          {product.product_type === 'course' && (
            <>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{product.course?.course_modules?.length || product.course_modules?.length || 0} מודולים</span>
              </div>
              {(product.course?.total_duration_minutes || product.total_duration_minutes) && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{product.course?.total_duration_minutes || product.total_duration_minutes} דקות</span>
                </div>
              )}
            </>
          )}

          {product.product_type === 'file' && (
            <div className="flex items-center gap-2 text-gray-500">
              <Download className="w-4 h-4" />
              <span>{product.file?.downloads_count || product.downloads_count || 0} הורדות</span>
            </div>
          )}
          
          {product.target_audience && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{product.target_audience}</span>
            </div>
          )}

          {product.difficulty_level && (
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">
                {product.difficulty_level === 'beginner' && 'מתחילים'}
                {product.difficulty_level === 'intermediate' && 'בינוני'}
                {product.difficulty_level === 'advanced' && 'מתקדמים'}
              </span>
            </div>
          )}

          {product.marketing_video_type && product.marketing_video_id && (
            <div className="flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-500" />
              <span className="text-red-600 text-sm">
                {product.marketing_video_title || 'סרטון הסבר'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xl font-bold text-blue-600">
            {formatPriceSimple(product.price, (!product.original_price && product.original_price !== 0) && product.price === 0)}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDetailsClick}
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            <Button 
              onClick={hasAccess ? onAccess : onPurchase}
              className={hasAccess ? 
                "bg-green-600 hover:bg-green-700" : 
                "bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              }
              size="sm"
            >
              {getAccessButtonIcon()}
              {getAccessButtonText()}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}