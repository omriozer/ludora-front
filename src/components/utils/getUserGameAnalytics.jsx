
import { GameSession } from "@/services/entities";

/**
 * Generic function to get user game session analytics
 * @param {Object} options - Configuration options
 * @param {string} options.userId - User ID (required)
 * @param {Object} options.dateRange - Date range filter {start: Date, end: Date}
 * @param {string} options.gameType - Filter by specific game type
 * @param {string} options.gameId - Filter by specific game ID
 * @param {boolean} options.countOnly - Return only counts instead of full data
 * @param {number} options.limit - Limit number of results
 * @param {string} options.sortBy - Sort field (default: '-session_start_time')
 * @returns {Object} Analytics data with various counts and optional session details
 */
export const getUserGameAnalytics = async (options = {}) => {
  const {
    userId,
    dateRange,
    gameType,
    gameId,
    countOnly = false,
    limit = 1000,
    sortBy = '-session_start_time'
  } = options;

  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    // Build filter object - NO duration filtering anymore
    const filter = { 
      user_id: userId
    };

    // Add date range filter if provided
    if (dateRange?.start || dateRange?.end) {
      filter.session_start_time = {};
      if (dateRange.start) {
        filter.session_start_time._gte = dateRange.start.toISOString();
      }
      if (dateRange.end) {
        filter.session_start_time._lt = dateRange.end.toISOString();
      }
    }

    // Add game type filter if provided
    if (gameType) {
      filter.game_type = gameType;
    }

    // Add game ID filter if provided
    if (gameId) {
      filter.game_id = gameId;
    }

    console.log('🔍 getUserGameAnalytics - Filter:', filter);

    // Fetch sessions from database
    const sessions = await GameSession.filter(filter, sortBy, limit);
    
    console.log('🔍 getUserGameAnalytics - Found sessions:', sessions.length);
    if (sessions.length > 0) {
      console.log('🔍 Sample session:', sessions[0]);
      console.log('🔍 All session dates:', sessions.map(s => ({ 
        id: s.id, 
        date: s.session_start_time,
        game_id: s.game_id 
      })));
    }

    // Process the data
    const uniqueGameIds = new Set(sessions.map(s => s.game_id));
    const uniqueGameTypes = new Set(sessions.map(s => s.game_type));

    console.log('🔍 Unique game IDs:', Array.from(uniqueGameIds));
    console.log('🔍 Unique game types:', Array.from(uniqueGameTypes));

    const analytics = {
      totalSessions: sessions.length,
      uniqueGames: uniqueGameIds.size,
      uniqueGameTypes: uniqueGameTypes.size,
      completedSessions: sessions.filter(s => s.completed).length,
      totalPlayTimeSeconds: sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
      averageSessionDuration: sessions.length > 0 ? 
        Math.round(sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length) : 0,
      totalScore: sessions.reduce((sum, s) => sum + (s.score || 0), 0),
      averageScore: sessions.length > 0 ? 
        Math.round(sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length) : 0,
      lastPlayedAt: sessions.length > 0 ? sessions[0].session_start_time : null,
      gameBreakdown: []
    };

    // Create breakdown by games
    const gameMap = new Map();
    sessions.forEach(session => {
      const gameId = session.game_id;
      if (!gameMap.has(gameId)) {
        gameMap.set(gameId, {
          gameId,
          gameType: session.game_type,
          sessionCount: 0,
          totalDuration: 0,
          totalScore: 0,
          completedCount: 0,
          bestScore: 0,
          lastPlayed: session.session_start_time
        });
      }
      
      const gameData = gameMap.get(gameId);
      gameData.sessionCount++;
      gameData.totalDuration += (session.duration_seconds || 0);
      gameData.totalScore += (session.score || 0);
      if (session.completed) gameData.completedCount++;
      if ((session.score || 0) > gameData.bestScore) gameData.bestScore = session.score || 0;
      
      // Update last played if this session is more recent
      if (new Date(session.session_start_time) > new Date(gameData.lastPlayed)) {
        gameData.lastPlayed = session.session_start_time;
      }
    });

    analytics.gameBreakdown = Array.from(gameMap.values()).sort((a, b) => 
      new Date(b.lastPlayed) - new Date(a.lastPlayed)
    );

    console.log('🔍 Final analytics:', analytics);

    // If countOnly is true, return minimal data for performance
    if (countOnly) {
      return {
        totalSessions: analytics.totalSessions,
        uniqueGames: analytics.uniqueGames,
        uniqueGameTypes: analytics.uniqueGameTypes,
        completedSessions: analytics.completedSessions,
        totalPlayTimeSeconds: analytics.totalPlayTimeSeconds,
        lastPlayedAt: analytics.lastPlayedAt
      };
    }

    // Return full analytics with session details if requested
    return {
      ...analytics,
      sessions: sessions // Include raw session data for detailed analysis
    };

  } catch (error) {
    console.error('Error fetching user game analytics:', error);
    return {
      totalSessions: 0,
      uniqueGames: 0,
      uniqueGameTypes: 0,
      completedSessions: 0,
      totalPlayTimeSeconds: 0,
      averageSessionDuration: 0,
      totalScore: 0,
      averageScore: 0,
      lastPlayedAt: null,
      gameBreakdown: [],
      sessions: [],
      error: error.message
    };
  }
};

/**
 * Get user's current month gaming statistics (last 31 days)
 * @param {string} userId - User ID
 * @returns {Object} Current month analytics
 */
export const getCurrentMonthAnalytics = async (userId) => {
  const now = new Date();
  
  // Create date exactly 31 days ago from now
  const thirtyOneDaysAgo = new Date();
  thirtyOneDaysAgo.setDate(now.getDate() - 31);
  
  console.log('🔍 getCurrentMonthAnalytics - Date range (last 31 days):', {
    userId,
    now: now.toISOString(),
    thirtyOneDaysAgo: thirtyOneDaysAgo.toISOString(),
    daysDiff: Math.ceil((now - thirtyOneDaysAgo) / (1000 * 60 * 60 * 24))
  });

  const result = await getUserGameAnalytics({
    userId,
    dateRange: { start: thirtyOneDaysAgo, end: now },
    countOnly: true
  });

  console.log('🔍 getCurrentMonthAnalytics - Result:', result);
  
  return result;
};

/**
 * Get user's all-time gaming statistics (counts only for performance)
 * @param {string} userId - User ID
 * @returns {Object} All-time analytics (counts only)
 */
export const getAllTimeAnalytics = async (userId) => {
  console.log('🔍 getAllTimeAnalytics - User ID:', userId);
  
  return await getUserGameAnalytics({
    userId,
    countOnly: true,
    limit: 10000 // Higher limit for all-time stats
  });
};
