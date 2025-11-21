import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GamepadIcon, PlayIcon, Home, Users, Clock, AlertCircle, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import GameTypeDisplay from '@/components/game/GameTypeDisplay';
import ProductImage from '@/components/ui/ProductImage';
import logoSm from '../../assets/images/logo_sm.png';
import socketClient, { useSocket } from '@/services/socketClient';
import { isLobbyJoinable, getLobbyStatusConfig } from '@/utils/lobbyUtils';
import { toast } from '@/components/ui/use-toast';

/**
 * Student lobby join page
 * Accessed via my.domain/lobby/{lobbyCode}
 * Validates lobby access and shows available sessions
 */
const LobbyJoin = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [lobbyData, setLobbyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [joining, setJoining] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [recentlyJoinedPlayers, setRecentlyJoinedPlayers] = useState(new Set());
  const [recentlyLeftPlayers, setRecentlyLeftPlayers] = useState(new Set());
  const [activityNotifications, setActivityNotifications] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [showAchievementAnimation, setShowAchievementAnimation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Helper function to determine if we can navigate back to teacher catalog
  const getBackNavigationInfo = () => {
    // Check if we have a teacher catalog referrer from state or URL patterns
    const fromState = location.state?.fromTeacherCatalog;
    const hasTeacherCode = location.state?.teacherCode;

    // Check if the previous URL in history suggests we came from a teacher catalog
    // Look for patterns like /portal/:teacherCode in the referrer
    const referrer = document.referrer;
    const teacherCatalogPattern = /\/portal\/([A-Z0-9]{8})/i;
    const referrerMatch = referrer.match(teacherCatalogPattern);

    // Check current browser history state for teacher context
    const currentPath = window.location.pathname;
    const canGoBack = window.history.length > 1;

    if (fromState || hasTeacherCode || referrerMatch) {
      return {
        canGoToTeacherCatalog: true,
        teacherCode: hasTeacherCode || (referrerMatch && referrerMatch[1]),
        navigationText: 'חזרה לקטלוג המורה'
      };
    }

    return {
      canGoToTeacherCatalog: false,
      navigationText: 'חזרה לעמוד הבית'
    };
  };

  // Handle smart navigation back
  const handleSmartNavigation = () => {
    const navInfo = getBackNavigationInfo();

    if (navInfo.canGoToTeacherCatalog && navInfo.teacherCode) {
      // Navigate to the specific teacher catalog
      navigate(`/portal/${navInfo.teacherCode}`);
    } else if (navInfo.canGoToTeacherCatalog) {
      // Try to go back in history (might be teacher catalog)
      navigate(-1);
    } else {
      // Navigate to student home page
      navigate('/');
    }
  };

  // Socket.IO integration for real-time updates
  const { connected: isConnected, onLobbyUpdate } = useSocket();

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

  // Enhanced function to refresh lobby data with join/leave animation tracking
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
        const newData = await response.json();

        // Track player join/leave animations if we have previous data
        if (lobbyData && lobbyData.sessions) {
          trackPlayerChanges(lobbyData.sessions, newData.sessions || []);
        }

        setLobbyData(newData);
        console.log('[LobbyJoin] Refreshed lobby data via Socket.IO');
      }
    } catch (error) {
      console.error('[LobbyJoin] Error refreshing lobby data:', error);
      // Don't update error state for Socket.IO refreshes, only log the error
    }
  };

  // Function to track player join/leave events for animations
  const trackPlayerChanges = (oldSessions, newSessions) => {
    const oldPlayerIds = new Set();
    const newPlayerIds = new Set();

    // Collect all player IDs from old sessions
    oldSessions.forEach(session => {
      session.participants?.forEach(participant => {
        oldPlayerIds.add(participant.id || participant.display_name);
      });
    });

    // Collect all player IDs from new sessions
    newSessions.forEach(session => {
      session.participants?.forEach(participant => {
        newPlayerIds.add(participant.id || participant.display_name);
      });
    });

    // Find newly joined players
    const joinedPlayers = new Set([...newPlayerIds].filter(id => !oldPlayerIds.has(id)));

    // Find players who left
    const leftPlayers = new Set([...oldPlayerIds].filter(id => !newPlayerIds.has(id)));

    // Update animation state and create notifications
    if (joinedPlayers.size > 0) {
      setRecentlyJoinedPlayers(joinedPlayers);
      console.log('[LobbyJoin] Players joined:', [...joinedPlayers]);

      // Create join notifications
      const joinNotifications = [...joinedPlayers].map(playerId => ({
        id: `join-${Date.now()}-${Math.random()}`,
        type: 'join',
        playerId,
        message: `${playerId} הצטרף למשחק! 🎉`,
        timestamp: Date.now()
      }));

      setActivityNotifications(prev => [...prev, ...joinNotifications]);

      // Clear animation after 3 seconds
      setTimeout(() => {
        setRecentlyJoinedPlayers(new Set());
      }, 3000);
    }

    if (leftPlayers.size > 0) {
      setRecentlyLeftPlayers(leftPlayers);
      console.log('[LobbyJoin] Players left:', [...leftPlayers]);

      // Create leave notifications
      const leaveNotifications = [...leftPlayers].map(playerId => ({
        id: `leave-${Date.now()}-${Math.random()}`,
        type: 'leave',
        playerId,
        message: `${playerId} עזב את המשחק 👋`,
        timestamp: Date.now()
      }));

      setActivityNotifications(prev => [...prev, ...leaveNotifications]);

      // Clear animation after 2 seconds
      setTimeout(() => {
        setRecentlyLeftPlayers(new Set());
      }, 2000);
    }
  };

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    const now = Date.now();
    const fiveSecondsAgo = now - 5000;

    setActivityNotifications(prev =>
      prev.filter(notification => notification.timestamp > fiveSecondsAgo)
    );
  }, [activityNotifications]);

  // Gamification: Generate achievements based on user activity
  useEffect(() => {
    if (!lobbyData || !displayName) return;

    const achievements = [];

    // First Time Joiner Badge
    if (!user?.id) {
      achievements.push({
        id: 'first_timer',
        type: 'achievement',
        title: 'שחקן חדש!',
        description: 'הצטרפת לראשונה למשחק',
        icon: '🎊',
        color: 'gold',
        rarity: 'common'
      });
    }

    // Speed Joiner Badge (if joining quickly)
    const fastJoinTime = 30000; // 30 seconds
    const timeOnPage = Date.now() - (window.lobbyJoinStartTime || Date.now());
    if (timeOnPage < fastJoinTime) {
      achievements.push({
        id: 'speed_joiner',
        type: 'achievement',
        title: 'מהיר כברק!',
        description: 'הצטרפת למשחק במהירות הבזק',
        icon: '⚡',
        color: 'yellow',
        rarity: 'rare'
      });
    }

    // Active Lobby Badge (if there are many participants)
    const participantsSummary = lobbyData.participantsSummary || { total: 0 };
    if (participantsSummary.total > 5) {
      achievements.push({
        id: 'popular_lobby',
        type: 'badge',
        title: 'לובי פופולרי!',
        description: 'הצטרפת للובי עם הרבה שחקנים',
        icon: '🔥',
        color: 'red',
        rarity: 'epic'
      });
    }

    // Weekend Warrior (simulation - could be based on real data)
    const isWeekend = [0, 6].includes(new Date().getDay());
    if (isWeekend) {
      achievements.push({
        id: 'weekend_warrior',
        type: 'badge',
        title: 'לוחם סופ"ש!',
        description: 'משחק בסוף השבוע',
        icon: '🏆',
        color: 'purple',
        rarity: 'legendary'
      });
    }

    setUserAchievements(achievements);

    // Trigger achievement animation if new achievements were earned
    if (achievements.length > 0) {
      setShowAchievementAnimation(true);
      setTimeout(() => setShowAchievementAnimation(false), 3000);
    }

  }, [lobbyData, displayName, user]);

  // Track when user enters the page for speed achievements
  useEffect(() => {
    if (!window.lobbyJoinStartTime) {
      window.lobbyJoinStartTime = Date.now();
    }
  }, []);

  // Mobile and Reduced Motion Detection
  useEffect(() => {
    // Detect mobile devices
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Detect reduced motion preference
    const checkReducedMotion = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
    };

    // Initial checks
    checkMobile();
    checkReducedMotion();

    // Listen for changes
    window.addEventListener('resize', checkMobile);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', checkReducedMotion);

    return () => {
      window.removeEventListener('resize', checkMobile);
      mediaQuery.removeEventListener('change', checkReducedMotion);
    };
  }, []);

  // Socket.IO event handlers for real-time updates
  useEffect(() => {
    if (!lobbyData) return; // No lobby data yet, nothing to listen for

    const handleLobbyEvent = (eventData) => {
      console.log('[LobbyJoin] Received lobby event:', eventData);

      // Check if this event is for our lobby
      const lobbyId = eventData?.id || eventData?.lobby_id;
      if (lobbyId === lobbyData.lobby?.id) {
        // Refresh lobby data for lobby status changes
        refreshLobbyData();
      }
    };

    const handleSessionEvent = (eventData) => {
      console.log('[LobbyJoin] Received session event:', eventData);

      // Check if this session event is for sessions in our lobby
      const sessionId = eventData?.id || eventData?.session_id;
      const lobbyId = eventData?.lobby_id;
      const sessions = lobbyData.sessions || [];

      // Check if this event is related to our lobby (either by session ID or lobby ID)
      if ((sessionId && sessions.some(session => session.id === sessionId)) ||
          (lobbyId === lobbyData.lobby?.id)) {
        // Refresh lobby data for participant count updates
        refreshLobbyData();
      }
    };

    // Register Socket.IO event handlers for lobby events
    const cleanupLobbyActivated = onLobbyUpdate('lobby:lobby_activated', handleLobbyEvent);
    const cleanupLobbyClosed = onLobbyUpdate('lobby:lobby_closed', handleLobbyEvent);
    const cleanupLobbyExpired = onLobbyUpdate('lobby:lobby_expired', handleLobbyEvent);

    // Register Socket.IO event handlers for session events that affect participant counts
    const cleanupSessionCreated = onLobbyUpdate('lobby:session_created', handleSessionEvent);
    const cleanupSessionParticipantJoined = onLobbyUpdate('lobby:participant_joined', handleSessionEvent);
    const cleanupSessionParticipantLeft = onLobbyUpdate('lobby:participant_left', handleSessionEvent);
    const cleanupSessionStarted = onLobbyUpdate('lobby:session_started', handleSessionEvent);
    const cleanupSessionFinished = onLobbyUpdate('lobby:session_finished', handleSessionEvent);

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
  }, [lobbyData, onLobbyUpdate, code, user]);

  // Show Socket.IO connection status in console for debugging
  useEffect(() => {
    if (lobbyData?.lobby?.id) {
      console.log(`[LobbyJoin] Socket.IO ${isConnected ? 'connected' : 'disconnected'} for lobby ${code}`);
    }
  }, [isConnected, code, lobbyData]);

  const handleJoinLobby = async () => {
    if (!displayName.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין שם תצוגה",
        variant: "destructive"
      });
      return;
    }

    if (lobbyData.settings.invitation_type === 'manual_selection' && !selectedSession) {
      toast({
        title: "שגיאה",
        description: "נא לבחור חדר",
        variant: "destructive"
      });
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
      toast({
        title: "שגיאה בהצטרפות",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setJoining(false);
    }
  };

  const handleCreateSession = async () => {
    if (!displayName.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין שם תצוגה לפני יצירת חדר",
        variant: "destructive"
      });
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
      toast({
        title: "שגיאה ביצירת חדר",
        description: err.message,
        variant: "destructive"
      });
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
            onClick={handleSmartNavigation}
            className="student-btn-primary student-float"
          >
            <Home className="w-5 h-5 ml-2" />
            {getBackNavigationInfo().navigationText}
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
    <div
      className="min-h-screen student-immersive-background relative overflow-hidden"
      role="main"
      aria-label="lobby join page"
    >
      {/* Immersive Background Effects */}
      <div className="student-background-particles">
        {/* Floating Elements */}
        <div className="student-floating-element student-float" style={{top: '10%', left: '5%', animationDelay: '0s'}}>
          <GamepadIcon className="w-8 h-8 text-white/20" />
        </div>
        <div className="student-floating-element student-float" style={{top: '60%', left: '85%', animationDelay: '1s'}}>
          <Users className="w-6 h-6 text-white/15" />
        </div>
        <div className="student-floating-element student-float" style={{top: '80%', left: '15%', animationDelay: '2s'}}>
          <PlayIcon className="w-7 h-7 text-white/25" />
        </div>
        <div className="student-floating-element student-float" style={{top: '25%', left: '75%', animationDelay: '0.5s'}}>
          <Clock className="w-5 h-5 text-white/20" />
        </div>

        {/* Animated Light Orbs */}
        <div className="student-light-orb student-pulse" style={{top: '20%', right: '10%', animationDelay: '0s'}}></div>
        <div className="student-light-orb student-pulse" style={{top: '70%', left: '10%', animationDelay: '1.5s'}}></div>
        <div className="student-light-orb student-pulse" style={{top: '45%', right: '25%', animationDelay: '3s'}}></div>

        {/* Gradient Overlay for Depth */}
        <div className="student-background-overlay"></div>

        {/* Dynamic Geometric Shapes */}
        <div className="student-geometric-shape student-rotate" style={{top: '15%', left: '20%', animationDelay: '0s'}}></div>
        <div className="student-geometric-shape student-rotate" style={{top: '55%', right: '15%', animationDelay: '2s'}}></div>
        <div className="student-geometric-shape student-rotate" style={{top: '75%', left: '60%', animationDelay: '4s'}}></div>
      </div>

      {/* Content with Glassmorphism - Mobile Optimized */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10">
        {/* Gamification Achievement Panel - Accessible */}
        {userAchievements.length > 0 && (
          <section
            className={`mb-6 ${showAchievementAnimation ? 'student-achievement-celebration' : ''}`}
            aria-label="achievements section"
            role="region"
          >
            <div className="student-glass-card p-4">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center student-glow"
                  aria-hidden="true"
                >
                  <span className="text-xl">🏆</span>
                </div>
                <h2 className="text-lg font-bold student-text-gradient">ההישגים שלך</h2>
                <div className="student-achievement-counter student-pulse">
                  <span className="font-bold text-yellow-600">{userAchievements.length}</span>
                  <span className="text-sm text-gray-500 mr-1">הישגים</span>
                </div>
              </div>

              <div
                className="flex flex-wrap gap-2 sm:gap-3"
                role="list"
                aria-label="earned achievements"
              >
                {userAchievements.map((achievement, index) => (
                  <div
                    key={achievement.id}
                    className={`student-achievement-badge student-achievement-${achievement.color} ${
                      achievement.rarity === 'legendary' ? 'student-legendary-glow' :
                      achievement.rarity === 'epic' ? 'student-epic-glow' :
                      achievement.rarity === 'rare' ? 'student-rare-glow' : ''
                    } ${showAchievementAnimation ? 'student-achievement-earned' : ''}`}
                    style={{
                      animationDelay: reducedMotion ? '0s' : `${index * 0.2}s`
                    }}
                    title={achievement.description}
                    role="listitem"
                    aria-label={`${achievement.title} achievement: ${achievement.description}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        // Could trigger achievement detail modal
                        e.preventDefault();
                      }
                    }}
                  >
                    <div className="student-achievement-icon student-bounce">
                      <span className="text-2xl">{achievement.icon}</span>
                    </div>
                    <div className="student-achievement-content">
                      <div className="font-bold text-sm">{achievement.title}</div>
                      <div className="text-xs text-gray-600">{achievement.description}</div>
                    </div>

                    {/* Rarity indicator */}
                    <div className={`student-rarity-indicator student-rarity-${achievement.rarity}`}>
                      {achievement.rarity === 'legendary' && '✨'}
                      {achievement.rarity === 'epic' && '💎'}
                      {achievement.rarity === 'rare' && '🌟'}
                      {achievement.rarity === 'common' && '⭐'}
                    </div>

                    {/* Achievement sparkle effect */}
                    {showAchievementAnimation && (
                      <div className="student-achievement-sparkle student-sparkle"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Achievement progress bar */}
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">התקדמות למשחק</span>
                  <span className="font-bold text-purple-600">
                    {Math.min(userAchievements.length * 25, 100)}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="student-progress-bar h-2 rounded-full student-glow"
                    style={{
                      width: `${Math.min(userAchievements.length * 25, 100)}%`
                    }}
                  ></div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  צבור עוד הישגים כשתשחק במשחקים שונים!
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Game Info with Lobby Code - Enhanced with Glassmorphism */}
        <section aria-label="game information and lobby code">
          <Card className="student-glass-card mb-6">
            <CardContent className="p-6">
              {/* Enhanced Lobby Code Ticket with Mobile Optimization */}
              <div
                className="student-lobby-ticket text-center mb-6 sm:mb-8 student-fade-in-up"
                role="banner"
                aria-label="lobby code display"
              >
              {/* Decorative Top Elements - Mobile Responsive */}
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/30 rounded-full flex items-center justify-center">
                  <GamepadIcon className="w-3 h-3 sm:w-5 sm:h-5" />
                </div>
                <div className="flex gap-1 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/40 rounded-full student-pulse"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/40 rounded-full student-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/40 rounded-full student-pulse" style={{animationDelay: '1s'}}></div>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/30 rounded-full flex items-center justify-center">
                  <PlayIcon className="w-3 h-3 sm:w-5 sm:h-5" />
                </div>
              </div>

              {/* Main Lobby Code Display - Mobile Responsive */}
              <div className="relative">
                <h1
                  className="text-4xl sm:text-6xl font-black tracking-wider mb-2 text-white drop-shadow-lg"
                  aria-label={`lobby code: ${lobby.lobby_code}`}
                  id="lobby-code-display"
                >
                  {lobby.lobby_code}
                </h1>
                <div className="absolute -inset-2 bg-white/10 rounded-2xl blur-xl" aria-hidden="true"></div>
              </div>

              <p className="text-lg font-semibold text-white/90 mb-4" aria-describedby="lobby-code-display">
                קוד הלובי שלכם
              </p>

              {/* Enhanced Status Display with Dynamic Classes */}
              <div className="flex items-center justify-center gap-3">
                {(() => {
                  const { icon, text, timeInfo } = getStatusDisplay(lobby);

                  // Determine dynamic status class based on lobby state
                  let statusClass = 'student-status-active';
                  if (lobby.status === 'pending' || lobby.status === 'waiting') {
                    statusClass = 'student-status-waiting';
                  } else if (lobby.status === 'closed') {
                    statusClass = 'student-status-expired';
                  } else if (participantsSummary.total >= lobby.settings.max_players) {
                    statusClass = 'student-status-full';
                  }

                  return (
                    <div className={`student-status-indicator ${statusClass}`}>
                      <div className="student-status-icon">{icon}</div>
                      <span className="font-bold">{text}</span>
                      {timeInfo && (
                        <span className="student-status-time">
                          {timeInfo}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Copy Code Feature - Mobile Optimized with Accessibility */}
              <div className="mt-4 sm:mt-6 flex justify-center">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(lobby.lobby_code);
                    toast({
                      title: "קוד הועתק!",
                      description: "הקוד הועתק ללוח. שתפו עם חברים!",
                      variant: "default"
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.currentTarget.click();
                    }
                  }}
                  className="student-btn-explosive text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-2 active:scale-95 transition-transform focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                  aria-label={`copy lobby code ${lobby.lobby_code} to clipboard`}
                  title="העתק את קוד הלובי ללוח"
                >
                  העתק קוד 📋
                </button>
              </div>

              {/* Decorative Bottom Border */}
              <div className="mt-6 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" aria-hidden="true"></div>
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
              {/* Game Image - Mobile Responsive */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-400 via-blue-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
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

                  {/* Enhanced Player Counter with Dynamic Animation */}
                  <div className="student-player-counter">
                    <div className="student-player-counter-icon">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="student-player-counter-display">
                      <span className="student-player-count-current student-glow">{participantsSummary.total}</span>
                      <span className="student-player-count-separator">/</span>
                      <span className="student-player-count-max">{lobby.settings.max_players}</span>
                      <span className="student-player-count-label">שחקנים</span>
                    </div>

                    {/* Player Status Indicators */}
                    <div className="flex items-center gap-1 mr-2">
                      {participantsSummary.total >= lobby.settings.max_players ? (
                        <div className="w-2 h-2 bg-red-500 rounded-full student-pulse"></div>
                      ) : participantsSummary.total > 0 ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full student-pulse"></div>
                      ) : (
                        <div className="w-2 h-2 bg-yellow-500 rounded-full student-pulse"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </section>

        {/* Real-Time Activity Notifications - Mobile Optimized */}
        {activityNotifications.length > 0 && (
          <div className="fixed top-4 right-2 sm:right-4 left-2 sm:left-auto z-50 space-y-2">
            {activityNotifications.map(notification => (
              <div
                key={notification.id}
                className={`student-glass-notification ${
                  notification.type === 'join' ? 'student-notification-join' : 'student-notification-leave'
                } student-slideInRight`}
                style={{
                  animationDelay: `${activityNotifications.indexOf(notification) * 0.1}s`
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar representation */}
                  <div className={`student-notification-avatar ${
                    notification.type === 'join' ? 'student-avatar-joining' : 'student-avatar-leaving'
                  }`}>
                    {notification.playerId.charAt(0)}

                    {/* Animated status dot */}
                    <div className={`student-notification-status ${
                      notification.type === 'join' ? 'bg-green-400 student-pulse' : 'bg-gray-400 student-fadeOut'
                    }`}></div>

                    {/* Sparkle effect for joins */}
                    {notification.type === 'join' && (
                      <div className="student-notification-sparkle student-sparkle"></div>
                    )}
                  </div>

                  {/* Notification message */}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-1">
                      {notification.message}
                    </p>
                    <div className="text-xs text-white/70">
                      {new Date(notification.timestamp).toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Animated icon */}
                  <div className={`student-notification-icon ${
                    notification.type === 'join' ? 'student-bounce' : 'student-fadeOut'
                  }`}>
                    {notification.type === 'join' ? (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar showing notification lifetime */}
                <div className="student-notification-progress">
                  <div className="student-notification-progress-bar"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join Form - Enhanced with Glassmorphism and Accessibility */}
        <section aria-label="join game form">
          <Card className="student-glass-card mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">הצטרפות למשחק</h2>

            {/* Display Name Input - Accessible */}
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
                className="student-glass-input focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                maxLength="30"
                aria-required="true"
                aria-describedby="displayName-help"
                autoComplete="name"
              />
              <div id="displayName-help" className="text-xs text-gray-500 mt-1">
                השם יופיע לשחקנים אחרים במשחק (עד 30 תווים)
              </div>
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      {availableSessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className={`student-glass-button ${
                            selectedSession?.id === session.id
                              ? 'student-glass-button-selected'
                              : 'student-glass-button-hover'
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

            {/* Join Button - Mobile Optimized */}
            <Button
              onClick={handleJoinLobby}
              disabled={joining || !displayName.trim() || (isManualSelection && !selectedSession)}
              className="w-full student-btn-primary py-4 sm:py-3 text-lg sm:text-base font-bold active:scale-95 transition-transform touch-manipulation"
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
        </section>

        {/* Enhanced Active Sessions Display - Enhanced with Glassmorphism */}
        {sessions.length > 0 && (
          <Card className="student-glass-card student-fade-in-up">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold student-text-gradient">חדרי משחק פעילים</h3>
                <div className="student-session-counter">
                  <span className="font-bold text-purple-600">{sessions.length}</span>
                  <span className="text-sm text-gray-500 mr-1">חדרים</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {sessions.map((session, index) => {
                  const participantCount = session.participants?.length || 0;
                  const isSessionFull = participantCount >= lobby.settings.max_players;

                  // Determine session status class
                  let sessionStatusClass = 'student-status-active';
                  if (session.status === 'pending' || session.status === 'waiting') {
                    sessionStatusClass = 'student-status-waiting';
                  } else if (session.status === 'finished' || session.status === 'closed') {
                    sessionStatusClass = 'student-status-expired';
                  } else if (isSessionFull) {
                    sessionStatusClass = 'student-status-full';
                  }

                  return (
                    <div
                      key={session.id}
                      className="student-immersive-card"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="student-room-icon">
                              <GamepadIcon className="w-4 h-4" />
                            </div>
                            <h4 className="font-bold text-gray-800">
                              חדר {session.session_number || session.id.slice(-4)}
                            </h4>
                          </div>

                          {/* Enhanced Session Player Counter */}
                          <div className="student-player-counter mb-3">
                            <div className="student-player-counter-icon">
                              <Users className="w-3 h-3" />
                            </div>
                            <div className="student-player-counter-display text-sm">
                              <span className="student-player-count-current">{participantCount}</span>
                              <span className="student-player-count-separator">/</span>
                              <span className="student-player-count-max">{lobby.settings.max_players}</span>
                              <span className="student-player-count-label">שחקנים</span>
                            </div>

                            {/* Session availability indicator */}
                            <div className="flex items-center gap-1 mr-2">
                              {isSessionFull ? (
                                <div className="w-2 h-2 bg-red-500 rounded-full student-pulse"></div>
                              ) : participantCount > 0 ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full student-pulse"></div>
                              ) : (
                                <div className="w-2 h-2 bg-yellow-500 rounded-full student-pulse"></div>
                              )}
                            </div>
                          </div>

                          {/* Enhanced Session participant avatars with join/leave animations */}
                          {session.participants && session.participants.length > 0 && (
                            <div className="student-avatar-stack">
                              {session.participants.slice(0, 3).map((participant, idx) => {
                                const participantId = participant.id || participant.display_name;
                                const isRecentlyJoined = recentlyJoinedPlayers.has(participantId);
                                const isRecentlyLeft = recentlyLeftPlayers.has(participantId);

                                return (
                                  <div
                                    key={participant.id || idx}
                                    className={`student-player-avatar ${
                                      isRecentlyJoined ? 'student-avatar-joining student-zoomIn' : ''
                                    } ${
                                      isRecentlyLeft ? 'student-avatar-leaving student-fadeOut' : ''
                                    }`}
                                    title={participant.display_name || `שחקן ${idx + 1}`}
                                    style={{
                                      animationDelay: isRecentlyJoined ? `${idx * 0.2}s` : '0s'
                                    }}
                                  >
                                    {/* Welcome sparkle animation for new players */}
                                    {isRecentlyJoined && (
                                      <div className="student-avatar-sparkle student-sparkle"></div>
                                    )}

                                    {participant.display_name?.charAt(0) || '?'}

                                    {/* Online status indicator */}
                                    <div className="student-avatar-status">
                                      <div className={`w-3 h-3 rounded-full ${
                                        isRecentlyJoined ? 'bg-green-400 student-pulse' :
                                        isRecentlyLeft ? 'bg-gray-400' :
                                        'bg-green-500'
                                      }`}></div>
                                    </div>
                                  </div>
                                );
                              })}

                              {session.participants.length > 3 && (
                                <div className="student-player-avatar student-avatar-overflow student-bounce">
                                  +{session.participants.length - 3}

                                  {/* Activity indicator for overflow counter */}
                                  {session.participants.slice(3).some(p =>
                                    recentlyJoinedPlayers.has(p.id || p.display_name)
                                  ) && (
                                    <div className="student-overflow-activity student-glow"></div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Empty state with invitation animation */}
                          {(!session.participants || session.participants.length === 0) && (
                            <div className="student-avatar-stack">
                              <div className="student-player-avatar student-avatar-empty student-pulse">
                                <Plus className="w-3 h-3 text-gray-400" />
                              </div>
                              <div className="text-xs text-gray-500 mr-2 student-fade-in">
                                חכה לשחקנים...
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Enhanced Session Status */}
                        <div className={`student-status-indicator ${sessionStatusClass} text-xs`}>
                          {(() => {
                            const sessionAsLobby = { status: session.status };
                            const { icon, text, timeInfo } = getStatusDisplay(sessionAsLobby);
                            return (
                              <>
                                <div className="student-status-icon">{icon}</div>
                                <span className="font-medium">{text}</span>
                                {timeInfo && (
                                  <span className="student-status-time text-xs">
                                    {timeInfo}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default LobbyJoin;