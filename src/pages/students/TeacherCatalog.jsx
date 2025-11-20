import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GamepadIcon, UserIcon, Home, Crown, PlayIcon, Clock, Users } from 'lucide-react';
import GameTypeDisplay from '@/components/game/GameTypeDisplay';
import logoSm from '../../assets/images/logo_sm.png';
import { useSSE } from '@/hooks/useSSE';
import { apiRequestAnonymous } from '@/services/apiClient';
import { filterActiveLobbies, isLobbyActive, computeLobbyStatus, getLobbyClosureTimeText } from '@/utils/lobbyUtils';
import { Badge } from '@/components/ui/badge';

/**
 * Teacher catalog page for students to view games shared by their teacher
 * Accessed via my.domain/portal/{invitationCode}
 */
const TeacherCatalog = () => {
  const { userCode } = useParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gamesWithLobbies, setGamesWithLobbies] = useState([]);

  // SSE disabled for student portal to avoid auth errors
  // Students don't need real-time updates and SSE requires authentication

  useEffect(() => {
    const fetchTeacherCatalog = async () => {
      try {
        setLoading(true);

        // Use public teacher endpoint with code parameter (anonymous request)
        const response = await apiRequestAnonymous(`/games/teacher/${userCode}`);
        const { teacher, games } = response;

        // Create catalog structure for UI
        setCatalog({
          teacher: {
            name: teacher?.name || "המורה",
            id: userCode
          },
          totals: {
            all: games.length,
            teacher_created: games.filter(game => game.creator_user_id === userCode).length,
            ludora_games: games.filter(game => !game.creator_user_id || game.creator_user_id !== userCode).length
          }
        });

        // Process lobby information that comes with each game (expect only one lobby per game)
        if (games && games.length > 0) {
          const gamesWithLobbyInfo = games.map((game) => {
            const lobbies = game.lobbies || [];

            // Each game should have only one lobby - use the first/only lobby
            const lobby = lobbies.length > 0 ? lobbies[0] : null;

            if (lobbies.length > 1) {
              console.warn(`🚨 [WARNING] Game ${game.title} (${game.id}) has ${lobbies.length} lobbies but should only have one!`);
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
              console.log(`🔍 [DEBUG] Student Portal - Game ${game.title} (${game.id}):`, {
                gameTitle: game.title,
                gameData: { id: game.id, title: game.title, description: game.description },
                hasLobby: true,
                lobbyCode: lobbyCode,
                status: computedStatus,
                isActive: hasActiveLobby,
                expiresAt: lobby.expires_at,
                closedAt: lobby.closed_at,
                closureTimeText: getLobbyClosureTimeText(lobby)
              });
            } else {
              console.log(`🔍 [DEBUG] Student Portal - Game ${game.title} (${game.id}): No lobby`);
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
  }, [userCode]);


  // SSE disabled for student portal - no real-time updates needed
  // Students can refresh the page if they need updated lobby information

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
      {/* Header */}
      <header className="student-card-colorful mx-4 mt-4 mb-6 shadow-2xl">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold student-text-gradient mb-2">
              קטלוג המשחקים של {catalog.teacher.name}
            </h1>
            <p className="text-lg text-gray-600 font-medium">קוד מורה: {catalog.teacher.id}</p>
          </div>
        </div>
      </header>

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

                  {/* Lobby status indicator and code - only show if lobby exists */}
                  {lobbyCode && (
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      {/* Lobby Code Badge */}
                      <Badge className="bg-blue-500/90 text-white border-0 font-mono text-xs px-3 py-1 backdrop-blur-sm shadow-lg">
                        {lobbyCode}
                      </Badge>

                      {/* Active Status Badge - only show if active */}
                      {hasActiveLobby && (
                        <Badge className="bg-green-500/90 text-white border-0 text-xs px-3 py-1 backdrop-blur-sm shadow-lg">
                          <PlayIcon className="w-3 h-3 mr-1" />
                          פעיל
                        </Badge>
                      )}

                      {/* Closure Time Badge - show for active lobbies with expiration */}
                      {hasActiveLobby && game.lobbyInfo?.lobby && (() => {
                        const closureTimeText = getLobbyClosureTimeText(game.lobbyInfo.lobby);
                        return closureTimeText ? (
                          <Badge className="bg-orange-500/90 text-white border-0 text-xs px-3 py-1 backdrop-blur-sm shadow-lg">
                            <Clock className="w-3 h-3 mr-1" />
                            {closureTimeText}
                          </Badge>
                        ) : null;
                      })()}
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