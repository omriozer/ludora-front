import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, Calendar, Tag, Star, Eye } from "lucide-react";

export default function ProductMetadata({
  product,
  createdBy,
  viewCount,
  rating,
  showTargetAudience = true,
  showCreatedDate = true,
  showViewCount = false,
  showRating = false,
  additionalMetadata = []
}) {
  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const hasMetadata = product.target_audience || product.created_at || viewCount || rating || createdBy || additionalMetadata.length > 0;

  if (!hasMetadata) return null;

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Tag className="w-5 h-5 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">פרטים נוספים</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {/* Target Audience */}
          {showTargetAudience && product.target_audience && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">קהל יעד:</span>
              <span className="font-medium">{product.target_audience}</span>
            </div>
          )}

          {/* Created Date */}
          {showCreatedDate && product.created_at && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">נוצר:</span>
              <span className="font-medium">{formatDate(product.created_at)}</span>
            </div>
          )}

          {/* Created By */}
          {createdBy && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">נוצר על ידי:</span>
              <span className="font-medium">{createdBy}</span>
            </div>
          )}

          {/* View Count */}
          {showViewCount && viewCount && (
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">צפיות:</span>
              <span className="font-medium">{viewCount.toLocaleString()}</span>
            </div>
          )}

          {/* Rating */}
          {showRating && rating && (
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-600">דירוג:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{rating}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Additional Metadata */}
          {additionalMetadata.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {item.icon}
              <span className="text-gray-600">{item.label}:</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}