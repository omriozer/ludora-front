import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GamepadIcon, UserIcon, Home, Crown, PlayIcon, Clock, Users } from 'lucide-react';
import GameTypeDisplay from '@/components/game/GameTypeDisplay';
import logoSm from '../../assets/images/logo_sm.png';
import { useSSE } from '@/hooks/useSSE';
import { apiRequest } from '@/services/apiClient';
import { filterActiveLobbies, findBestActiveLobby, isLobbyActive } from '@/utils/lobbyUtils';

/**
 * Teacher catalog page for students to view games shared by their teacher
 * Accessed via my.domain/portal/{invitationCode}
 */
const TeacherCatalog = () => {
  const { userCode } = useParams();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gamesWithLobbies, setGamesWithLobbies] = useState([]);

  // Create channels for SSE based on available games
  const gameChannels = gamesWithLobbies.length > 0
    ? gamesWithLobbies.map(game => `game:${game.entity_id}`)
    : [];

  // SSE integration for real-time lobby updates
  const { isConnected, addEventListener, removeEventListener } = useSSE(
    gameChannels,
    {
      debugMode: true,
      autoReconnect: true
    }
  );

  useEffect(() => {
    const fetchTeacherCatalog = async () => {
      try {
        setLoading(true);
        const data = await apiRequest(`/entities/teacher-catalog/${userCode}`);
        setCatalog(data);

        // Fetch lobby information for each game
        if (data && data.games && data.games.all) {
          const gamesWithLobbyInfo = await Promise.all(
            data.games.all.map(async (game) => {
              try {
                const lobbyResponse = await apiRequest(`/public/games/${game.entity_id}/lobbies?expired=false`);
                const lobbies = lobbyResponse.data || lobbyResponse; // Handle both formats
                const activeLobbies = filterActiveLobbies(lobbies);
                const hasActiveLobby = activeLobbies.length > 0;
                const activeLobbiesCount = activeLobbies.length;

                return {
                  ...game,
                  lobbyInfo: {
                    hasActiveLobby,
                    activeLobbiesCount,
                    totalLobbies: lobbies.length,
                    lobbies: lobbies
                  }
                };
              } catch (error) {
                // If lobby fetch fails, treat as no active lobbies
                return {
                  ...game,
                  lobbyInfo: {
                    hasActiveLobby: false,
                    activeLobbiesCount: 0,
                    totalLobbies: 0,
                    lobbies: []
                  }
                };
              }
            })
          );

          // Sort games: active lobbies first, then inactive
          const sortedGames = gamesWithLobbyInfo.sort((a, b) => {
            // First, sort by lobby activity (active first)
            if (a.lobbyInfo.hasActiveLobby && !b.lobbyInfo.hasActiveLobby) return -1;
            if (!a.lobbyInfo.hasActiveLobby && b.lobbyInfo.hasActiveLobby) return 1;

            // If both have same activity status, sort by active lobby count (more active lobbies first)
            if (a.lobbyInfo.hasActiveLobby && b.lobbyInfo.hasActiveLobby) {
              return b.lobbyInfo.activeLobbiesCount - a.lobbyInfo.activeLobbiesCount;
            }

            // For games without active lobbies, sort by creation date (newest first)
            return new Date(b.created_at) - new Date(a.created_at);
          });

          setGamesWithLobbies(sortedGames);
        }
      } catch (err) {
        if (err.status === 404) {
          setError('קוד המורה לא נמצא או אינו תקין');
        } else {
          setError('שגיאה בטעינת הקטלוג');
        }
      } finally {
        setLoading(false);
      }
    };

    if (userCode) {
      fetchTeacherCatalog();
    }
  }, [userCode]);

  // Function to refresh lobby info for a specific game
  const refreshGameLobbyInfo = async (gameId) => {
    try {
      const lobbyResponse = await apiRequest(`/public/games/${gameId}/lobbies?expired=false`);
      const lobbies = lobbyResponse.data || lobbyResponse; // Handle both formats
      const activeLobbies = filterActiveLobbies(lobbies);
      const hasActiveLobby = activeLobbies.length > 0;
      const activeLobbiesCount = activeLobbies.length;

      // Update the specific game in the gamesWithLobbies state
      setGamesWithLobbies(prevGames => {
        const updatedGames = prevGames.map(game => {
          if (game.entity_id === gameId) {
            return {
              ...game,
              lobbyInfo: {
                hasActiveLobby,
                activeLobbiesCount,
                totalLobbies: lobbies.length,
                lobbies: lobbies
              }
            };
          }
          return game;
        });

        // Re-sort games after lobby info update
        return updatedGames.sort((a, b) => {
          // First, sort by lobby activity (active first)
          if (a.lobbyInfo.hasActiveLobby && !b.lobbyInfo.hasActiveLobby) return -1;
          if (!a.lobbyInfo.hasActiveLobby && b.lobbyInfo.hasActiveLobby) return 1;

          // If both have same activity status, sort by active lobby count (more active lobbies first)
          if (a.lobbyInfo.hasActiveLobby && b.lobbyInfo.hasActiveLobby) {
            return b.lobbyInfo.activeLobbiesCount - a.lobbyInfo.activeLobbiesCount;
          }

          // For games without active lobbies, sort by creation date (newest first)
          return new Date(b.created_at) - new Date(a.created_at);
        });
      });

      console.log(`[TeacherCatalog] Updated lobby info for game ${gameId}`);
    } catch (error) {
      console.error(`[TeacherCatalog] Error refreshing lobby info for game ${gameId}:`, error);
    }
  };

  // SSE event handlers for real-time lobby updates
  useEffect(() => {
    if (gamesWithLobbies.length === 0) return; // No games to listen for yet

    const handleLobbyEvent = (event) => {
      console.log('[TeacherCatalog] Received lobby event:', event);

      // Extract game ID from the event data
      const gameId = event.data?.gameId || event.data?.game_id;
      if (gameId) {
        // Find if this game is in our catalog
        const gameInCatalog = gamesWithLobbies.find(game => game.entity_id === gameId);
        if (gameInCatalog) {
          // Refresh lobby info for this specific game
          refreshGameLobbyInfo(gameId);
        }
      }
    };

    const handleSessionEvent = (event) => {
      console.log('[TeacherCatalog] Received session event:', event);

      // For session events, also refresh lobby info as participant counts may have changed
      const gameId = event.data?.gameId || event.data?.game_id;
      if (gameId) {
        const gameInCatalog = gamesWithLobbies.find(game => game.entity_id === gameId);
        if (gameInCatalog) {
          refreshGameLobbyInfo(gameId);
        }
      }
    };

    // Register event handlers
    const cleanupLobbyCreated = addEventListener('lobby:created', handleLobbyEvent);
    const cleanupLobbyActivated = addEventListener('lobby:activated', handleLobbyEvent);
    const cleanupLobbyClosed = addEventListener('lobby:closed', handleLobbyEvent);
    const cleanupLobbyExpired = addEventListener('lobby:expired', handleLobbyEvent);

    // Register handlers for session events (affect participant counts)
    const cleanupSessionParticipantJoined = addEventListener('session:participant:joined', handleSessionEvent);
    const cleanupSessionParticipantLeft = addEventListener('session:participant:left', handleSessionEvent);

    // Cleanup on unmount or games change
    return () => {
      cleanupLobbyCreated?.();
      cleanupLobbyActivated?.();
      cleanupLobbyClosed?.();
      cleanupLobbyExpired?.();
      cleanupSessionParticipantJoined?.();
      cleanupSessionParticipantLeft?.();
    };
  }, [gamesWithLobbies, addEventListener, removeEventListener]);

  // Show SSE connection status in console for debugging
  useEffect(() => {
    if (gameChannels.length > 0) {
      console.log(`[TeacherCatalog] SSE ${isConnected ? 'connected' : 'disconnected'} for ${gameChannels.length} games`);
    }
  }, [isConnected, gameChannels.length]);

  const handlePlayGame = async (game) => {
    // Use already fetched lobby info if available
    if (game.lobbyInfo && game.lobbyInfo.hasActiveLobby) {
      const bestLobby = findBestActiveLobby(game.lobbyInfo.lobbies);

      if (bestLobby) {
        // Redirect to the best available lobby
        window.location.href = `/lobby/${bestLobby.lobby_code}`;
        return;
      }
    }

    // Fallback: re-fetch lobby info if not available or no active lobbies
    try {
      const lobbyResponse = await apiRequest(`/public/games/${game.entity_id}/lobbies?expired=false`);
      const lobbies = lobbyResponse.data || lobbyResponse; // Handle both formats
      const bestLobby = findBestActiveLobby(lobbies);

      if (bestLobby) {
        window.location.href = `/lobby/${bestLobby.lobby_code}`;
      } else {
        alert('אין כרגע לובי פעיל למשחק הזה. בדקו עם המורה שלכם או נסו שוב מאוחר יותר.');
      }
    } catch (error) {
      console.error('Error finding active lobby:', error);
      alert('שגיאה בחיפוש לובי פעיל. נסו שוב מאוחר יותר.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-200/40 via-blue-200/30 to-pink-200/40 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-purple-700 font-medium">טוען את משחקי המורה...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-200/40 via-blue-200/30 to-pink-200/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">שגיאה</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/">
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-2xl">
              <Home className="w-4 h-4 ml-2" />
              חזרה לעמוד הבית
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!catalog || !gamesWithLobbies.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-200/40 via-blue-200/30 to-pink-200/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GamepadIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">אין משחקים זמינים</h2>
          <p className="text-gray-600 mb-2">
            {catalog?.teacher?.name ? `המורה ${catalog.teacher.name}` : 'המורה'} עדיין לא הוסיף משחקים לקטלוג
          </p>
          <p className="text-sm text-gray-500 mb-6">חזרו מאוחר יותר לבדוק אם נוספו משחקים חדשים</p>
          <Link to="/">
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-2xl">
              <Home className="w-4 h-4 ml-2" />
              חזרה לעמוד הבית
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen student-portal-background">
      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <GamepadIcon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-800">{catalog.totals.all}</div>
              <div className="text-sm text-gray-600">סה&quot;כ משחקים</div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-800">{catalog.totals.teacher_created}</div>
              <div className="text-sm text-gray-600">משחקים של המורה</div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-800">{catalog.totals.ludora_games}</div>
              <div className="text-sm text-gray-600">משחקי לודורה</div>
            </CardContent>
          </Card>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gamesWithLobbies.map((game) => {
            const hasActiveLobby = game.lobbyInfo?.hasActiveLobby || false;
            const activeLobbiesCount = game.lobbyInfo?.activeLobbiesCount || 0;
            const isClickable = hasActiveLobby;

            return (
            <Card key={game.id} className={`backdrop-blur-sm shadow-lg transition-all overflow-hidden ${
              isClickable
                ? "bg-white/90 hover:shadow-xl hover:-translate-y-1"
                : "bg-gray-100/70 opacity-75"
            }`}>
              <CardContent className="p-0">
                {/* Game Image/Icon */}
                <div className="h-48 bg-gradient-to-br from-purple-400 via-blue-400 to-indigo-500 flex items-center justify-center relative">
                  {game.image_url || game.thumbnail_url ? (
                    <img
                      src={game.image_url || game.thumbnail_url}
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <GamepadIcon className="w-16 h-16 text-white/80" />
                  )}

                  {/* Creator badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm">
                    {game.creator_user_id === catalog.teacher.id ? (
                      <span className="text-green-700 flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {catalog.teacher.name}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <img
                          src={logoSm}
                          alt="לודורה"
                          className="w-4 h-4 object-contain"
                        />
                      </span>
                    )}
                  </div>

                  {/* Lobby status indicator - only show for active games */}
                  {hasActiveLobby && (
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm shadow-lg">
                      <span className="bg-green-500 text-white flex items-center gap-1">
                        <PlayIcon className="w-3 h-3" />
                        {activeLobbiesCount} פעיל{activeLobbiesCount > 1 ? 'ים' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Game Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                    {game.title || 'משחק ללא כותרת'}
                  </h3>

                  {game.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {game.description}
                    </p>
                  )}

                  {/* Game Details */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-gray-500">
                      {game.game_type && (
                        <GameTypeDisplay
                          gameTypeKey={game.game_type}
                          variant="badge"
                          size="small"
                          showEditButton={false}
                          className="!text-xs"
                        />
                      )}
                    </div>

                    {game.game_details && (
                      <div className="text-xs text-gray-500">
                        {game.game_details.total_content_pairs > 0 && (
                          <span>{game.game_details.total_content_pairs} זוגות</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Play Button */}
                  {isClickable ? (
                    <Button
                      onClick={() => handlePlayGame(game)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <PlayIcon className="w-5 h-5 ml-2" />
                      שחקו עכשיו
                    </Button>
                  ) : (
                    <div className="w-full">
                      <Button
                        disabled
                        className="w-full bg-gray-300 text-gray-500 font-bold py-3 rounded-2xl cursor-not-allowed"
                      >
                        <Clock className="w-5 h-5 ml-2" />
                        אין לובי פעיל
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        המורה יפתח לובי בקרוב
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default TeacherCatalog;