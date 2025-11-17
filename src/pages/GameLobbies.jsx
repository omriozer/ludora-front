import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { apiRequest } from '@/services/apiClient';
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
  BookOpenCheck
} from 'lucide-react';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { toast } from '@/components/ui/use-toast';
import { getProductTypeName } from '@/config/productTypes';
import EnhancedLobbyCreationDialog from '@/components/game-lobbies/EnhancedLobbyActivationDialog';

// Utility function for computing lobby status based on expiration
const computeLobbyStatus = (lobby) => {
  // Manual close takes precedence
  if (lobby.closed_at) return 'closed';

  // No expiration = pending activation
  if (!lobby.expires_at) return 'pending';

  const now = new Date();
  const expiration = new Date(lobby.expires_at);
  const fiftyYearsFromNow = new Date(now.getFullYear() + 50, now.getMonth(), now.getDate());

  // Past expiration = closed
  if (expiration <= now) return 'closed';

  // ~50+ years = indefinite (more reliable threshold)
  if (expiration >= fiftyYearsFromNow) return 'open_indefinitely';

  // Normal future date = open
  return 'open';
};

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
        console.log('Fetched games:', games); // Debug: log the actual structure

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
              נהל קבוצות תלמידים, צור סשני {getProductTypeName('game', 'plural')} אינטראקטיביים ועקוב אחר התקדמות הכיתה
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
            כדי ליצור סשני {getProductTypeName('game', 'plural')} קבוצתיים, תחילה עליך לרכוש {getProductTypeName('game', 'plural')} חינוכיים מהקטלוג.
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
              נהל קבוצות תלמידים וצור סשני {getProductTypeName('game', 'plural')} חדשים עבור הכיתות שלך
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

  // Enhanced lobby creation/editing dialog state
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [creationLoading, setCreationLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Safely get the game title from various possible locations
  const gameTitle = game.title || game.name || game.product?.title || game.product?.name || 'משחק ללא שם';

  // Fetch real lobby data for this game
  const fetchLobbyData = async () => {
    try {
      setLobbyLoading(true);
      setLobbyError(null);

      // Fetch lobbies for this specific game
      const response = await apiRequest(`/games/${game.id}/lobbies`);

      // The API returns { data: [...lobbies], pagination: {...} }
      const lobbies = response.data || [];

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
      setLobbyLoading(false);
    }
  };

  useEffect(() => {
    fetchLobbyData();
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
            invitation_type: 'lobby_only',
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
          description: "השינויים בזמן ישפיעו על כל הסשנים. שינויים אחרים ישפיעו על סשנים חדשים בלבד.",
          variant: "default"
        });
      } else {
        // Create new lobby
        const lobbyCreationPayload = {
          settings: {
            max_players: creationData.max_players || maxPlayersPerSession,
            session_time_limit: 30,
            allow_guest_users: true,
            invitation_type: 'lobby_only',
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
      await fetchLobbyData();

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
      await fetchLobbyData();

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
        return status === 'open' || status === 'open_indefinitely';
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
      await fetchLobbyData();

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


  // Get lobby status styling with expiration info
  const getLobbyStatusConfig = (lobby) => {
    const status = computeLobbyStatus(lobby);
    const now = new Date();

    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          text: 'ממתין להפעלה',
          icon: Clock,
          timeInfo: null
        };
      case 'open':
        if (lobby.expires_at) {
          const timeRemaining = Math.ceil((new Date(lobby.expires_at) - now) / (1000 * 60)); // minutes
          const hours = Math.floor(timeRemaining / 60);
          const minutes = timeRemaining % 60;
          return {
            color: 'bg-green-100 text-green-700 border-green-200',
            text: 'פתוח להרשמה',
            icon: UserPlus,
            timeInfo: hours > 0 ? `${hours}ש ${minutes}ד נותרו` : `${minutes}ד נותרו`
          };
        }
        return {
          color: 'bg-green-100 text-green-700 border-green-200',
          text: 'פתוח להרשמה',
          icon: UserPlus,
          timeInfo: null
        };
      case 'open_indefinitely':
        return {
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          text: 'פתוח ללא הגבלת זמן',
          icon: UserPlus,
          timeInfo: null
        };
      case 'closed':
      default:
        return {
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          text: 'סגור',
          icon: Square,
          timeInfo: null
        };
    }
  };

  // Use real lobby data or show loading state
  const totalActiveSessions = lobbyData ? lobbyData.totalActiveSessions : 0;
  const totalOnlinePlayers = lobbyData ? lobbyData.totalOnlinePlayers : 0;

  // Get the most recent lobby regardless of status (prioritize active, then most recent)
  const activeLobby = lobbyData?.lobbies?.find(lobby =>
    computeLobbyStatus(lobby) === 'open' || computeLobbyStatus(lobby) === 'open_indefinitely'
  );

  // If no active lobby, get the most recent lobby (including closed ones)
  const mostRecentLobby = activeLobby ||
    (lobbyData?.lobbies?.length > 0 ? lobbyData.lobbies[0] : null);

  const statusConfig = mostRecentLobby ? getLobbyStatusConfig(mostRecentLobby) : {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    text: 'אין לובי',
    icon: Square,
    timeInfo: null
  };

  const currentStatus = mostRecentLobby ? computeLobbyStatus(mostRecentLobby) : 'no_lobby';
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Card className="group transition-all duration-300 bg-white border border-gray-200 hover:border-blue-300 hover:shadow-xl overflow-hidden">
        <CardHeader className="pb-4">
          {/* Game Icon and Title */}
          <div className="aspect-video bg-gradient-to-br from-blue-50 to-emerald-50 rounded-lg mb-4 flex items-center justify-center border border-gray-100">
            <BookOpen className="w-16 h-16 text-blue-500" />
          </div>
          <CardTitle className="text-gray-800 text-xl mb-3 leading-tight">{gameTitle}</CardTitle>

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
              <span className="text-gray-500 text-sm font-medium">
                {totalActiveSessions} / {maxPlayersPerSession} סשנים
              </span>
            </div>

            {/* Session Details */}
            {totalActiveSessions > 0 && !lobbyLoading && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">סשנים פעילים</span>
                  <span className="text-sm text-blue-600">{totalOnlinePlayers} שחקנים מחוברים</span>
                </div>
                {lobbyData && lobbyData.lobbies.length > 0 && (
                  <div className="space-y-1">
                    {Array.from({ length: totalActiveSessions }, (_, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">סשן {idx + 1}</span>
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
                    <Square className="w-4 h-4 text-orange-600" />
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
                  נהל סשנים פעילים ({totalActiveSessions})
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
                ניהול סשן {getProductTypeName('game', 'singular')}
              </h2>
              <p className="text-gray-600 mb-6">
                TODO: הוסף ממשק לניהול סשן {sessionId} עבור {getProductTypeName('game', 'singular')} {gameId}
                <br />
                <span className="text-sm">כולל רשימת תלמידים, מעקב התקדמות והגדרות הסשן</span>
              </p>
              <Button
                onClick={() => toast({
                  title: "בפיתוח",
                  description: "ממשק ניהול הסשן יתווסף בקרוב",
                  variant: "default"
                })}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                הגדרות סשן למידה
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}