import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  FileText,
  Download,
  Clock,
  Sparkles,
  CheckCircle,
  Star,
  Crown
} from "lucide-react";

export default function FileHeroSection({
  product,
  fileType,
  fileSize,
  hasAccess,
  onAccess,
  onPurchase,
  onPreview,
  accessButtonText,
  accessButtonIcon,
  purchaseButtonText = "רכישה"
}) {
  const formatFileSize = (bytes) => {
    if (!bytes) return null;
    const sizes = ['בייט', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type) => {
    const iconMap = {
      pdf: <FileText className="w-12 h-12 text-white" />,
      doc: <FileText className="w-12 h-12 text-white" />,
      docx: <FileText className="w-12 h-12 text-white" />,
      txt: <FileText className="w-12 h-12 text-white" />,
      zip: <Download className="w-12 h-12 text-white" />,
      rar: <Download className="w-12 h-12 text-white" />,
    };
    return iconMap[type?.toLowerCase()] || <FileText className="w-12 h-12 text-white" />;
  };

  return (
    <Card className="border-none shadow-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white overflow-hidden relative">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
      <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>

      <CardContent className="p-8 relative z-10">
        <div className="grid md:grid-cols-3 gap-8 items-center">

          {/* Left: File Icon & Info */}
          <div className="text-center md:text-right">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto md:mx-0 mb-4 shadow-xl border border-white/30">
              {getFileTypeIcon(fileType)}
            </div>
            <div className="space-y-2">
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                {fileType?.toUpperCase() || "קובץ"}
              </Badge>
              {fileSize && (
                <div className="text-white/80 text-sm">
                  גודל: {formatFileSize(fileSize)}
                </div>
              )}
            </div>
          </div>

          {/* Center: Title & Description */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-yellow-300 text-sm font-medium">מוצר דיגיטלי</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              {product.title}
            </h1>

            {product.description && (
              <p className="text-white/90 text-lg leading-relaxed max-w-md mx-auto mb-6">
                {product.description}
              </p>
            )}

            {/* Price */}
            <div className="mb-6">
              {product.price === 0 ? (
                <div className="text-4xl font-bold text-yellow-300 flex items-center justify-center gap-2">
                  <Crown className="w-8 h-8" />
                  חינם!
                </div>
              ) : (
                <div className="text-4xl font-bold text-white">
                  ₪{product.price}
                </div>
              )}
            </div>

            {/* Target Audience */}
            {product.target_audience && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20">
                <div className="text-white/70 text-sm mb-1">מיועד עבור</div>
                <div className="text-white font-semibold">{product.target_audience}</div>
              </div>
            )}
          </div>

          {/* Right: Action & Status */}
          <div className="text-center">
            {hasAccess ? (
              <div className="space-y-4">
                <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-green-300 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-bold">בבעלותך!</span>
                  </div>
                  <div className="text-white/80 text-sm">גישה מלאה לקובץ</div>
                </div>

                <Button
                  onClick={onAccess}
                  className="w-full bg-white text-purple-600 hover:bg-white/90 py-4 text-lg font-bold rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300"
                  size="lg"
                >
                  {accessButtonIcon}
                  {accessButtonText}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-4">
                  <div className="text-white/70 text-sm mb-2">קבל גישה מיידית</div>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-300" />
                      <span>איכות מובטחת</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-300" />
                      <span>תשלום מאובטח</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={onPurchase}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400 py-4 text-lg font-bold rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 animate-pulse"
                  size="lg"
                >
                  <Crown className="w-5 h-5 ml-2" />
                  {purchaseButtonText}
                </Button>

                {/* Preview button if available */}
                {onPreview && fileType && ['pdf', 'txt', 'doc', 'docx'].includes(fileType.toLowerCase()) && (
                  <Button
                    onClick={onPreview}
                    variant="outline"
                    className="w-full border-2 border-white/30 text-white hover:bg-white/10 py-3 rounded-2xl mt-3"
                  >
                    <Eye className="w-5 h-5 ml-2" />
                    תצוגה מקדימה חינם
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Publication date at bottom if exists */}
        {product.created_at && (
          <div className="text-center mt-8 pt-6 border-t border-white/20">
            <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
              <Clock className="w-4 h-4" />
              <span>פורסם ב-{new Date(product.created_at).toLocaleDateString('he-IL')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}