import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, CheckCircle, Crown, Star } from "lucide-react";

export default function ProductPricing({
  price,
  originalPrice,
  discountPercent,
  hasAccess,
  userPurchase,
  onPurchase,
  onAccess,
  accessButtonText,
  accessButtonIcon,
  purchaseButtonText = "רכישה"
}) {
  const formatPrice = (price) => {
    return price === 0 ? "חינם" : `₪${price}`;
  };

  const isOnSale = originalPrice && originalPrice > price;

  return (
    <Card className="border-none shadow-2xl sticky top-6 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 backdrop-blur-xl">
      <CardContent className="p-6">
        {/* Enhanced Access Status */}
        {hasAccess && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white text-center shadow-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold">ברשותך!</span>
            </div>
            {userPurchase?.access_until && (
              <div className="text-sm text-green-100">
                גישה עד: {new Date(userPurchase.access_until).toLocaleDateString('he-IL')}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Pricing Section */}
        <div className="text-center mb-6">
          <div className="mb-3">
            {price === 0 ? (
              <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                חינם!
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ₪{price}
                </div>
                {isOnSale && (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xl text-gray-500 line-through">
                      ₪{originalPrice}
                    </span>
                    <Badge className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1 shadow-md">
                      חסכון {discountPercent || Math.round(((originalPrice - price) / originalPrice) * 100)}%
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced one-time purchase note */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-yellow-50 rounded-xl p-3 border border-yellow-100">
            <Crown className="w-4 h-4 text-yellow-600" />
            <span className="font-medium">רכישה חד פעמית - שלך לתמיד</span>
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="space-y-4">
          {hasAccess ? (
            <Button
              onClick={onAccess}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 text-lg font-bold rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300"
              size="lg"
            >
              {accessButtonIcon}
              {accessButtonText}
            </Button>
          ) : (
            <Button
              onClick={onPurchase}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 text-lg font-bold rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 animate-pulse"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5 ml-2" />
              {purchaseButtonText}
            </Button>
          )}

          {/* Enhanced Trust indicators */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-100">
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                </div>
                <span className="font-medium">תשלום מאובטח</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="w-3 h-3 text-yellow-600" />
                </div>
                <span className="font-medium">איכות מובטחת</span>
              </div>
              <div className="flex items-center gap-2 col-span-2 justify-center pt-2 border-t border-gray-200">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <Crown className="w-3 h-3 text-blue-600" />
                </div>
                <span className="font-medium">גישה מיידית לאחר רכישה</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}