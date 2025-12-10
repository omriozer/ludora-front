import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Users, Gamepad2, Trophy, Shield, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/services/apiClient';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * PlayerDataPreview Component
 *
 * Shows preview of player data that will be preserved during migration.
 * Features:
 * - Fetches current player achievements/classrooms/sessions
 * - Visual cards showing what will be transferred
 * - Loading states during data fetch
 * - Compact mode for confirmation step
 * - "Don't worry, nothing will be lost!" messaging
 * - Kid-friendly design with icons
 */
const PlayerDataPreview = ({ player, compact = false }) => {
  const [playerData, setPlayerData] = useState({
    classrooms: [],
    sessions: [],
    achievements: [],
    isLoading: true,
    error: null
  });

  // Fetch player data on mount
  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!player?.id) {
        setPlayerData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        ludlog.ui('Fetching player data for migration preview:', { playerId: player.id });

        // Fetch player's classrooms
        const classroomsResponse = await apiRequest(`/student-portal/my-classrooms`);

        // Fetch player's game sessions (simplified - we just need count)
        const sessionsResponse = await apiRequest(`/student-portal/my-sessions`);

        // Note: Achievements might be stored differently, adjust endpoint as needed
        // For now, we'll show a placeholder based on sessions count
        const hasAchievements = sessionsResponse?.sessions?.length > 0;

        setPlayerData({
          classrooms: classroomsResponse?.memberships || [],
          sessions: sessionsResponse?.sessions || [],
          achievements: hasAchievements ? ['active_player'] : [],
          isLoading: false,
          error: null
        });

        ludlog.ui('Player data loaded for preview:', {
          classroomsCount: classroomsResponse?.memberships?.length || 0,
          sessionsCount: sessionsResponse?.sessions?.length || 0
        });

      } catch (error) {
        luderror.ui('Error fetching player data for preview:', error);

        // Don't fail migration preview on error - just show empty data
        setPlayerData({
          classrooms: [],
          sessions: [],
          achievements: [],
          isLoading: false,
          error: 'לא הצלחנו לטעון את הנתונים, אבל הם יועברו בכל מקרה'
        });
      }
    };

    fetchPlayerData();
  }, [player?.id]);

  // Loading state
  if (playerData.isLoading) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
          <span className="text-gray-600">טוען את הנתונים שלך...</span>
        </div>
      </div>
    );
  }

  // Compact mode for confirmation step
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 font-medium">כיתות:</span>
          <span className="font-bold text-purple-900">{playerData.classrooms.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 font-medium">משחקים:</span>
          <span className="font-bold text-purple-900">{playerData.sessions.length}</span>
        </div>
        {playerData.achievements.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">הישגים:</span>
            <span className="font-bold text-purple-900">נשמרו ✓</span>
          </div>
        )}
      </div>
    );
  }

  // Full preview mode
  return (
    <div className="space-y-4">
      {/* Reassurance Message */}
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-green-900 mb-1">אל תדאג!</h4>
            <p className="text-sm text-green-700">
              כל הנתונים שלך יישמרו במעבר לחשבון החדש. שום דבר לא יאבד!
            </p>
          </div>
        </div>
      </div>

      {/* Error notice (if any) */}
      {playerData.error && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-sm text-blue-800 text-center">
          {playerData.error}
        </div>
      )}

      {/* Data Preview Cards */}
      <div className="space-y-3">
        <h4 className="font-bold text-gray-900 text-center">מה שישמר:</h4>

        {/* Classrooms */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <div className="mobile-safe-flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-blue-900 mobile-safe-text">
                  {playerData.classrooms.length} כיתות
                </div>
                <div className="text-sm text-blue-700 mobile-safe-text">
                  {playerData.classrooms.length > 0
                    ? 'כל הכיתות והמורים שלך'
                    : 'עדיין לא הצטרפת לכיתות'}
                </div>
              </div>
              {playerData.classrooms.length > 0 && (
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Game Sessions */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-4">
            <div className="mobile-safe-flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-purple-900 mobile-safe-text">
                  {playerData.sessions.length} משחקים
                </div>
                <div className="text-sm text-purple-700 mobile-safe-text">
                  {playerData.sessions.length > 0
                    ? 'כל ההתקדמות במשחקים'
                    : 'עדיין לא שיחקת משחקים'}
                </div>
              </div>
              {playerData.sessions.length > 0 && (
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        {playerData.achievements.length > 0 && (
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardContent className="p-4">
              <div className="mobile-safe-flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-orange-900 mobile-safe-text">
                    הישגים
                  </div>
                  <div className="text-sm text-orange-700 mobile-safe-text">
                    כל ההישגים והנקודות שלך
                  </div>
                </div>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Message */}
      {(playerData.classrooms.length > 0 || playerData.sessions.length > 0) && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
          <p className="text-center text-sm text-purple-800">
            <strong>סה"כ:</strong> {playerData.classrooms.length} כיתות, {playerData.sessions.length} משחקים
            {playerData.achievements.length > 0 && ' והישגים'} יועברו לחשבון החדש שלך! 🎉
          </p>
        </div>
      )}

      {/* Empty state message */}
      {playerData.classrooms.length === 0 && playerData.sessions.length === 0 && (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-center">
          <div className="text-gray-600 mb-2">
            נראה שעדיין לא התחלת לשחק או להצטרף לכיתות.
          </div>
          <div className="text-sm text-gray-500">
            אבל זה בסדר! עכשיו תהיה לך חשבון מלא לכשתתחיל!
          </div>
        </div>
      )}
    </div>
  );
};

PlayerDataPreview.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.string.isRequired,
    display_name: PropTypes.string
  }).isRequired,
  compact: PropTypes.bool
};

export default PlayerDataPreview;
