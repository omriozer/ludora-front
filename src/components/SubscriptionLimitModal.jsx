import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Users,
  Play,
  BarChart3,
  AlertTriangle,
  X,
  Crown,
  ArrowLeft
} from "lucide-react";
import { getProductTypeName } from "@/config/productTypes";

export default function SubscriptionLimitModal({ 
  isOpen, 
  onClose, 
  onUpgrade,
  limitType = 'feature', // 'feature' | 'quota'
  featureName,
  currentUsage = 0,
  maxAllowed = 0,
  currentPlan,
  availableUpgrades = []
}) {
  
  const getFeatureIcon = (type) => {
    switch (type) {
      case 'classrooms': return Users;
      case 'games': return Play;
      case 'reports': return BarChart3;
      default: return Lock;
    }
  };

  const getFeatureText = (type) => {
    switch (type) {
      case 'classrooms': return 'ניהול כיתות';
      case 'games': return getProductTypeName('game', 'plural');
      case 'reports': return 'דוחות מתקדמים';
      default: return 'תכונה זו';
    }
  };

  const isQuotaExceeded = limitType === 'quota';
  const hasUpgrades = availableUpgrades.length > 0;
  const FeatureIcon = getFeatureIcon(featureName);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        {/* Header with single close button */}
        <div className="relative bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute top-4 left-4 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {isQuotaExceeded ? 'הגעת למכסה המקסימלית' : 'תכונה לא זמינה במנוי'}
            </h2>
            <p className="text-orange-100 opacity-90">
              {isQuotaExceeded ? 
                'המנוי שלך הגיע למכסת השימוש המקסימלית' :
                'תכונה זו אינה כלולה במנוי הנוכחי שלך'
              }
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Feature Status Card */}
          <Card className="border-0 bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <FeatureIcon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {getFeatureText(featureName)}
                  </h3>
                  {isQuotaExceeded ? (
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        השתמשת ב-<span className="font-semibold text-orange-600">{currentUsage}</span> מתוך <span className="font-semibold">{maxAllowed}</span> במנוי הנוכחי
                      </p>
                      <Badge className="bg-red-500 text-white">
                        <AlertTriangle className="w-3 h-3 ml-1" />
                        מכסה מוצתה
                      </Badge>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        תכונה זו אינה כלולה במנוי הנוכחי שלך
                      </p>
                      {currentPlan && (
                        <Badge variant="outline" className="bg-white">
                          מנוי נוכחי: {currentPlan.name}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center space-y-4">
            {hasUpgrades ? (
              <>
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                  <Crown className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-blue-900 mb-1">שדרג את המנוי שלך</h4>
                  <p className="text-blue-700 text-sm">
                    {isQuotaExceeded ? 
                      'העבר למנוי עם מכסה גבוהה יותר כדי להמשיך להשתמש בתכונה' :
                      'עבור למנוי שכולל תכונה זו והרבה יכולות נוספות'
                    }
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 ml-2" />
                    חזור
                  </Button>
                  <Button 
                    onClick={onUpgrade}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                  >
                    <Crown className="w-4 h-4 ml-2" />
                    שדרג מנוי
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <AlertTriangle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <h4 className="font-semibold text-gray-900 mb-1">אין אפשרות שדרוג</h4>
                  <p className="text-gray-600 text-sm">
                    אין כרגע תכניות מנוי זמינות עם יכולות גבוהות יותר. צור קשר עם התמיכה לעזרה.
                  </p>
                </div>
                
                <Button 
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 ml-2" />
                  חזור
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}