import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Users } from 'lucide-react';
import { getProductTypeName } from '@/config/productTypes';

/**
 * Catalog Header Component
 * Displays title, subtitle, analytics (for games), and product count
 */
export default function CatalogHeader({
  config,
  typeConfig,
  currentUser,
  userAnalytics,
  productCount,
  totalCount
}) {
  const navigate = useNavigate();
  // Helper function to safely parse colors
  const parseGradient = (colorString) => {
    if (!colorString) return 'linear-gradient(to right, #3B82F6, #2563EB)';

    try {
      const parts = colorString.split(' ');
      if (parts.length >= 3) {
        const fromColor = parts[0].replace('from-', '');
        const toColor = parts[2].replace('to-', '');
        const colorMap = {
          'blue-500': '#3B82F6', 'blue-600': '#2563EB',
          'green-500': '#10B981', 'green-600': '#059669',
          'purple-500': '#8B5CF6', 'purple-600': '#7C3AED',
          'pink-500': '#EC4899', 'red-600': '#DC2626'
        };
        const from = colorMap[fromColor] || '#3B82F6';
        const to = colorMap[toColor] || '#2563EB';
        return `linear-gradient(to right, ${from}, ${to})`;
      }
    } catch (error) {
      console.warn('Error parsing gradient:', colorString);
    }
    return 'linear-gradient(to right, #3B82F6, #2563EB)';
  };
  return (
    <div className="mb-12">
      {/* Title Row with Game Lobbies Button */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Classroom Management Button - Only for educational activities catalog */}
        {typeConfig.key === 'game' && currentUser && (
          <div className="absolute left-0">
            <Button
              onClick={() => navigate('/game-lobbies')}
              className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 px-6 py-2.5"
              size="default"
            >
              <span className="flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                <span className="text-sm">נהל קבוצות תלמידים</span>
              </span>
            </Button>
          </div>
        )}

        {/* Title - Center */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
          {config.title}
        </h1>
      </div>

      {/* Subtitle */}
      <div className="text-center">
        <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
          {config.subtitle}
        </p>
      </div>

      {/* Analytics Section (Games only) */}
      {config.showAnalytics && currentUser && userAnalytics && (
        <div className="text-center mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 max-w-md mx-auto">
            <h4 className="text-sm font-semibold text-center mb-3 text-blue-700">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              הסטטיסטיקות שלי
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-2 px-2 text-gray-600"></th>
                  <th className="text-center py-2 px-2 text-gray-600">סה״כ</th>
                  <th className="text-center py-2 px-2 text-gray-600">חודש</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-right py-1 px-2 font-medium text-gray-800">
                    {getProductTypeName(typeConfig.key, 'plural')}
                  </td>
                  <td className="text-center py-1 px-2 font-bold text-blue-600">
                    {userAnalytics.allTime?.uniqueGames || 0}
                  </td>
                  <td className="text-center py-1 px-2 font-bold text-purple-600">
                    {userAnalytics.currentMonth?.uniqueGames || 0}
                  </td>
                </tr>
                <tr>
                  <td className="text-right py-1 px-2 font-medium text-gray-800">סשנים</td>
                  <td className="text-center py-1 px-2 font-bold text-blue-600">
                    {userAnalytics.allTime?.totalSessions || 0}
                  </td>
                  <td className="text-center py-1 px-2 font-bold text-purple-600">
                    {userAnalytics.currentMonth?.totalSessions || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Count */}
      <div className="text-center">
        <Badge className="bg-white/80 text-gray-700 px-4 py-2 text-base font-semibold shadow-md">
          {productCount} {productCount === totalCount ? '' : `מתוך ${totalCount}`} {getProductTypeName(typeConfig.key, 'plural')}
        </Badge>
      </div>
    </div>
  );
}