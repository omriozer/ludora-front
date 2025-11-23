import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GamepadIcon, UserIcon, Home, Crown, PlayIcon, Clock, Users, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import GameTypeDisplay from '@/components/game/GameTypeDisplay';
import ProductImage from '@/components/ui/ProductImage';
import LogoDisplay from '@/components/ui/LogoDisplay';
import { useSocket } from '@/services/socketClient';
import socketClient from '@/services/socketClient';
import { apiRequestAnonymous, Player } from '@/services/apiClient';
import { filterActiveLobbies, isLobbyActive, computeLobbyStatus, getLobbyClosureTimeText } from '@/utils/lobbyUtils';
import { Badge } from '@/components/ui/badge';
import ProtectedStudentRoute from '@/components/auth/ProtectedStudentRoute';
import { useUser } from '@/contexts/UserContext';
import TeacherAssignmentConfirmation from '@/components/dialogs/TeacherAssignmentConfirmation';

/**
 * Teacher catalog page for students to view games shared by their teacher
 * Accessed via my.domain/portal/{invitationCode}
 * Protected by student authentication based on students_access settings
 */
const TeacherCatalogContent = () => {
  const { userCode } = useParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gamesWithLobbies, setGamesWithLobbies] = useState([]);

  // Teacher assignment state
  const [showTeacherAssignment, setShowTeacherAssignment] = useState(false);
  const [teacherAssignmentData, setTeacherAssignmentData] = useState(null);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);

  // Socket.IO integration for real-time lobby updates
  const { connected: isSocketConnected, onLobbyUpdate } = useSocket();

  // Get current player information
  const { currentPlayer, isPlayerAuthenticated, refreshUser } = useUser();

  useEffect(() => {
    const fetchTeacherCatalog = async () => {
      try {
        setLoading(true);

        // Use public teacher endpoint with code parameter (anonymous request)
        const response = await apiRequestAnonymous(`/games/teacher/${userCode}`);
        const { teacher, games } = response;

        // Create catalog structure for UI
        const catalogData = {
          teacher: {
            name: teacher?.name || teacher?.full_name || "המורה",
            full_name: teacher?.full_name || teacher?.name || "המורה",
            id: userCode
          },
          totals: {
            all: games.length,
            teacher_created: games.filter(game => game.creator_user_id === userCode).length,
            ludora_games: games.filter(game => !game.creator_user_id || game.creator_user_id !== userCode).length
          }
        };

        setCatalog(catalogData);

        // Check for teacher assignment (anonymous players only)
        if (isPlayerAuthenticated && currentPlayer && !currentPlayer.teacher_id) {
          // This is an anonymous player without a teacher - show assignment dialog
          setTeacherAssignmentData({
            teacher: catalogData.teacher,
            teacher_id: userCode
          });
          setShowTeacherAssignment(true);
        }

        // Process lobby information that comes with each game (expect only one lobby per game)
        if (games && games.length > 0) {
          const gamesWithLobbyInfo = games.map((game) => {
            const lobbies = game.lobbies || [];

            // Each game should have only one lobby - use the first/only lobby
            const lobby = lobbies.length > 0 ? lobbies[0] : null;

            if (lobbies.length > 1) {
              console.warn(`🚨 [WARNING] Game ${game.product?.title || game.id} (${game.id}) has ${lobbies.length} lobbies but should only have one!`);
            }

            let hasActiveLobby = false;
            let lobbyCode = null;
            let lobbyStatus = 'no_lobby';

            if (lobby) {
              const computedStatus = lobby.status || lobby.computed_status || computeLobbyStatus(lobby);
              lobbyStatus = computedStatus;
              hasActiveLobby = isLobbyActive(lobby);
              lobbyCode = lobby.lobby_code;

              // DEBUG: Log lobby and game data
              console.log(`🔍 [DEBUG] Student Portal - Game ${game.product?.title || game.id} (${game.id}):`, {
                gameTitle: game.product?.title || game.product?.name,
                gameData: { id: game.id, title: game.product?.title || game.product?.name, description: game.description },
                hasLobby: true,
                lobbyCode: lobbyCode,
                status: computedStatus,
                isActive: hasActiveLobby,
                expiresAt: lobby.expires_at,
                closedAt: lobby.closed_at,
                closureTimeText: getLobbyClosureTimeText(lobby)
              });
            } else {
              console.log(`🔍 [DEBUG] Student Portal - Game ${game.product?.title || game.id} (${game.id}): No lobby`);
            }

            return {
              ...game,
              lobbyInfo: {
                hasActiveLobby,
                lobbyCode,
                lobbyStatus,
                lobby: lobby
              }
            };
          });

          // Sort games: active lobbies first, then inactive
          const sortedGames = gamesWithLobbyInfo.sort((a, b) => {
            // First, sort by lobby activity (active first)
            if (a.lobbyInfo.hasActiveLobby && !b.lobbyInfo.hasActiveLobby) return -1;
            if (!a.lobbyInfo.hasActiveLobby && b.lobbyInfo.hasActiveLobby) return 1;

            // For games with same activity status, sort by creation date (newest first)
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
  }, [userCode, isPlayerAuthenticated, currentPlayer]);

  // Initialize Socket.IO connection for real-time updates
  useEffect(() => {
    console.log('🔌 [TeacherCatalog] Initializing Socket.IO connection');

    // Connect to Socket.IO if not already connected
    if (!isSocketConnected) {
      socketClient.connect().then(() => {
        console.log('✅ [TeacherCatalog] Socket.IO connected successfully');
      }).catch((error) => {
        console.error('❌ [TeacherCatalog] Socket.IO connection failed:', error);
      });
    }

    // Cleanup on unmount
    return () => {
      console.log('🔌 [TeacherCatalog] Component unmounting');
      // Note: Don't disconnect here as other components might be using the connection
    };
  }, []); // Run once on mount

  // Teacher assignment handlers
  const handleTeacherAssignmentConfirm = async () => {
    if (!teacherAssignmentData) return;

    try {
      setIsAssigningTeacher(true);

      // Call the teacher assignment API
      await Player.assignTeacher({
        teacher_id: teacherAssignmentData.teacher_id
      });

      // Refresh user data to get updated player info
      await refreshUser();

      // Close the dialog
      setShowTeacherAssignment(false);
      setTeacherAssignmentData(null);

    } catch (error) {
      console.error('Teacher assignment error:', error);
      // Error handling is done in the confirmation dialog component
    } finally {
      setIsAssigningTeacher(false);
    }
  };

  const handleTeacherAssignmentCancel = () => {
    setShowTeacherAssignment(false);
    setTeacherAssignmentData(null);
  };

  // Socket.IO real-time updates for lobby status changes
  useEffect(() => {
    if (!isSocketConnected || !gamesWithLobbies.length) return;

    const handleLobbyUpdate = (eventType, eventData) => {
      console.log('[TeacherCatalog] Received lobby update:', eventType, eventData);

      // Find if any of our games are affected by this lobby update
      const affectedGameIds = gamesWithLobbies
        .map(game => game.id)
        .filter(gameId => {
          // Check if this lobby update affects any of our games
          return eventData?.gameId === gameId ||
                 (eventData?.lobby?.game_id === gameId) ||
                 (eventData?.game_id === gameId);
        });

      if (affectedGameIds.length > 0) {
        console.log('[TeacherCatalog] Lobby update affects our games:', affectedGameIds);

        // Refresh the affected games' lobby data
        setGamesWithLobbies(prevGames =>
          prevGames.map(game => {
            if (affectedGameIds.includes(game.id)) {
              // For now, refetch data for affected games
              // In a more sophisticated implementation, we could update specific fields
              return { ...game, needsRefresh: true };
            }
            return game;
          })
        );

        // Trigger a partial data refresh for affected games
        refreshAffectedGames(affectedGameIds);
      }
    };

    // Subscribe to all lobby updates
    const unsubscribe = onLobbyUpdate('all', handleLobbyUpdate);

    return () => {
      unsubscribe?.();
    };
  }, [isSocketConnected, gamesWithLobbies, onLobbyUpdate]);

  // Function to refresh data for specific affected games
  const refreshAffectedGames = async (affectedGameIds) => {
    try {
      // Re-fetch the full catalog to get updated lobby information
      const response = await apiRequestAnonymous(`/games/teacher/${userCode}`);
      const { games } = response;

      if (games && games.length > 0) {
        const updatedGamesWithLobbyInfo = games.map((game) => {
          const lobbies = game.lobbies || [];
          const lobby = lobbies.length > 0 ? lobbies[0] : null;

          let hasActiveLobby = false;
          let lobbyCode = null;
          let lobbyStatus = 'no_lobby';

          if (lobby) {
            const computedStatus = lobby.status || lobby.computed_status || computeLobbyStatus(lobby);
            lobbyStatus = computedStatus;
            hasActiveLobby = isLobbyActive(lobby);
            lobbyCode = lobby.lobby_code;
          }

          return {
            ...game,
            lobbyInfo: {
              hasActiveLobby,
              lobbyCode,
              lobbyStatus,
              lobby: lobby
            }
          };
        });

        // Sort games: active lobbies first, then inactive
        const sortedGames = updatedGamesWithLobbyInfo.sort((a, b) => {
          if (a.lobbyInfo.hasActiveLobby && !b.lobbyInfo.hasActiveLobby) return -1;
          if (!a.lobbyInfo.hasActiveLobby && b.lobbyInfo.hasActiveLobby) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });

        setGamesWithLobbies(sortedGames);
        console.log('[TeacherCatalog] Refreshed lobby data via Socket.IO update');
      }
    } catch (error) {
      console.error('[TeacherCatalog] Error refreshing affected games:', error);
    }
  };

  const handlePlayGame = async (game) => {
    // Use already fetched lobby info if available
    if (game.lobbyInfo && game.lobbyInfo.hasActiveLobby && game.lobbyInfo.lobbyCode) {
      // Navigate to the lobby using the lobby code
      navigate(`/lobby/${game.lobbyInfo.lobbyCode}`);
      return;
    }

    // Fallback: re-fetch lobby info if not available or no active lobby
    try {
      const lobbies = await apiRequestAnonymous(`/games/${game.id}/lobbies`);

      // Since each game should have only one lobby, take the first one
      const lobby = lobbies.length > 0 ? lobbies[0] : null;

      if (lobby && isLobbyActive(lobby)) {
        navigate(`/lobby/${lobby.lobby_code}`);
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
        {/* Page-level Connection Status */}
        <div className="mb-6 flex justify-center">
          <Badge
            variant="outline"
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
              isSocketConnected
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {isSocketConnected ? (
              <>
                <Wifi className="w-4 h-4 mr-2" />
                מחובר לעדכונים בזמן אמת
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 mr-2" />
                אין חיבור לעדכונים בזמן אמת
              </>
            )}
          </Badge>
        </div>

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
            const lobbyCode = game.lobbyInfo?.lobbyCode;
            const lobbyStatus = game.lobbyInfo?.lobbyStatus || 'no_lobby';
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
                  <ProductImage
                    product={game}
                    className="w-full h-full object-cover"
                    iconClassName="w-16 h-16 text-white/80"
                    containerClassName="w-full h-full"
                  />

                  {/* Creator badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm">
                    {game.creator_user_id === catalog.teacher.id ? (
                      <span className="text-green-700 flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {catalog.teacher.name}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <LogoDisplay size="small" className="w-4 h-4 object-contain" />
                      </span>
                    )}
                  </div>

                  {/* Lobby Code Badge - top left */}
                  {lobbyCode && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-blue-500/90 text-white border-0 font-mono text-xs px-2 py-1 backdrop-blur-sm shadow-lg">
                        {lobbyCode}
                      </Badge>
                    </div>
                  )}

                  {/* Time Left Badge - bottom left */}
                  {hasActiveLobby && game.lobbyInfo?.lobby && (() => {
                    const closureTimeText = getLobbyClosureTimeText(game.lobbyInfo.lobby);
                    return closureTimeText ? (
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-orange-500/90 text-white border-0 text-xs px-2 py-1 backdrop-blur-sm shadow-lg">
                          <Clock className="w-3 h-3 mr-1" />
                          {closureTimeText}
                        </Badge>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Game Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                    {game.product?.title || game.product?.name || 'משחק ללא כותרת'}
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

      {/* Teacher Assignment Confirmation Dialog */}
      <TeacherAssignmentConfirmation
        teacher={teacherAssignmentData?.teacher}
        isOpen={showTeacherAssignment}
        onConfirm={handleTeacherAssignmentConfirm}
        onCancel={handleTeacherAssignmentCancel}
        isLoading={isAssigningTeacher}
      />
    </div>
  );
};

// Wrap the component with protection based on students_access settings
const TeacherCatalog = () => {
  return (
    <ProtectedStudentRoute requireAuth={true}>
      <TeacherCatalogContent />
    </ProtectedStudentRoute>
  );
};

export default TeacherCatalog;