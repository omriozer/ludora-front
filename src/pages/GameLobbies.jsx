import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { apiRequest } from '@/services/apiClient';
import { useSSE, SSE_CONNECTION_STATES } from '@/hooks/useSSE';
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
import { computeLobbyStatus, isLobbyActive, filterActiveLobbies, getLobbyStatusConfig, findBestActiveLobby, findMostRecentLobby } from '@/utils/lobbyUtils';
import ProductImage from '@/components/ui/ProductImage';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { toast } from '@/components/ui/use-toast';
import { getProductTypeName } from '@/config/productTypes';
import EnhancedLobbyCreationDialog from '@/components/game-lobbies/EnhancedLobbyActivationDialog';


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
        console.error('Error fetching user games:', error);
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
            {/* Main Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              <School className="inline-block w-12 h-12 md:w-14 md:h-14 mr-4 text-blue-600" />
              ניהול {getProductTypeName('game', 'plural')} כיתתיים
            </h1>

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
          <ActiveGamesGrid userGames={userGames} searchTerm={searchTerm} />
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
function ActiveGamesGrid({ userGames, searchTerm }) {
  // Filter games based on search with safe title access
  const filteredGames = userGames.filter(game => {
    // Handle different possible title locations and ensure safe access
    const title = game.title || game.name || game.product?.title || game.product?.name || '';
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
            <GameCard key={game.id} game={game} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

// Individual game card component
function GameCard({ game, index }) {
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

  // Safely get the game title from various possible locations
  const gameTitle = game.title || game.name || game.product?.title || game.product?.name || 'משחק ללא שם';

  // Use reusable utility to find the most recent lobby (prioritizes active lobbies)
  const mostRecentLobby = findMostRecentLobby(lobbyData?.lobbies || []);

  // Use a ref to maintain truly stable lobbyId to prevent SSE reconnections
  const stableLobbyIdRef = useRef(null);

  // Only update the stable lobby ID when we have confirmed data, never go back to null
  if (lobbyData && !lobbyLoading && mostRecentLobby?.id && !stableLobbyIdRef.current) {
    stableLobbyIdRef.current = mostRecentLobby.id;
  }

  // Build session context that only changes when gameId changes (not lobbyId)
  const sessionContext = useMemo(() => {
    const context = {
      gameId: game.id,
      lobbyId: stableLobbyIdRef.current, // Truly stable - set once and never changes
      sessionId: null, // Set when in specific session
      isLobbyOwner: true, // User is owner since they're managing the lobby
      isActiveParticipant: true, // User is actively managing
      priorityHint: 'lobby_status' // Valid SSE priority type for lobby monitoring
    };

    console.log('🔍 [GameCard] SessionContext created:', {
      gameId: game.id,
      stableLobbyId: stableLobbyIdRef.current,
      lobbyLoading,
      hasLobbyData: !!lobbyData,
      lobbiesCount: lobbyData?.lobbies?.length || 0,
      mostRecentLobby: mostRecentLobby ? { id: mostRecentLobby.id, status: computeLobbyStatus(mostRecentLobby) } : null,
      context
    });

    return context;
  }, [game.id]); // Only depend on gameId - lobbyId is truly stable via ref

  // Memoize SSE options to ensure proper reactivity when sessionContext changes
  const sseOptions = useMemo(() => {
    const options = {
      debugMode: true,
      autoReconnect: true,
      sessionContext
    };

    console.log('🔄 [GameCard] SSE Options updated:', {
      gameId: game.id,
      sessionContextLobbyId: sessionContext?.lobbyId,
      options
    });

    return options;
  }, [sessionContext]);

  // SSE integration for real-time lobby updates with session context
  const {
    connectionState,
    isConnected,
    isConnecting,
    isReconnecting,
    error,
    retryCount,
    addEventListener,
    removeEventListener
  } = useSSE(
    [`game:${game.id}`], // Subscribe to this game's events
    sseOptions
  );

  // Handle SSE events for real-time updates
  useEffect(() => {
    const handleLobbyEvent = (event) => {
      // For any lobby-related event, refresh the lobby data to get the latest state
      if (event.data?.gameId === game.id || event.data?.game_id === game.id) {
        processLobbyData(false); // Don't show loading during SSE updates
      }
    };

    const handleSessionEvent = (event) => {
      // For any session-related event, refresh the lobby data to get updated participant counts
      if (event.data?.gameId === game.id || event.data?.game_id === game.id) {
        processLobbyData(false); // Don't show loading during SSE updates
      }
    };

    // Register event handlers for lobby events
    const cleanupLobbyCreated = addEventListener('lobby:created', handleLobbyEvent);
    const cleanupLobbyActivated = addEventListener('lobby:activated', handleLobbyEvent);
    const cleanupLobbyClosed = addEventListener('lobby:closed', handleLobbyEvent);
    const cleanupLobbyExpired = addEventListener('lobby:expired', handleLobbyEvent);

    // Register event handlers for session events that affect participant counts
    const cleanupSessionCreated = addEventListener('session:created', handleSessionEvent);
    const cleanupSessionParticipantJoined = addEventListener('session:participant:joined', handleSessionEvent);
    const cleanupSessionParticipantLeft = addEventListener('session:participant:left', handleSessionEvent);
    const cleanupSessionStarted = addEventListener('session:started', handleSessionEvent);
    const cleanupSessionFinished = addEventListener('session:finished', handleSessionEvent);

    // Cleanup event handlers on unmount
    return () => {
      cleanupLobbyCreated?.();
      cleanupLobbyActivated?.();
      cleanupLobbyClosed?.();
      cleanupLobbyExpired?.();
      cleanupSessionCreated?.();
      cleanupSessionParticipantJoined?.();
      cleanupSessionParticipantLeft?.();
      cleanupSessionStarted?.();
      cleanupSessionFinished?.();
    };
  }, [game.id, addEventListener, removeEventListener]);


  // Process lobby data that comes with the game (no separate API call needed)
  const processLobbyData = (showLoading = true) => {
    try {
      if (showLoading) {
        setLobbyLoading(true);
      }
      setLobbyError(null);

      // Use lobbies data that comes with the game from /games endpoint
      const lobbies = game.lobbies || [];

      // DEBUG: Log lobby data with enhanced status computation details
      const now = new Date();
      console.log(`🔍 [DEBUG] Teacher Portal - Game ${gameTitle} (${game.id}):`, {
        totalLobbies: lobbies.length,
        currentTime: now.toISOString(),
        lobbies: lobbies.map(lobby => {
          const computedStatus = lobby.computed_status || computeLobbyStatus(lobby);
          const expiresAt = lobby.expires_at ? new Date(lobby.expires_at) : null;
          const closedAt = lobby.closed_at ? new Date(lobby.closed_at) : null;

          // Detailed status computation analysis
          let statusReason = '';
          if (lobby.closed_at) {
            statusReason = 'Has closed_at timestamp';
          } else if (!lobby.expires_at) {
            statusReason = 'No expires_at - pending';
          } else if (expiresAt && expiresAt <= now) {
            statusReason = 'Past expiration time';
          } else if (expiresAt) {
            const minutesUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60));
            statusReason = `Expires in ${minutesUntilExpiry} minutes`;
          }

          return {
            id: lobby.id,
            lobby_code: lobby.lobby_code,
            expires_at: lobby.expires_at,
            expires_at_parsed: expiresAt?.toISOString(),
            closed_at: lobby.closed_at,
            closed_at_parsed: closedAt?.toISOString(),
            computed_status: lobby.computed_status,
            calculated_status: computedStatus,
            status_reason: statusReason,
            is_active: isLobbyActive(lobby)
          };
        })
      });

      // DEBUG: Active lobbies analysis for teacher portal
      const activeLobbies = filterActiveLobbies(lobbies);
      console.log(`🔍 [DEBUG] Teacher Portal - Active lobbies for ${gameTitle}:`, {
        activeLobbies: activeLobbies.length,
        totalLobbies: lobbies.length,
        activeLobbiesList: activeLobbies.map(lobby => ({
          id: lobby.id,
          status: lobby.computed_status || computeLobbyStatus(lobby),
          is_active: isLobbyActive(lobby)
        })),
        allLobbiesActivenessCheck: lobbies.map(lobby => ({
          id: lobby.id,
          status: lobby.computed_status || computeLobbyStatus(lobby),
          is_active: isLobbyActive(lobby),
          reason: lobby.closed_at ? 'closed' : !lobby.expires_at ? 'pending' :
                  new Date(lobby.expires_at) <= now ? 'expired' : 'should_be_active'
        }))
      });

      // Calculate real session data from lobbies
      let totalActiveSessions = 0;
      let totalOnlinePlayers = 0;
      let currentLobbyStatus = 'closed'; // Default to closed if no lobbies

      if (lobbies.length > 0) {
        // Find the most recent open lobby, or fall back to most recent lobby
        const openLobby = lobbies.find(lobby => {
          const computed = computeLobbyStatus(lobby);
          return computed === 'open' || computed === 'open_indefinitely';
        });
        const mostRecentLobby = openLobby || lobbies[0];
        currentLobbyStatus = computeLobbyStatus(mostRecentLobby);

        // Count sessions - only count from active lobbies, not closed ones
        if (openLobby && openLobby.sessions) {
          const activeSessions = openLobby.sessions.filter(session => {
            // Only count sessions that are not finished and not expired
            return !session.finished_at &&
                   (!session.expires_at || new Date(session.expires_at) > new Date());
          });
          totalActiveSessions = activeSessions.length;
          totalOnlinePlayers = activeSessions.reduce((sum, session) => {
            return sum + (session.participants ? session.participants.length : 0);
          }, 0);
        }
        // If no open lobby but we have closed lobbies, show zero active sessions
      }

      setLobbyData({
        status: currentLobbyStatus,
        totalActiveSessions,
        totalOnlinePlayers,
        lobbies
      });

    } catch (error) {
      console.error('Error fetching lobby data for game:', game.id, error);
      // Set default values on error
      setLobbyData({
        status: 'closed',
        totalActiveSessions: 0,
        totalOnlinePlayers: 0,
        lobbies: []
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
  }, [game.id]);

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
        const targetLobby = mostRecentLobby;
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
      console.error('Error handling lobby:', error);
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
      if (!lobbyData?.lobbies?.length) {
        toast({
          title: "אין לובי זמין",
          description: "יש ליצור לובי תחילה",
          variant: "destructive"
        });
        return;
      }

      setLobbyLoading(true);

      // Find the lobby to activate - can be pending or closed
      const pendingLobby = lobbyData.lobbies.find(lobby => computeLobbyStatus(lobby) === 'pending');
      const closedLobby = lobbyData.lobbies.find(lobby => computeLobbyStatus(lobby) === 'closed');
      const targetLobby = pendingLobby || closedLobby || lobbyData.lobbies[0];

      const targetStatus = computeLobbyStatus(targetLobby);

      // Activation with default duration
      const response = await apiRequest(`/game-lobbies/${targetLobby.id}/activate`, {
        method: 'PUT',
        body: JSON.stringify({
          duration: 40 // Default 40 minutes
        })
      });

      const actionText = targetStatus === 'closed' ? 'נפתח מחדש' : 'הופעל';
      toast({
        title: `לובי ${actionText} בהצלחה!`,
        description: `השחקנים יכולים כעת להצטרף באמצעות קוד: ${response.lobby_code || targetLobby.lobby_code}`,
        variant: "default"
      });

      // Refresh lobby data
      processLobbyData();

    } catch (error) {
      console.error('Error activating lobby:', error);
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
      if (!lobbyData?.lobbies?.length) {
        toast({
          title: "אין לובי זמין",
          description: "אין לובי לסגירה",
          variant: "destructive"
        });
        return;
      }

      setLobbyLoading(true);

      // Find the active lobby to close
      const targetLobby = lobbyData.lobbies.find(lobby => {
        const status = computeLobbyStatus(lobby);
        return status === 'open' || status === 'open_indefinitely' || status === 'pending';
      }) || lobbyData.lobbies[0];

      const response = await apiRequest(`/game-lobbies/${targetLobby.id}/close`, {
        method: 'PUT'
      });

      toast({
        title: "לובי נסגר בהצלחה",
        description: "השחקנים לא יוכלו להצטרף יותר",
        variant: "default"
      });

      // Refresh lobby data
      processLobbyData();

    } catch (error) {
      console.error('Error closing lobby:', error);
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

  const statusConfig = mostRecentLobby ? getLobbyStatusConfig(mostRecentLobby) : {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    text: 'אין לובי',
    icon: Square,
    timeInfo: null
  };

  const currentStatus = mostRecentLobby ? computeLobbyStatus(mostRecentLobby) : 'no_lobby';
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

  const currentInvitationType = mostRecentLobby?.settings?.invitation_type || 'manual_selection';

  // Check if QR code should be shown - show for eligible invitation types regardless of lobby status
  const isEligibleInvitationType = ['manual_selection', 'random', 'order'].includes(currentInvitationType);
  const showQRCode = isEligibleInvitationType && mostRecentLobby?.lobby_code;

  // Get SSE connection status display configuration
  const getSSEStatusConfig = () => {
    switch (connectionState) {
      case SSE_CONNECTION_STATES.CONNECTED:
        return {
          color: 'bg-green-500',
          textColor: 'text-green-600',
          text: 'מחובר',
          title: 'מחובר לעדכונים בזמן אמת',
          icon: '🟢'
        };
      case SSE_CONNECTION_STATES.CONNECTING:
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-600',
          text: 'מתחבר...',
          title: 'מתחבר לעדכונים בזמן אמת',
          icon: '🟡'
        };
      case SSE_CONNECTION_STATES.RECONNECTING:
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-600',
          text: retryCount > 0 ? `מתחבר מחדש (${retryCount})` : 'מתחבר מחדש',
          title: 'מנסה להתחבר מחדש לעדכונים בזמן אמת',
          icon: '🔄'
        };
      case SSE_CONNECTION_STATES.ERROR:
        return {
          color: 'bg-red-500',
          textColor: 'text-red-600',
          text: 'שגיאה',
          title: error?.message || 'שגיאה בחיבור לעדכונים בזמן אמת',
          icon: '🔴'
        };
      case SSE_CONNECTION_STATES.PERMANENTLY_FAILED:
        return {
          color: 'bg-red-600',
          textColor: 'text-red-700',
          text: 'נכשל',
          title: 'החיבור לעדכונים בזמן אמת נכשל לצמיתות. בדוק שהשרת פועל.',
          icon: '❌'
        };
      case SSE_CONNECTION_STATES.DISCONNECTED:
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-600',
          text: 'מנותק',
          title: 'לא מחובר לעדכונים בזמן אמת',
          icon: '⚪'
        };
    }
  };

  const sseStatusConfig = getSSEStatusConfig();

  // Generate QR code when modal is opened
  useEffect(() => {
    if (showQRModal && qrContainer && mostRecentLobby?.lobby_code) {
      try {
        const studentPortalUrl = `https://my.ludora.app/play/${mostRecentLobby.lobby_code}`;
        renderQRCode(studentPortalUrl, qrContainer, LUDORA_OFFICIAL_PRESET, {
          width: 400,
          height: 400,
          margin: 0  // Remove all padding/margin
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  }, [showQRModal, qrContainer, mostRecentLobby?.lobby_code]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Card className="group transition-all duration-300 bg-white border border-gray-200 hover:border-blue-300 hover:shadow-xl overflow-hidden">
        <CardHeader className="pb-4">
          {/* Game Image with QR Code Button */}
          <div className="aspect-video bg-gradient-to-br from-blue-50 to-emerald-50 rounded-lg mb-4 flex items-center justify-center border border-gray-100 overflow-hidden relative">
            <ProductImage
              product={game}
              className="w-full h-full object-cover"
              iconClassName="w-16 h-16 text-blue-500"
              containerClassName="w-full h-full"
            />
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
            {/* Enhanced SSE Connection Status Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${sseStatusConfig.color} ${isConnecting || isReconnecting ? 'animate-pulse' : ''}`}
                title={sseStatusConfig.title}
              />
              <span className={`text-xs ${sseStatusConfig.textColor} font-medium`}>
                {sseStatusConfig.text}
              </span>
            </div>
          </div>

          {/* SSE Error Information */}
          {(connectionState === SSE_CONNECTION_STATES.ERROR || connectionState === SSE_CONNECTION_STATES.PERMANENTLY_FAILED) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-xs text-red-700 font-medium">חיבור לעדכונים נכשל</span>
                  {error && (
                    <p className="text-xs text-red-600 mt-1" title={error.message}>
                      {error.message.length > 50 ? `${error.message.slice(0, 50)}...` : error.message}
                    </p>
                  )}
                </div>
                {connectionState === SSE_CONNECTION_STATES.ERROR && (
                  <Button
                    onClick={() => window.location.reload()}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100 text-xs px-2 py-1 ml-2"
                  >
                    נסה שוב
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Status and Session Info */}
          <div className="space-y-3">
            {/* Lobby Status */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
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
                {lobbyData && lobbyData.lobbies.length > 0 && (
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
        existingLobbyData={isEditMode ? mostRecentLobby : null}
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
                  {mostRecentLobby?.lobby_code}
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-6 text-center max-w-md">
                <p className="text-gray-600 text-sm leading-relaxed">
                  תלמידים יכולים לסרוק את ה-QR או להזין את הקוד באתר:
                </p>
                <p className="text-blue-600 font-medium mt-2">
                  my.ludora.app/play
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