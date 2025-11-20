import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GamepadIcon, PlayIcon, Home, Users, Clock, AlertCircle, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import GameTypeDisplay from '@/components/game/GameTypeDisplay';
import ProductImage from '@/components/ui/ProductImage';
import logoSm from '../../assets/images/logo_sm.png';
import { useSSE } from '@/hooks/useSSE';
import { isLobbyJoinable, getLobbyStatusConfig } from '@/utils/lobbyUtils';

/**
 * Student lobby join page
 * Accessed via my.domain/lobby/{lobbyCode}
 * Validates lobby access and shows available sessions
 */
const LobbyJoin = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [lobbyData, setLobbyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [joining, setJoining] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  // Create SSE channels based on lobby data
  const sseChannels = lobbyData && lobbyData.lobby && lobbyData.game ? [
    `lobby:${lobbyData.lobby.id}`,
    `game:${lobbyData.game.id}`,
    // Subscribe to all session channels in this lobby
    ...(lobbyData.sessions || []).map(session => `session:${session.id}`)
  ] : [];

  // SSE integration for real-time updates
  const { isConnected, addEventListener, removeEventListener } = useSSE(
    sseChannels,
    {
      debugMode: true,
      autoReconnect: true
    }
  );

  useEffect(() => {
    const fetchLobbyData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/game-lobbies/join-by-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lobby_code: code,
            participant: {
              display_name: 'temp_check', // Temporary name for validation
              user_id: user?.id || null,
              guest_token: user?.id ? null : `guest_${Date.now()}`,
            }
          })
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('קוד הלובי לא נמצא או אינו תקין');
          }
          if (response.status === 403) {
            throw new Error('הלובי נסגר או לא זמין יותר');
          }
          if (response.status === 409) {
            throw new Error('הלובי מלא - נסה שוב מאוחר יותר');
          }
          throw new Error('שגיאה בטעינת נתוני הלובי');
        }

        const data = await response.json();
        setLobbyData(data);

        // Set default display name for authenticated users
        if (user?.name) {
          setDisplayName(user.name);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchLobbyData();
    }
  }, [code, user]);

  // Function to refresh lobby data (excluding the loading state changes)
  const refreshLobbyData = async () => {
    try {
      const response = await fetch('/api/game-lobbies/join-by-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lobby_code: code,
          participant: {
            display_name: 'temp_check', // Temporary name for validation
            user_id: user?.id || null,
            guest_token: user?.id ? null : `guest_${Date.now()}`,
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLobbyData(data);
        console.log('[LobbyJoin] Refreshed lobby data via SSE');
      }
    } catch (error) {
      console.error('[LobbyJoin] Error refreshing lobby data:', error);
      // Don't update error state for SSE refreshes, only log the error
    }
  };

  // SSE event handlers for real-time updates
  useEffect(() => {
    if (!lobbyData) return; // No lobby data yet, nothing to listen for

    const handleLobbyEvent = (event) => {
      console.log('[LobbyJoin] Received lobby event:', event);

      // Check if this event is for our lobby
      const lobbyId = event.data?.lobbyId || event.data?.lobby_id;
      if (lobbyId === lobbyData.lobby?.id) {
        // Refresh lobby data for lobby status changes
        refreshLobbyData();
      }
    };

    const handleSessionEvent = (event) => {
      console.log('[LobbyJoin] Received session event:', event);

      // Check if this session event is for sessions in our lobby
      const sessionId = event.data?.sessionId || event.data?.session_id;
      const sessions = lobbyData.sessions || [];
      if (sessionId && sessions.some(session => session.id === sessionId)) {
        // Refresh lobby data for participant count updates
        refreshLobbyData();
      }
    };

    // Register event handlers for lobby events
    const cleanupLobbyActivated = addEventListener('lobby:activated', handleLobbyEvent);
    const cleanupLobbyClosed = addEventListener('lobby:closed', handleLobbyEvent);
    const cleanupLobbyExpired = addEventListener('lobby:expired', handleLobbyEvent);

    // Register event handlers for session events that affect participant counts
    const cleanupSessionCreated = addEventListener('session:created', handleSessionEvent);
    const cleanupSessionParticipantJoined = addEventListener('session:participant:joined', handleSessionEvent);
    const cleanupSessionParticipantLeft = addEventListener('session:participant:left', handleSessionEvent);
    const cleanupSessionStarted = addEventListener('session:started', handleSessionEvent);
    const cleanupSessionFinished = addEventListener('session:finished', handleSessionEvent);

    // Cleanup event handlers on unmount or lobby change
    return () => {
      cleanupLobbyActivated?.();
      cleanupLobbyClosed?.();
      cleanupLobbyExpired?.();
      cleanupSessionCreated?.();
      cleanupSessionParticipantJoined?.();
      cleanupSessionParticipantLeft?.();
      cleanupSessionStarted?.();
      cleanupSessionFinished?.();
    };
  }, [lobbyData, addEventListener, removeEventListener, code, user]);

  // Show SSE connection status in console for debugging
  useEffect(() => {
    if (sseChannels.length > 0) {
      console.log(`[LobbyJoin] SSE ${isConnected ? 'connected' : 'disconnected'} for lobby ${code}`);
    }
  }, [isConnected, code, sseChannels.length]);

  const handleJoinLobby = async () => {
    if (!displayName.trim()) {
      alert('נא להזין שם תצוגה');
      return;
    }

    if (lobbyData.settings.invitation_type === 'manual_selection' && !selectedSession) {
      alert('נא לבחור חדר');
      return;
    }

    try {
      setJoining(true);

      const response = await fetch(`/api/game-lobbies/${lobbyData.lobby.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant: {
            display_name: displayName.trim(),
            user_id: user?.id || null,
            guest_token: user?.id ? null : `guest_${Date.now()}`,
          },
          session_id: selectedSession?.id || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'שגיאה בהצטרפות ללובי');
      }

      const joinResult = await response.json();

      // Redirect to play page with session info
      navigate(`/play/${joinResult.session.id}`, {
        state: {
          lobbyData: joinResult.lobby,
          sessionData: joinResult.session,
          participantId: joinResult.participant.id
        }
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleCreateSession = async () => {
    if (!displayName.trim()) {
      alert('נא להזין שם תצוגה לפני יצירת חדר');
      return;
    }

    try {
      setCreatingSession(true);

      const response = await fetch(`/api/game-lobbies/${lobbyData.lobby.id}/sessions/create-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant: {
            display_name: displayName.trim(),
            user_id: user?.id || null,
            guest_token: user?.id ? null : `guest_${Date.now()}`,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'שגיאה ביצירת חדר חדש');
      }

      const createResult = await response.json();

      // Redirect to play page with session info
      navigate(`/play/${createResult.session.id}`, {
        state: {
          lobbyData: createResult.lobby,
          sessionData: createResult.session,
          participantId: createResult.participant.id
        }
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingSession(false);
    }
  };

  // Get status configuration from lobbyUtils
  const getStatusDisplay = (lobby) => {
    const config = getLobbyStatusConfig(lobby);

    let icon;
    switch (config.icon) {
      case 'Play':
        icon = <CheckCircle className="w-5 h-5 text-green-600" />;
        break;
      case 'Clock':
        icon = <Clock className="w-5 h-5 text-yellow-600" />;
        break;
      case 'Square':
        icon = <XCircle className="w-5 h-5 text-red-600" />;
        break;
      default:
        icon = <AlertCircle className="w-5 h-5 text-gray-600" />;
    }

    return { icon, text: config.text, timeInfo: config.timeInfo };
  };

  if (loading) {
    return (
      <div className="min-h-screen student-portal-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-purple-700 font-medium">טוען נתוני לובי...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-error-page student-portal-background">
        <div className="student-error-card">
          <div className="student-icon-container-error student-bounce mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold student-text-gradient mb-4">{error}</h2>
          <div className="mb-6">
            <div className="student-loading-dots justify-center">
              <div className="dot student-sparkle"></div>
              <div className="dot student-sparkle" style={{ animationDelay: '0.1s' }}></div>
              <div className="dot student-sparkle" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
          <Button
            onClick={() => navigate(-1)}
            className="student-btn-primary student-float"
          >
            <Home className="w-5 h-5 ml-2" />
            חזרה לקטלוג המורה
          </Button>
        </div>
      </div>
    );
  }

  if (!lobbyData || !isLobbyJoinable(lobbyData.lobby)) {
    return (
      <div className="student-error-page student-portal-background">
        <div className="student-error-card">
          <div className="student-icon-container-warning student-wiggle mx-auto mb-6">
            <XCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold student-text-gradient mb-4">הלובי לא זמין</h2>
          <p className="text-gray-700 text-lg mb-2 leading-relaxed">
            הלובי הזה סגור או לא זמין כרגע
          </p>
          <p className="text-gray-500 text-base mb-8">בדקו עם המורה שלכם לקוד חדש</p>
          <div className="mb-6">
            <div className="student-loading-dots justify-center">
              <div className="dot student-pulse"></div>
              <div className="dot student-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="dot student-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
          <Link to="/">
            <Button className="student-btn-primary student-float">
              <Home className="w-5 h-5 ml-2" />
              חזרה למרכז הבית
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Handle the actual API response structure
  const lobby = lobbyData.lobby;
  const game = lobby.game;
  const sessions = lobbyData.sessions || []; // API doesn't return sessions for join-by-code
  const participantsSummary = lobbyData.participantsSummary || { total: 0 };

  const isManualSelection = lobby.settings.invitation_type === 'manual_selection';
  const availableSessions = sessions.filter(session =>
    session.status === 'open' && session.participants && session.participants.length < lobby.settings.max_players
  );

  return (
    <div className="min-h-screen student-portal-background">
      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Game Info with Lobby Code */}
        <Card className="student-card mb-6">
          <CardContent className="p-6">
            {/* Lobby Code Banner */}
            <div className="text-center mb-6 p-4 student-rainbow-border rounded-xl">
              <h1 className="text-3xl font-bold student-text-gradient mb-1 student-pulse">
                {lobby.lobby_code}
              </h1>
              <p className="text-sm text-gray-600">קוד הלובי</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-2">
                {(() => {
                  const { icon, text, timeInfo } = getStatusDisplay(lobby);
                  return (
                    <>
                      {icon}
                      <span>{text}</span>
                      {timeInfo && <span className="mr-2 text-xs">({timeInfo})</span>}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-start gap-4">
              {/* Game Image */}
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 via-blue-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <ProductImage
                  product={game}
                  className="w-full h-full object-cover rounded-lg"
                  iconClassName="w-10 h-10 text-white/80"
                  containerClassName="w-full h-full rounded-lg"
                />
              </div>

              {/* Game Details */}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {game.title || 'משחק ללא כותרת'}
                </h2>

                {game.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {game.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm">
                  {game.game_type && (
                    <GameTypeDisplay
                      gameTypeKey={game.game_type}
                      variant="badge"
                      size="small"
                      showEditButton={false}
                      className="!text-xs"
                    />
                  )}

                  <div className="flex items-center gap-1 text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{participantsSummary.total}/{lobby.settings.max_players} שחקנים</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Join Form */}
        <Card className="student-card mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">הצטרפות למשחק</h3>

            {/* Display Name Input */}
            <div className="mb-4">
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                השם שלך במשחק
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="הזן את השם שלך..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength="30"
              />
            </div>

            {/* Session Selection (Manual Only) */}
            {isManualSelection && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  בחר חדר או צור חדר חדש
                </label>

                {/* Create New Session Button */}
                <div className="mb-3">
                  <Button
                    onClick={handleCreateSession}
                    disabled={creatingSession || !displayName.trim()}
                    className="w-full sm:w-auto student-btn-primary"
                    variant="outline"
                  >
                    {creatingSession ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin ml-2" />
                        יוצר חדר חדש...
                      </div>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 ml-2" />
                        צור חדר חדש והצטרף אליו
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    יצירת חדר חדש תצטרף אליו אוטומטית
                  </p>
                </div>

                {/* Existing Sessions */}
                {availableSessions.length > 0 && (
                  <>
                    <div className="text-sm text-gray-600 mb-2">או הצטרף לחדר קיים:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableSessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className={`p-3 border rounded-lg text-right transition-all ${
                            selectedSession?.id === session.id
                              ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                              : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">
                                חדר {session.session_number}
                              </div>
                              <div className="text-sm text-gray-500">
                                {(session.participants?.length || 0)}/{lobby.settings.max_players} שחקנים
                              </div>
                            </div>
                            <Users className="w-5 h-5 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {availableSessions.length === 0 && (
                  <div className="text-sm text-gray-500 mt-2">
                    אין חדרים פעילים כרגע. צור חדר חדש כדי להתחיל!
                  </div>
                )}
              </div>
            )}

            {/* Invitation Type Info */}
            {!isManualSelection && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-700">
                  {lobby.settings.invitation_type === 'order' &&
                    'תוזמן לחדר הראשון הזמין'
                  }
                </div>
              </div>
            )}

            {/* Join Button */}
            <Button
              onClick={handleJoinLobby}
              disabled={joining || !displayName.trim() || (isManualSelection && !selectedSession)}
              className="w-full student-btn-primary py-3"
            >
              {joining ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  מצטרף...
                </div>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5 ml-2" />
                  הצטרף למשחק
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Active Sessions Display - Only show if sessions exist */}
        {sessions.length > 0 && (
          <Card className="student-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">חדרי משחק פעילים</h3>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-800">
                          חדר {session.session_number || session.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(session.participants?.length || 0)}/{lobby.settings.max_players} שחקנים
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          // Create a session-like lobby object for status display
                          const sessionAsLobby = { status: session.status };
                          const { icon, text, timeInfo } = getStatusDisplay(sessionAsLobby);
                          return (
                            <>
                              {icon}
                              <span className="text-sm text-gray-600">{text}</span>
                              {timeInfo && <span className="mr-2 text-xs">({timeInfo})</span>}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default LobbyJoin;