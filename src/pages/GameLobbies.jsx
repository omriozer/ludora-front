import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { apiRequest } from '@/services/apiClient';
import socketClient from '@/services/socketClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Users,
  Clock,
  Play,
  Pause,
  Square,
  Settings,
  UserPlus,
  Eye,
  Plus,
  Search,
  Filter,
  BookOpen,
  GraduationCap,
  School,
  UserCheck,
  ClipboardList,
  BookOpenCheck,
  QrCode,
  X
} from 'lucide-react';
import { renderQRCode, LUDORA_OFFICIAL_PRESET } from '@/utils/qrCodeUtils';
import { computeLobbyStatus, isLobbyActive, isLobbyJoinable, filterActiveLobbies, filterJoinableLobbies, getLobbyStatusConfig, findBestJoinableLobby, findMostRecentLobby } from '@/utils/lobbyUtils';
import ProductImage from '@/components/ui/ProductImage';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { toast } from '@/components/ui/use-toast';
import { getProductTypeName } from '@/config/productTypes';
import EnhancedLobbyCreationDialog from '@/components/game-lobbies/EnhancedLobbyActivationDialog';
import { urls } from '@/config/urls';
import { ludlog, luderror } from '@/lib/ludlog';


// Main component
export default function GameLobbies() {
  const { currentUser, isLoading: userLoading } = useUser();
  const { gameId, sessionId } = useParams();
  const navigate = useNavigate();

  const [userGames, setUserGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserGames = async () => {
      try {
        // Fetch user's accessible games with purchase data from the /api/games endpoint
        // This endpoint returns games the user owns/created or has access to, with embedded product data
        const games = await apiRequest('/games');

        setUserGames(games || []);
        setLoading(false);
      } catch (error) {
        luderror.api('[GameLobbies] Error fetching user games:', error);
        // Handle error gracefully by showing empty state
        setUserGames([]);
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchUserGames();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center">
        <LudoraLoadingSpinner
          message={`טוען ${getProductTypeName('game', 'plural')}...`}
          size="lg"
          theme="light"
          showLogo={true}
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-md w-full mx-4 bg-white border border-blue-200 shadow-xl">
            <CardContent className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                נדרשת התחברות
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                כדי לגשת לניהול {getProductTypeName('game', 'plural')} עליך להתחבר תחילה
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-8 py-3 rounded-lg font-medium"
              >
                <Link to="/">התחבר למערכת</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Route-based content rendering
  if (sessionId) {
    return <SessionDetailView gameId={gameId} sessionId={sessionId} />;
  } else if (gameId) {
    return <GameSpecificView gameId={gameId} />;
  } else {
    return <MainLobbyView userGames={userGames} loading={loading} />;
  }
}

// Main lobby overview component
function MainLobbyView({ userGames, loading }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ Socket.IO connection for real-time lobby updates
  const [socketConnectionState, setSocketConnectionState] = useState('disconnected');
  const [gameUpdateTrigger, setGameUpdateTrigger] = useState(0);

  // Socket.IO connection for real-time lobby updates
  useEffect(() => {
    setSocketConnectionState('connecting');

    // Connect to Socket.IO
    socketClient.connect().then(() => {
      setSocketConnectionState('connected');
    }).catch(() => {
      setSocketConnectionState('error');
    });

    // Listen for lobby updates
    const unsubscribeLobbyUpdate = socketClient.onLobbyUpdate('lobby:update', (eventData) => {
      try {
        // Look for lobby-related events that affect game cards
        if (eventData.type && (
          eventData.type === 'lobby_created' ||
          eventData.type === 'lobby_activated' ||
          eventData.type === 'lobby_closed' ||
          eventData.type === 'session_created' ||
          eventData.type === 'participant_joined' ||
          eventData.type === 'participant_left' ||
          eventData.type === 'game_state_updated' ||
          eventData.type === 'session_started' ||
          eventData.type === 'session_finished'
        )) {
          // Trigger all game cards to refresh their lobby data
          setGameUpdateTrigger(prev => prev + 1);
        }
      } catch (error) {
        // Silent fail - lobby updates are non-critical
      }
    });

    // Listen for connection state changes
    const unsubscribeConnect = socketClient.onLobbyUpdate('connect', () => {
      setSocketConnectionState('connected');
    });

    const unsubscribeDisconnect = socketClient.onLobbyUpdate('disconnect', () => {
      setSocketConnectionState('disconnected');
    });

    const unsubscribeReconnect = socketClient.onLobbyUpdate('reconnect', () => {
      setSocketConnectionState('connected');
    });

    // Cleanup on unmount
    return () => {
      unsubscribeLobbyUpdate();
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeReconnect();
    };
  }, []); // Only connect once when component mounts

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center">
        <LudoraLoadingSpinner
          message={`טוען ${getProductTypeName('game', 'plural')}...`}
          size="lg"
          theme="light"
          showLogo={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Main Title with Connection Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
                <School className="inline-block w-12 h-12 md:w-14 md:h-14 mr-4 text-blue-600" />
                ניהול {getProductTypeName('game', 'plural')} כיתתיים
              </h1>
              {/* Connection Status Badge */}
              <Badge
                variant="outline"
                className={`px-3 py-2 text-sm font-medium transition-all duration-200 self-center ${
                  socketConnectionState === 'connected'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : socketConnectionState === 'connecting'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {socketConnectionState === 'connected' ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    מחובר לעדכונים
                  </>
                ) : socketConnectionState === 'connecting' ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                    מתחבר...
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    לא מחובר לעדכונים
                  </>
                )}
              </Badge>
            </div>

            {/* Subtitle */}
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              נהל קבוצות תלמידים, צור חדרי {getProductTypeName('game', 'plural')} אינטראקטיביים ועקוב אחר התקדמות הכיתה
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-6">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder={`חפש ${getProductTypeName('game', 'plural')}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border border-gray-300 pr-12 py-3 rounded-lg text-gray-800 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quick Access Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto">
              <Button
                onClick={() => navigate('/curriculum')}
                variant="outline"
                className="bg-white/90 border-2 border-blue-200 hover:bg-blue-50 text-blue-700 px-6 py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-300"
                size="default"
              >
                <BookOpenCheck className="w-5 h-5 mr-2" />
                גלה {getProductTypeName('game', 'plural')} לפי תכנית הלימודים
              </Button>

              <Button
                onClick={() => navigate('/games')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-300"
                size="default"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                עיין בכל ה{getProductTypeName('game', 'plural')}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {userGames.length === 0 ? (
          <EmptyGamesState />
        ) : (
          <ActiveGamesGrid
            userGames={userGames}
            searchTerm={searchTerm}
            socketConnectionState={socketConnectionState}
            gameUpdateTrigger={gameUpdateTrigger}
          />
        )}
      </div>
    </div>
  );
}

// Empty state when user has no educational activities
function EmptyGamesState() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="text-center py-12"
    >
      <Card className="max-w-3xl mx-auto bg-white border border-gray-200 shadow-lg">
        <CardContent className="py-16 px-8">
          {/* Icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <BookOpen className="w-12 h-12 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            התחל ללמד עם {getProductTypeName('game', 'plural')} אינטראקטיביים
          </h2>

          {/* Description */}
          <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            כדי ליצור חדרי {getProductTypeName('game', 'plural')} קבוצתיים, תחילה עליך לרכוש {getProductTypeName('game', 'plural')} חינוכיים מהקטלוג.
            <br />
            בחר ממגוון רחב של {getProductTypeName('game', 'plural')} פדגוגיים והתחל ליצור חוויות למידה מעניינות עבור התלמידים!
          </p>

          {/* Features List */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="flex flex-col items-center gap-3 p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="font-medium text-gray-700">ניהול תלמידים</span>
              <span className="text-sm text-gray-500 text-center">מגוון גדלי קבוצות לפי הגדרות ה{getProductTypeName('game', 'singular')}</span>
            </div>
            <div className="flex flex-col items-center gap-3 p-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="font-medium text-gray-700">מעקב התקדמות</span>
              <span className="text-sm text-gray-500 text-center">צפייה בביצועי התלמידים בזמן אמת</span>
            </div>
            <div className="flex flex-col items-center gap-3 p-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-orange-600" />
              </div>
              <span className="font-medium text-gray-700">התאמה אישית</span>
              <span className="text-sm text-gray-500 text-center">הגדרות גמישות לכל {getProductTypeName('game', 'singular')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/curriculum')}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-4 rounded-lg font-medium text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                size="lg"
              >
                <BookOpenCheck className="w-6 h-6 mr-3" />
                גלה {getProductTypeName('game', 'plural')} לפי תכנית הלימודים
              </Button>

              <Button
                onClick={() => navigate('/games')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-lg font-medium text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                size="lg"
              >
                <BookOpen className="w-6 h-6 mr-3" />
                עיין בכל ה{getProductTypeName('game', 'plural')}
              </Button>
            </div>

            {/* Secondary Action */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-8 py-3 rounded-lg font-medium"
                size="default"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                חזור לדאשבורד
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Active games grid (for when user has games)
function ActiveGamesGrid({ userGames, searchTerm, socketConnectionState, gameUpdateTrigger }) {
  // Filter games based on search with safe title access
  const filteredGames = userGames.filter(game => {
    // Game title comes from the associated Product, not the Game entity itself
    const title = game.product?.title || game.product?.name || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 py-8">

      {/* Section Title */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              ה{getProductTypeName('game', 'plural')} שלך ({filteredGames.length})
            </h2>
            <p className="text-gray-600">
              נהל קבוצות תלמידים וצור חדרי {getProductTypeName('game', 'plural')} חדשים עבור הכיתות שלך
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/curriculum')}
              variant="outline"
              className="bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-300"
              size="sm"
            >
              <BookOpenCheck className="w-4 h-4 mr-2" />
              גלה בתכנית הלימודים
            </Button>
            <Button
              onClick={() => navigate('/games')}
              variant="outline"
              className="border-2 border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-300"
              size="sm"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              עיין בקטלוג
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Games Grid */}
      {filteredGames.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">
              לא נמצאו {getProductTypeName('game', 'plural')} תואמים לחיפוש "{searchTerm}"
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              index={index}
              // Pass simple Socket.IO connection state
              socketConnectionState={socketConnectionState}
              gameUpdateTrigger={gameUpdateTrigger}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Individual game card component
function GameCard({
  game,
  index,
  // Simple Socket.IO props from parent
  socketConnectionState,
  gameUpdateTrigger
}) {
  const navigate = useNavigate();
  const [lobbyData, setLobbyData] = useState(null);
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [lobbyError, setLobbyError] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrContainer, setQrContainer] = useState(null);

  // Enhanced lobby creation/editing dialog state
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [creationLoading, setCreationLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Game title comes from the associated Product, not the Game entity itself
  const gameTitle = game.product?.title || game.product?.name || 'משחק ללא שם';

  // Get the single lobby from lobby data
  const lobby = lobbyData?.lobby || null;
  const lobbyCode = lobbyData?.lobbyCode || null;

  // Make gameId completely stable - only create once per component
  const [stableGameId] = useState(() => game.id);

  // Simple: React to gameUpdateTrigger changes from Socket.IO events
  useEffect(() => {
    // When the parent component detects a relevant Socket.IO event, it increments gameUpdateTrigger
    // This causes all game cards to refresh their lobby data
    if (gameUpdateTrigger > 0) {
      processLobbyData(false); // Don't show loading during Socket.IO updates
    }
  }, [gameUpdateTrigger, stableGameId]);


  // Process lobby data that comes with the game (expect only one lobby per game)
  const processLobbyData = (showLoading = true) => {
    try {
      if (showLoading) {
        setLobbyLoading(true);
      }
      setLobbyError(null);

      // Use lobbies data that comes with the game from /games endpoint
      const lobbies = game.lobbies || [];

      // Use the first/only lobby (each game should have only one)
      const lobby = lobbies.length > 0 ? lobbies[0] : null;

      let totalActiveSessions = 0;
      let totalOnlinePlayers = 0;
      let currentLobbyStatus = 'no_lobby';
      let lobbyCode = null;

      if (lobby) {
        currentLobbyStatus = computeLobbyStatus(lobby);
        lobbyCode = lobby.lobby_code;

        // Count sessions - only if lobby is active
        if (isLobbyActive(lobby) && lobby.sessions) {
          const activeSessions = lobby.sessions.filter(session => {
            // Only count sessions that are not finished and not expired
            return !session.finished_at &&
                   (!session.expires_at || new Date(session.expires_at) > new Date());
          });
          totalActiveSessions = activeSessions.length;
          totalOnlinePlayers = activeSessions.reduce((sum, session) => {
            return sum + (session.participants ? session.participants.length : 0);
          }, 0);
        }
      }

      setLobbyData({
        status: currentLobbyStatus,
        totalActiveSessions,
        totalOnlinePlayers,
        lobby: lobby,
        lobbyCode: lobbyCode
      });

    } catch (error) {
      luderror.game('[GameLobbies] Error processing lobby data for game:', game.id, { context: error });
      // Set default values on error
      setLobbyData({
        status: 'no_lobby',
        totalActiveSessions: 0,
        totalOnlinePlayers: 0,
        lobby: null,
        lobbyCode: null
      });
      setLobbyError(error.message);
    } finally {
      if (showLoading) {
        setLobbyLoading(false);
      }
    }
  };

  useEffect(() => {
    processLobbyData();
  }, [stableGameId]);

  // Get game settings for max players
  const maxPlayersPerSession = game.game_settings?.max_players || game.settings?.max_players || 12;

  // Lobby management functions
  const createLobby = () => {
    // Open the enhanced creation dialog in create mode
    setIsEditMode(false);
    setShowCreationDialog(true);
  };

  const editLobby = () => {
    // Open the enhanced dialog in edit mode
    setIsEditMode(true);
    setShowCreationDialog(true);
  };

  const handleEnhancedCreation = async (creationData) => {
    try {
      setCreationLoading(true);

      if (isEditMode) {
        // Edit existing lobby
        const targetLobby = lobby;
        if (!targetLobby) {
          throw new Error('No lobby to edit');
        }

        // Update lobby settings
        const settingsUpdatePayload = {
          settings: {
            ...targetLobby.settings,
            max_players: creationData.max_players || maxPlayersPerSession,
            session_time_limit: 30,
            allow_guest_users: true,
            invitation_type: creationData.invitation_type || 'manual_selection',
            auto_close_after: 60
          }
        };

        await apiRequest(`/game-lobbies/${targetLobby.id}`, {
          method: 'PUT',
          body: JSON.stringify(settingsUpdatePayload)
        });

        // If time-related settings changed, activate with new settings
        if (creationData.expires_at || creationData.duration) {
          const activationPayload = {
            expires_at: creationData.expires_at,
            duration: creationData.duration,
            max_players: creationData.max_players,
            session_config: creationData.session_config
          };

          await apiRequest(`/game-lobbies/${targetLobby.id}/activate`, {
            method: 'PUT',
            body: JSON.stringify(activationPayload)
          });
        }

        toast({
          title: "הגדרות הלובי עודכנו בהצלחה!",
          description: "השינויים בזמן ישפיעו על כל החדרים. שינויים אחרים ישפיעו על חדרים חדשים בלבד.",
          variant: "default"
        });
      } else {
        // Create new lobby
        const lobbyCreationPayload = {
          settings: {
            max_players: creationData.max_players || maxPlayersPerSession,
            session_time_limit: 30,
            allow_guest_users: true,
            invitation_type: 'manual_selection',
            auto_close_after: 60
          }
        };

        const response = await apiRequest(`/games/${game.id}/lobbies`, {
          method: 'POST',
          body: JSON.stringify(lobbyCreationPayload)
        });

        // If the lobby should be activated immediately
        if (response.id && (creationData.expires_at || creationData.duration)) {
          const activationPayload = {
            expires_at: creationData.expires_at,
            duration: creationData.duration,
            max_players: creationData.max_players,
            session_config: creationData.session_config
          };

          await apiRequest(`/game-lobbies/${response.id}/activate`, {
            method: 'PUT',
            body: JSON.stringify(activationPayload)
          });
        }

        toast({
          title: "לובי נוצר בהצלחה!",
          description: `קוד לובי: ${response.lobby_code}`,
          variant: "default"
        });
      }

      // Close dialog and refresh lobby data
      setShowCreationDialog(false);
      processLobbyData();

    } catch (error) {
      luderror.game('[GameLobbies] Error handling lobby:', error);
      const action = isEditMode ? 'עריכת' : 'יצירת';
      toast({
        title: `שגיאה ב${action} לובי`,
        description: error.message || "אירעה שגיאה בלתי צפויה",
        variant: "destructive"
      });
    } finally {
      setCreationLoading(false);
    }
  };

  const openLobby = async () => {
    try {
      // Check if we have a lobby to activate
      if (!lobby) {
        toast({
          title: "אין לובי זמין",
          description: "יש ליצור לובי תחילה",
          variant: "destructive"
        });
        return;
      }

      setLobbyLoading(true);

      const targetStatus = computeLobbyStatus(lobby);

      // Activation with default duration
      const response = await apiRequest(`/game-lobbies/${lobby.id}/activate`, {
        method: 'PUT',
        body: JSON.stringify({
          duration: 40 // Default 40 minutes
        })
      });

      const actionText = targetStatus === 'closed' ? 'נפתח מחדש' : 'הופעל';
      toast({
        title: `לובי ${actionText} בהצלחה!`,
        description: `השחקנים יכולים כעת להצטרף באמצעות קוד: ${response.lobby_code || lobbyCode}`,
        variant: "default"
      });

      // Update UI immediately with fresh API response data
      if (response) {
        const updatedLobby = response;
        const updatedStatus = computeLobbyStatus(updatedLobby);

        // Count sessions for active lobby
        let totalActiveSessions = 0;
        let totalOnlinePlayers = 0;
        if (isLobbyActive(updatedLobby) && updatedLobby.sessions) {
          const activeSessions = updatedLobby.sessions.filter(session => {
            return !session.finished_at &&
                   (!session.expires_at || new Date(session.expires_at) > new Date());
          });
          totalActiveSessions = activeSessions.length;
          totalOnlinePlayers = activeSessions.reduce((sum, session) => {
            return sum + (session.participants ? session.participants.length : 0);
          }, 0);
        }

        // Update lobby data state immediately with fresh data
        setLobbyData({
          status: updatedStatus,
          totalActiveSessions,
          totalOnlinePlayers,
          lobby: updatedLobby,
          lobbyCode: updatedLobby.lobby_code
        });

        // Also update the game.lobbies array so processLobbyData() will work correctly in the future
        if (game.lobbies && game.lobbies.length > 0) {
          game.lobbies[0] = updatedLobby;
        }
      }

    } catch (error) {
      luderror.game('[GameLobbies] Error activating lobby:', error);
      toast({
        title: "שגיאה בהפעלת לובי",
        description: error.message || "אירעה שגיאה בלתי צפויה",
        variant: "destructive"
      });
    } finally {
      setLobbyLoading(false);
    }
  };

  const closeLobby = async () => {
    try {
      if (!lobby) {
        toast({
          title: "אין לובי זמין",
          description: "אין לובי לסגירה",
          variant: "destructive"
        });
        return;
      }

      setLobbyLoading(true);

      const response = await apiRequest(`/game-lobbies/${lobby.id}/close`, {
        method: 'PUT'
      });

      toast({
        title: "לובי נסגר בהצלחה",
        description: "השחקנים לא יוכלו להצטרף יותר",
        variant: "default"
      });

      // Update UI immediately with fresh API response data
      if (response) {
        const updatedLobby = response;
        const updatedStatus = computeLobbyStatus(updatedLobby);

        // Update lobby data state immediately with fresh data
        setLobbyData({
          status: updatedStatus,
          totalActiveSessions: 0, // Closed lobby has no active sessions
          totalOnlinePlayers: 0,
          lobby: updatedLobby,
          lobbyCode: updatedLobby.lobby_code
        });

        // Also update the game.lobbies array so processLobbyData() will work correctly in the future
        if (game.lobbies && game.lobbies.length > 0) {
          game.lobbies[0] = updatedLobby;
        }
      }

    } catch (error) {
      luderror.game('[GameLobbies] Error closing lobby:', error);
      toast({
        title: "שגיאה בסגירת לובי",
        description: error.message || "אירעה שגיאה בלתי צפויה",
        variant: "destructive"
      });
    } finally {
      setLobbyLoading(false);
    }
  };



  // Use real lobby data or show loading state
  const totalActiveSessions = lobbyData ? lobbyData.totalActiveSessions : 0;
  const totalOnlinePlayers = lobbyData ? lobbyData.totalOnlinePlayers : 0;

  const statusConfig = lobby ? getLobbyStatusConfig(lobby) : {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    text: 'אין לובי',
    icon: Square,
    timeInfo: null
  };

  const currentStatus = lobby ? computeLobbyStatus(lobby) : 'no_lobby';
  const StatusIcon = statusConfig.icon;

  // Get invitation type display text
  const getInvitationTypeText = (invitationType) => {
    const invitationTypes = {
      'manual_selection': 'בחירה ידנית',
      'teacher_assignment': 'הקצאת מורה',
      'random': 'הקצאה אקראית',
      'order': 'לפי סדר הגעה'
    };
    return invitationTypes[invitationType] || 'בחירה ידנית';
  };

  const currentInvitationType = lobby?.settings?.invitation_type || 'manual_selection';

  // Check if QR code should be shown - only show for actually joinable lobbies
  const isEligibleInvitationType = ['manual_selection', 'random', 'order'].includes(currentInvitationType);
  const isActuallyJoinable = lobby ? isLobbyJoinable(lobby) : false;
  const showQRCode = isEligibleInvitationType && lobbyCode && isActuallyJoinable;


  // Generate QR code when modal is opened
  useEffect(() => {
    if (showQRModal && qrContainer && lobbyCode) {
      try {
        const studentPortalUrl = urls.portal.student.game(lobbyCode);
        renderQRCode(studentPortalUrl, qrContainer, LUDORA_OFFICIAL_PRESET, {
          width: 400,
          height: 400,
          margin: 0  // Remove all padding/margin
        });
      } catch (error) {
        luderror.game('[GameLobbies] Error generating QR code:', error);
      }
    }
  }, [showQRModal, qrContainer, lobbyCode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Card className="group transition-all duration-300 bg-white border border-gray-200 hover:border-blue-300 hover:shadow-xl overflow-hidden">
        <CardHeader className="pb-4">
          {/* Game Image with QR Code Button and Lobby Code Badge */}
          <div className="aspect-video bg-gradient-to-br from-blue-50 to-emerald-50 rounded-lg mb-4 flex items-center justify-center border border-gray-100 overflow-hidden relative">
            <ProductImage
              product={game}
              className="w-full h-full object-cover"
              iconClassName="w-16 h-16 text-blue-500"
              containerClassName="w-full h-full"
            />

            {/* Lobby Code Badge - Top Left */}
            {lobbyCode && (
              <Badge className="absolute top-2 left-2 bg-blue-500 text-white border-0 font-mono text-sm px-3 py-1.5 shadow-lg z-10 flex items-center justify-center">
                {lobbyCode}
              </Badge>
            )}

            {/* QR Code Button - Top Right */}
            {showQRCode && (
              <Button
                onClick={() => setShowQRModal(true)}
                size="sm"
                className="absolute top-2 right-2 bg-teal-500 hover:bg-teal-600 text-white shadow-lg z-10"
              >
                <QrCode className="w-4 h-4 mr-1" />
                QR
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-800 text-xl leading-tight">{gameTitle}</CardTitle>
          </div>


          {/* Status and Session Info */}
          <div className="space-y-3">
            {/* Lobby Status */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                {/* Status Badge */}
                <Badge className={`${statusConfig.color} border flex items-center gap-2`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.text}
                </Badge>
                {statusConfig.timeInfo && (
                  <span className="text-xs text-gray-500 mr-1">{statusConfig.timeInfo}</span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-gray-500 text-sm font-medium">
                  {totalActiveSessions} חדרים פעילים
                </span>
                {totalOnlinePlayers > 0 && (
                  <span className="text-blue-600 text-xs font-medium">
                    {totalOnlinePlayers} משתתפים כולל
                  </span>
                )}
              </div>
            </div>

            {/* Invitation Type Display */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">אופן הצטרפות:</span>
                <span className="text-sm text-blue-700">{getInvitationTypeText(currentInvitationType)}</span>
              </div>
            </div>

            {/* Session Details */}
            {totalActiveSessions > 0 && !lobbyLoading && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">חדרים פעילים</span>
                  <span className="text-sm text-blue-600">{totalOnlinePlayers} שחקנים מחוברים</span>
                </div>
                {lobby && (
                  <div className="space-y-1">
                    {Array.from({ length: totalActiveSessions }, (_, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">חדר {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-700 font-medium">
                            {Math.ceil(totalOnlinePlayers / totalActiveSessions)} שחקנים
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {lobbyLoading && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-sm text-gray-600">טוען נתוני לובי...</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {lobbyError && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <span className="text-sm text-red-600">שגיאה בטעינת נתוני לובי</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-6">
          {/* Action Buttons Based on Lobby Status */}
          <div className="space-y-2">
            {!lobbyLoading && currentStatus === 'closed' && (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-orange-800">לובי סגור</span>
                  </div>
                  <p className="text-xs text-orange-700">
                    הלובי סגור זמנית. ניתן לפתוח מחדש, לערוך הגדרות או לצפות בפרטים.
                  </p>
                </div>
                <Button
                  onClick={openLobby}
                  disabled={lobbyLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  פתח לובי מחדש
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={editLobby}
                    disabled={lobbyLoading}
                    variant="outline"
                    className="border-2 border-blue-200 hover:bg-blue-50 text-blue-700 font-medium py-2 rounded-lg"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    ערוך הגדרות
                  </Button>
                  <Button
                    onClick={() => navigate(`/game-lobbies/${game.id}`)}
                    disabled={lobbyLoading}
                    variant="outline"
                    className="border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    פרטים
                  </Button>
                </div>
              </>
            )}

            {!lobbyLoading && currentStatus === 'no_lobby' && (
              <Button
                onClick={createLobby}
                disabled={lobbyLoading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 rounded-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                צור לובי חדש
              </Button>
            )}

            {!lobbyLoading && currentStatus === 'pending' && (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-yellow-800">לובי ממתין להפעלה</span>
                  </div>
                  <p className="text-xs text-yellow-700">
                    הלובי נוצר אך עדיין לא פתוח לתלמידים. יש להפעיל אותו כדי שתלמידים יוכלו להצטרף.
                  </p>
                </div>
                <Button
                  onClick={openLobby}
                  disabled={lobbyLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  פתח לובי להרשמה
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={editLobby}
                    disabled={lobbyLoading}
                    variant="outline"
                    className="border-2 border-blue-200 hover:bg-blue-50 text-blue-700 font-medium py-2 rounded-lg"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    ערוך הגדרות
                  </Button>
                  <Button
                    onClick={() => navigate(`/game-lobbies/${game.id}`)}
                    disabled={lobbyLoading}
                    variant="outline"
                    className="border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    פרטים
                  </Button>
                </div>
              </>
            )}

            {!lobbyLoading && (currentStatus === 'open' || currentStatus === 'open_indefinitely') && (
              <>
                <Button
                  onClick={() => navigate(`/game-lobbies/${game.id}`)}
                  disabled={lobbyLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-medium py-3 rounded-lg"
                >
                  <Users className="w-5 h-5 mr-2" />
                  נהל חדרים פעילים ({totalActiveSessions})
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={closeLobby}
                    disabled={lobbyLoading}
                    variant="outline"
                    className="border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 rounded-lg"
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    סגור לובי
                  </Button>
                  <Button
                    onClick={() => navigate(`/game-lobbies/${game.id}`)}
                    variant="outline"
                    className="border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    פרטים
                  </Button>
                </div>
              </>
            )}

            {/* Loading State for Buttons */}
            {lobbyLoading && (
              <Button
                disabled
                className="w-full bg-gray-300 text-gray-500 font-medium py-3 rounded-lg cursor-not-allowed"
              >
                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                טוען...
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Lobby Creation/Editing Dialog */}
      <EnhancedLobbyCreationDialog
        isOpen={showCreationDialog}
        onClose={() => setShowCreationDialog(false)}
        onConfirm={handleEnhancedCreation}
        gameType={game.game_type || 'memory_game'}
        gameName={gameTitle}
        isLoading={creationLoading}
        isEditMode={isEditMode}
        existingLobbyData={isEditMode ? lobby : null}
      />

      {/* Full-Screen QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden relative">
            {/* Close Button */}
            <Button
              onClick={() => setShowQRModal(false)}
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100"
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-yellow-500 p-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">{gameTitle}</h2>
              <p className="text-white opacity-90">סרוק להצטרפות למשחק</p>
            </div>

            {/* QR Code Container */}
            <div className="p-8 flex flex-col items-center">
              <div
                ref={setQrContainer}
                className="mb-6 bg-white"
                style={{ width: 400, height: 400 }}
              />

              {/* Lobby Code */}
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">קוד לובי:</div>
                <div className="text-2xl font-bold text-gray-800 font-mono bg-gray-100 px-4 py-2 rounded-lg">
                  {lobbyCode}
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-6 text-center max-w-md">
                <p className="text-gray-600 text-sm leading-relaxed">
                  תלמידים יכולים לסרוק את ה-QR או להזין את הקוד באתר:
                </p>
                <p className="text-blue-600 font-medium mt-2">
                  {urls.portal.student.home().replace(/^https?:\/\//, '')}/play
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Game-specific view component (simplified for now)
function GameSpecificView({ gameId }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/game-lobbies')}
            className="text-gray-600 hover:bg-white/80 mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            חזור לכל ה{getProductTypeName('game', 'plural')}
          </Button>

          <Card className="bg-white border border-gray-200 shadow-lg text-center py-16">
            <CardContent>
              <School className="w-20 h-20 text-blue-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                ניהול {getProductTypeName('game', 'singular')} חינוכי
              </h2>
              <p className="text-gray-600 mb-6">
                TODO: הוסף ממשק לניהול קבוצות תלמידים עבור {getProductTypeName('game', 'singular')} {gameId}
              </p>
              <Button
                onClick={() => toast({
                  title: "בפיתוח",
                  description: "ממשק ניהול הקבוצות יתווסף בקרוב",
                  variant: "default"
                })}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                צור קבוצת תלמידים חדשה
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// Learning session detail view component (simplified for now)
function SessionDetailView({ gameId, sessionId }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(`/game-lobbies/${gameId}`)}
            className="text-gray-600 hover:bg-white/80 mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            חזור ל{getProductTypeName('game', 'singular')}
          </Button>

          <Card className="bg-white border border-gray-200 shadow-lg text-center py-16">
            <CardContent>
              <Users className="w-20 h-20 text-blue-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                ניהול חדר {getProductTypeName('game', 'singular')}
              </h2>
              <p className="text-gray-600 mb-6">
                TODO: הוסף ממשק לניהול חדר {sessionId} עבור {getProductTypeName('game', 'singular')} {gameId}
                <br />
                <span className="text-sm">כולל רשימת תלמידים, מעקב התקדמות והגדרות החדר</span>
              </p>
              <Button
                onClick={() => toast({
                  title: "בפיתוח",
                  description: "ממשק ניהול החדר יתווסף בקרוב",
                  variant: "default"
                })}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                הגדרות חדר למידה
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}