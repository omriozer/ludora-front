import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Lightbulb, BookOpen, Target } from "lucide-react";

export default function FileProductDetails({ product }) {

  // Focus on supplementary content only (no duplication with hero section)

  return (
    <div className="space-y-6">
      {/* What You'll Learn / Key Points (if available) */}
      {(product.key_points || product.highlights) && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">מה תקבל</h3>
            </div>
            <div className="bg-white/70 rounded-2xl p-4 backdrop-blur-sm">
              <div className="space-y-2">
                {(product.key_points || product.highlights || []).map((point, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements or Prerequisites */}
      {product.requirements && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">דרישות קדם</h3>
            </div>
            <div className="bg-white/70 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-gray-700 leading-relaxed text-right">{product.requirements}</p>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Additional Details Section */}
      {(product.additional_info || product.tags?.length > 0) && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-gray-50 to-slate-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-slate-700 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">פרטים נוספים</h3>
            </div>

            {product.additional_info && (
              <div className="bg-white rounded-2xl p-4 mb-4">
                <p className="text-gray-700 leading-relaxed text-right">{product.additional_info}</p>
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-end">
                {product.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}