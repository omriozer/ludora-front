import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { apiRequestAnonymous } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GamepadIcon, Users, Home, Crown, AlertCircle, CheckCircle, XCircle, PlayIcon } from 'lucide-react';
import GameTypeDisplay from '@/components/game/GameTypeDisplay';
import LogoDisplay from '@/components/ui/LogoDisplay';

/**
 * Student game play page
 * Accessed via my.domain/play/{sessionId}
 * Handles active gameplay for a session
 */
const GamePlay = () => {
  const { code } = useParams(); // sessionId
  const location = useLocation();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(location.state?.sessionData || null);
  const [lobbyData, setLobbyData] = useState(location.state?.lobbyData || null);
  const [participantId] = useState(location.state?.participantId || null);
  const [loading, setLoading] = useState(!sessionData);
  const [error, setError] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  // Load session data if not passed from navigation
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        const data = await apiRequestAnonymous(`/game-sessions/${code}`);
        setSessionData(data.session);
        setLobbyData(data.lobby);
        setGameStarted(!!data.session.started_at);
        setGameFinished(!!data.session.finished_at);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!sessionData && code) {
      fetchSessionData();
    }
  }, [code, sessionData]);

  // Set up real-time updates
  useEffect(() => {
    const refreshSessionData = async () => {
      if (!sessionData?.id) return;

      try {
        const data = await apiRequestAnonymous(`/game-sessions/${sessionData.id}`);
        setSessionData(data.session);
        setGameStarted(!!data.session.started_at);
        setGameFinished(!!data.session.finished_at);
      } catch (err) {
        console.error('Failed to refresh session data:', err);
      }
    };

    if (sessionData && !gameFinished) {
      const interval = setInterval(refreshSessionData, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [sessionData, gameFinished]);

  const leaveSession = async () => {
    if (!participantId) {
      navigate('/');
      return;
    }

    try {
      await apiRequestAnonymous(`/game-sessions/${sessionData.id}/participants/${participantId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to leave session:', err);
    }

    navigate('/');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'active':
        return <PlayIcon className="w-4 h-4 text-blue-600" />;
      case 'finished':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const renderGameInterface = () => {
    if (!lobbyData?.game?.game_type) {
      return (
        <Card className="student-card">
          <CardContent className="p-8 text-center">
            <GamepadIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">ממתין לתחילת המשחק</h3>
            <p className="text-gray-600">המשחק יתחיל בקרוב...</p>
          </CardContent>
        </Card>
      );
    }

    // Basic game interface - can be extended for specific game types
    switch (lobbyData.game.game_type) {
      case 'memory_game':
        return renderMemoryGame();
      case 'matching_game':
        return renderMatchingGame();
      case 'quiz_game':
        return renderQuizGame();
      default:
        return renderGenericGame();
    }
  };

  const renderMemoryGame = () => {
    return (
      <Card className="student-card">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">משחק זיכרון</h3>
          <div className="text-center p-8 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
            <GamepadIcon className="w-20 h-20 text-purple-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-4">
              {gameStarted
                ? 'המשחק התחיל! מצא את הזוגות התואמים.'
                : 'ממתין לתחילת המשחק...'
              }
            </p>
            {gameStarted && (
              <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
                {/* Placeholder for memory cards */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gradient-to-br from-purple-400 to-blue-400 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                  >
                    <span className="text-white font-bold">?</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMatchingGame = () => {
    return (
      <Card className="student-card">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">משחק התאמה</h3>
          <div className="text-center p-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
            <GamepadIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-4">
              {gameStarted
                ? 'המשחק התחיל! גרור ושחרר כדי להתאים.'
                : 'ממתין לתחילת המשחק...'
              }
            </p>
            {gameStarted && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">גרור מהעמודה השמאלית לעמודה הימנית</div>
                <div className="grid grid-cols-2 gap-8 max-w-md mx-auto">
                  <div className="space-y-2">
                    {['פריט 1', 'פריט 2', 'פריט 3'].map((item, i) => (
                      <div key={i} className="p-3 bg-blue-100 rounded-lg border-2 border-dashed border-blue-300 text-center cursor-grab">
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {['יעד א', 'יעד ב', 'יעד ג'].map((target, i) => (
                      <div key={i} className="p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-center min-h-[44px] flex items-center justify-center">
                        {target}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderQuizGame = () => {
    return (
      <Card className="student-card">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">משחק חידון</h3>
          <div className="text-center p-8 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
            <GamepadIcon className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-4">
              {gameStarted
                ? 'המשחק התחיל! ענה על השאלות.'
                : 'ממתין לתחילת המשחק...'
              }
            </p>
            {gameStarted && (
              <div className="space-y-4 max-w-lg mx-auto">
                <div className="text-lg font-bold text-gray-800 mb-4">
                  שאלה 1: מה זה לודורה?
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {['פלטפורמה חינוכית', 'משחק מחשב', 'אפליקציה', 'כל התשובות נכונות'].map((answer, i) => (
                    <button
                      key={i}
                      className="p-3 border-2 border-gray-300 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-colors text-right"
                    >
                      {answer}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGenericGame = () => {
    return (
      <Card className="student-card">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {lobbyData?.game?.title || 'משחק'}
          </h3>
          <div className="text-center p-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
            <GamepadIcon className="w-20 h-20 text-purple-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-4">
              {gameStarted
                ? 'המשחק פעיל! בצע את המשימות שלך.'
                : 'ממתין לתחילת המשחק...'
              }
            </p>
            {gameStarted && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  ממשק המשחק הספציפי ייטען כאן
                </p>
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-500">תוכן המשחק...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen student-portal-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-purple-700 font-medium">טוען נתוני משחק...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen student-portal-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center student-card p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">שגיאה</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/">
            <Button className="student-btn-primary">
              <Home className="w-4 h-4 ml-2" />
              חזרה לעמוד הבית
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionData || !lobbyData) {
    return (
      <div className="min-h-screen student-portal-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center student-card p-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">חדר לא נמצא</h2>
          <p className="text-gray-600 mb-6">לא ניתן למצוא את חדר משחק</p>
          <Link to="/">
            <Button className="student-btn-primary">
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
      <header className="bg-white/70 backdrop-blur-sm shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <LogoDisplay size="small" className="h-10 object-contain" />
          </div>

          {/* Game Info */}
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-800">
              {lobbyData.game.title || 'משחק'}
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              {getStatusIcon(sessionData.status)}
              <span>חדר {sessionData.session_number}</span>
              {lobbyData.game.game_type && (
                <>
                  <span>•</span>
                  <GameTypeDisplay
                    gameTypeKey={lobbyData.game.game_type}
                    variant="text"
                    showEditButton={false}
                    className="!text-xs"
                  />
                </>
              )}
            </div>
          </div>

          {/* Leave Game Button */}
          <Button
            onClick={leaveSession}
            variant="outline"
            className="student-btn-outline"
          >
            <Home className="w-4 h-4 ml-2" />
            צא מהמשחק
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Participants */}
        <Card className="student-card mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">שחקנים פעילים</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{sessionData.participants.length}/{lobbyData.settings.max_players}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {sessionData.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full"
                >
                  {participant.isAuthedUser ? (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Users className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-gray-800">
                    {participant.display_name}
                  </span>
                  {participant.id === participantId && (
                    <span className="text-xs text-green-600 font-bold">(אתה)</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Game Finished */}
        {gameFinished && (
          <Card className="student-card mb-6">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">המשחק הסתיים!</h3>
              <p className="text-gray-600 mb-4">תודה על ההשתתפות</p>
              <div className="space-y-2">
                <Button onClick={() => navigate('/')} className="student-btn-primary">
                  <Home className="w-4 h-4 ml-2" />
                  חזרה לעמוד הבית
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Interface */}
        {!gameFinished && renderGameInterface()}
      </main>
    </div>
  );
};

export default GamePlay;