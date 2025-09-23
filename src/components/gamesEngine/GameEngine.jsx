
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  Home,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  Clock
} from 'lucide-react';

// Import placeholder game components
import ScatterGame from './gameTypes/ScatterGame';
import WisdomMaze from './gameTypes/WisdomMaze';
import SharpAndSmooth from './gameTypes/SharpAndSmooth';
import MemoryGame from './gameTypes/MemoryGame';
import ArUpThere from './gameTypes/ArUpThere';

export default function GameEngine({ game, gameData, user, onGameComplete, onExit }) {
  // Safety check for game prop
  if (!game) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">טוען נתוני משחק...</p>
        </CardContent>
      </Card>
    );
  }

  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [gameTime, setGameTime] = useState(0); // in seconds
  const [isGameStarted, setIsGameStarted] = useState(true); // Start immediately when GameEngine loads
  const [showHints, setShowHints] = useState(false);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Session tracking
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [guestIP, setGuestIP] = useState(null); // State for guest IP, if no user prop provided
  const [audioEnabled, setAudioEnabled] = useState(true); // Internal state for audio
  const [sessionInitiated, setSessionInitiated] = useState(false); // Flag to ensure session starts only once per game instance
  const [sessionCreated, setSessionCreated] = useState(false); // Add new flag to prevent duplicates
  const [gameCompleted, setGameCompleted] = useState(false); // Retained to control GameComplete screen
  const [gameScore, setGameScore] = useState(0);

  // Game content structure based on types
  const [gameContents, setGameContents] = useState({
    words: [],
    questions: [],
    images: [],
    audio: [],
    video: [],
    text: []
  });

  // Helper to safely extract text from word objects or convert primitives to string
  const getWordText = useCallback((word) => {
    return (word && typeof word === 'object' && 'text' in word) ? word.text : String(word);
  }, []);

  // Use gameData.gameWords instead of gameWords prop
  const gameWords = useMemo(() => gameData?.gameWords || [], [gameData]);

  console.log('🎮 GameEngine received gameWords (from gameData):', gameWords.map(getWordText));
  console.log('🎮 GameEngine gameWords length (from gameData):', gameWords.length);

  // Load guest IP for anonymous users if 'user' prop is not provided
  useEffect(() => {
    const fetchGuestIP = async () => {
      // Only fetch if no user prop is provided and guestIP hasn't been set yet
      if (!user && !guestIP) {
        try {
          const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          setGuestIP(data.ip);
        } catch (ipError) {
          console.warn('Could not get guest IP:', ipError);
        }
      }
    };
    fetchGuestIP();
  }, [user, guestIP]); // Depend on user prop and guestIP state

  // Check fullscreen support on mount
  useEffect(() => {
    const elem = document.documentElement;
    const supported = !!(
      elem.requestFullscreen ||
      elem.webkitRequestFullscreen ||
      elem.mozRequestFullScreen ||
      elem.msRequestFullscreen
    );
    setIsFullscreenSupported(supported);
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Timer effect - starts immediately when component loads
  useEffect(() => {
    if (isGameStarted && !isPaused && !showPauseMenu && !gameCompleted) {
      timerRef.current = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
      console.log('🎮 Timer started');
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        console.log('🎮 Timer stopped');
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isGameStarted, isPaused, showPauseMenu, gameCompleted]);

  // Background music - try auto-play, if blocked set audioEnabled to false
  useEffect(() => {
    const currentAudioElement = audioRef.current;

    const handleBgError = (e) => {
      const errorMessage = e.target?.error?.message ||
                           e.message ||
                           `Background audio load failed: ${e.target?.src || 'unknown'}`;
      console.error('Background audio error:', errorMessage);
    };

    if (currentAudioElement) {
      currentAudioElement.addEventListener('error', handleBgError);
    }

    const loadBackgroundMusic = async () => {
      if (!currentAudioElement) {
        console.warn('Audio ref not available, skipping background music loading');
        return;
      }

      if (!gameCompleted) { // Don't play if game is completed
        try {
          const { GameAudioSettings, AudioFile } = await import('@/services/entities');

          let audioFileId = null;

          const gameSettings = await GameAudioSettings.filter({ game_type: game.game_type });
          if (gameSettings && gameSettings.length > 0 && gameSettings[0].background_music) {
            audioFileId = gameSettings[0].background_music;
          } else {
            const generalSettings = await GameAudioSettings.filter({ game_type: 'general' });
            if (generalSettings && generalSettings.length > 0 && generalSettings[0].background_music) {
              audioFileId = generalSettings[0].background_music;
            }
          }

          if (audioFileId) {
            const audioFiles = await AudioFile.filter({ id: audioFileId });
            if (audioFiles && audioFiles.length > 0) {
              const audioFile = audioFiles[0];
              
              currentAudioElement.src = audioFile.file_url;
              currentAudioElement.loop = true;
              currentAudioElement.volume = audioFile.volume || 0.7;
              
              // Try auto-play, if fails set audioEnabled to false
              try {
                console.log('🎵 Trying to auto-play background music');
                await currentAudioElement.play();
                console.log('🎵 Background music auto-play successful');
              } catch (playError) {
                if (playError.name === 'NotAllowedError' || playError.name === 'AbortError') {
                  console.log('🎵 Background music auto-play blocked, setting audio to disabled');
                  setAudioEnabled(false); // This will update the toggle button to show muted state
                } else {
                  console.error('Background audio play error:', playError.message);
                }
              }
            }
          } else {
            currentAudioElement.pause();
            currentAudioElement.src = '';
          }
        } catch (error) {
          console.error('Error loading background music:', error.message || error);
          if (currentAudioElement) {
            currentAudioElement.pause();
            currentAudioElement.src = '';
          }
        }
      } else {
        if (currentAudioElement) {
          currentAudioElement.pause();
          currentAudioElement.src = '';
        }
      }
    };

    loadBackgroundMusic();

    return () => {
      if (currentAudioElement) {
        currentAudioElement.removeEventListener('error', handleBgError);
        currentAudioElement.pause();
        currentAudioElement.src = '';
      }
    };
  }, [game.game_type, gameCompleted]);

  // Handle manual audio toggle
  useEffect(() => {
    const currentAudioElement = audioRef.current;
    if (!currentAudioElement || gameCompleted) return;

    if (audioEnabled) {
      // Only play if there's a source loaded
      if (currentAudioElement.src) {
        console.log('🎵 User manually enabled background music');
        currentAudioElement.play().catch(error => {
          console.error('Manual background music play failed:', error.message);
        });
      }
    } else {
      currentAudioElement.pause();
    }
  }, [audioEnabled, gameCompleted]);

  // Game settings will be handled by individual game components
  // const getGameSettings = useMemo(() => {
  //   try {
  //     if (game.game_settings) {
  //       return typeof game.game_settings === 'string' ? JSON.parse(game.game_settings) : game.game_settings;
  //     }
  //   } catch (e) {
  //     console.error('Error parsing game settings:', e, 'Raw settings:', game.game_settings);
  //   }
  //   return {};
  // }, [game.game_settings]);

  // Function to start a game session
  const startGameSession = useCallback(async () => {
    if (sessionStartTime || sessionCreated) return; // Already started or created
    
    setSessionCreated(true); // Set flag immediately to prevent race conditions
    
    try {
      const { GameSession } = await import('@/services/entities');
      
      const sessionData = {
        user_id: user?.id || null, // Use the user prop
        guest_ip: !user?.id ? guestIP : null, // Use guestIP state or null if not guest
        game_id: game.id,
        game_type: game.game_type,
        session_start_time: new Date().toISOString(),
        session_data: JSON.stringify({
          initial_words: gameWords.map(getWordText),
          word_count: gameWords.length
        })
      };

      console.log('🎮 Creating game session:', sessionData);
      const session = await GameSession.create(sessionData);
      console.log('✅ Game session created:', session.id);
      
      setSessionStartTime(sessionData.session_start_time); // Store the exact start time used
    } catch (error) {
      console.error('❌ Error starting game session:', error);
      setSessionCreated(false); // Reset flag on error so it can try again
    }
  }, [game?.id, game?.game_type, gameWords, user, sessionStartTime, guestIP, sessionCreated, getWordText]);

  // Function to end a game session
  const endGameSession = useCallback(async (exitReason = 'completed', finalData = {}) => {
    if (!sessionStartTime) return; // Make sure there's an active session to end
    
    try {
      const { GameSession } = await import('@/services/entities');
      
      const endTime = new Date();
      const startTime = new Date(sessionStartTime);
      const durationSeconds = Math.floor((endTime - startTime) / 1000);
      
      // Find the session to update based on user/guest_ip, game, and start time
      let filterCriteria = {
        game_id: game.id,
        session_start_time: sessionStartTime,
      };

      if (user?.id) { // Use user prop
        filterCriteria.user_id = user.id;
      } else {
        filterCriteria.guest_ip = guestIP || null; 
      }

      const sessions = await GameSession.filter(filterCriteria);

      if (sessions.length > 0) {
        const session = sessions[0];
        
        // Parse existing session_data to merge new info
        const existingSessionData = JSON.parse(session.session_data || '{}');

        const wordsFoundCount = finalData.words_found || gameContents.words.length;
        const currentScore = finalData.score || gameScore;
        const completion = gameWords.length > 0 ? Math.round((wordsFoundCount / gameWords.length) * 100) : 0;

        const updateData = {
          session_end_time: endTime.toISOString(),
          duration_seconds: durationSeconds,
          exit_reason: exitReason,
          completed: exitReason === 'completed',
          score: currentScore,
          session_data: JSON.stringify({
            ...existingSessionData, // Preserve initial data
            words_found: wordsFoundCount,
            final_score: currentScore,
            completion_percentage: completion
          })
        };

        console.log('🏁 Ending game session:', session.id, updateData);
        await GameSession.update(session.id, updateData);
        console.log('✅ Game session updated successfully');
      } else {
        console.warn('⚠️ No session found to update for criteria:', filterCriteria);
      }
    } catch (error) {
      console.error('❌ Error ending game session:', error);
    }
    // Clear sessionStartTime to allow a new session to be started
    setSessionStartTime(null);
    setSessionCreated(false); // Reset flag
  }, [sessionStartTime, user, game.id, gameScore, gameContents, guestIP]);

  // New function to handle game completion from child component
  const handleGameComplete = useCallback((finalStats) => {
    setGameCompleted(true); // Trigger GameComplete screen display
    clearInterval(timerRef.current);
    timerRef.current = null;
    setIsPaused(true);
    setShowPauseMenu(false);
    setIsGameStarted(false); // Game is no longer "started" in the active sense
    
    console.log('🏆 Game completed, ending session and notifying parent');
    endGameSession('completed', finalStats); // Use finalStats from ScatterGame

    if (onGameComplete) { // Notify parent component
      onGameComplete(finalStats);
    }
  }, [endGameSession, onGameComplete]);

  // Start session automatically when game loads (not waiting for first interaction)
  useEffect(() => {
    // Ensure game and words are loaded, and a session hasn't already started
    if (game && gameWords.length > 0 && !sessionStartTime && !sessionCreated) {
      console.log('🎮 Auto-starting game session on load');
      startGameSession();
    }
  }, [game, gameWords.length, sessionStartTime, sessionCreated, startGameSession]);

  // Handler for the very first interaction with the game board
  const handleFirstInteraction = useCallback(() => {
    if (!sessionInitiated) {
      setSessionInitiated(true);
      console.log('🎮 First interaction recorded');
    }
  }, [sessionInitiated]);

  // Handle page unload/close
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (sessionStartTime && !gameCompleted) { // Only end if game not already completed
        endGameSession('page_close', {
          words_found: gameContents.words.length,
          score: gameScore
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && sessionStartTime && !gameCompleted) { // Only end if game not already completed
        endGameSession('user_exit', {
          words_found: gameContents.words.length,
          score: gameScore
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionStartTime, gameContents.words.length, gameScore, endGameSession, gameCompleted]);

  const toggleFullscreen = async () => {
    if (!isFullscreenSupported) return;

    try {
      if (!isFullscreen) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const togglePause = () => {
    setShowPauseMenu(!showPauseMenu);
    setIsPaused(!isPaused);
    setShowHints(false);
  };

  // Internal toggle for audio
  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
  };

  const toggleHints = () => {
    setShowHints(!showHints);
    setShowPauseMenu(false);
    setIsPaused(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const restartGame = useCallback(() => {
    // End current session before starting a new one
    if (sessionStartTime) {
        endGameSession('restarted', {
            words_found: gameContents.words.length,
            score: gameScore
        });
    }

    setGameTime(0); // Reset timer
    setIsPaused(false);
    setShowPauseMenu(false);
    setIsGameStarted(true); // Restart timer immediately
    setShowHints(false);
    setGameCompleted(false); // Reset game completed status
    setGameScore(0);
    // Reset game contents if needed
    setGameContents({
      words: [],
      questions: [],
      images: [],
      audio: [],
      video: [],
      text: []
    });
    setSessionInitiated(false); // Allows a new session to be started if it's auto-started
    // sessionStartTime is set to null by endGameSession
    // sessionCreated is set to false by endGameSession
    
    // No onReloadWords prop anymore. Game words are expected from gameData.
    // If the words need to change, the parent component must update gameData.
    
    // Game restart logic will be handled by individual game components
  }, [sessionStartTime, endGameSession, gameContents, gameScore]);

  // Custom exit handler to include session ending
  const handleExit = useCallback(() => {
    if (sessionStartTime && !gameCompleted) { // Only end if game not already completed
        endGameSession('user_exit', {
            words_found: gameContents.words.length,
            score: gameScore
        });
    } // sessionStartTime is set to null by endGameSession after it's called
      // sessionCreated is set to false by endGameSession
    onExit(); // This prop is from the parent
  }, [endGameSession, onExit, sessionStartTime, gameContents, gameScore, gameCompleted]);

  // If game is completed, show completion screen
  if (gameCompleted) {
    const GameComplete = React.lazy(() => import('./GameComplete'));

    const sessionDurationSeconds = gameTime; // Use gameTime instead of calculating from sessionStartTime
    const completionPercentage = gameWords.length > 0 ? Math.round((gameContents.words.length / gameWords.length) * 100) : 0;

    return (
      <React.Suspense fallback={<div>טוען...</div>}>
        <GameComplete
          foundWords={gameContents.words}
          totalWords={gameWords.length}
          score={gameScore}
          sessionDuration={sessionDurationSeconds}
          completionPercentage={completionPercentage}
          onPlayAgain={restartGame}
          onExit={handleExit}
        />
      </React.Suspense>
    );
  }

  const renderGame = () => {
    const actualGameData = gameData || game; // Support both gameData and game props
    const gameType = actualGameData?.game_type;
    // Game title is now handled by individual game components
    const isPreviewMode = actualGameData?.isPreviewMode || actualGameData?.id === 'preview';

    // Game components are now imported and rendered directly

    switch (gameType) {
      case 'scatter_game':

        // TODO: Uncomment when ScatterGame is properly implemented
        // return (
        //   <ScatterGame
        //     Game component ref not needed with new structure
        //     game={actualGameData}
        //     gameSettings={getGameSettings}
        //     isPaused={isPaused || showPauseMenu}
        //     showHints={showHints}
        //     gameWords={gameWords}
        //     onFirstInteraction={handleFirstInteraction}
        //     onGameUpdate={({ foundWords, score }) => {
        //         // Update game contents when words are found
        //         setGameScore(score);
        //     }}
        //     onGameComplete={handleGameComplete}
        //     onGameEnd={onExit}
        //   />
        // );
        return (
          <ScatterGame
            gameContents={gameContents}
            isPreviewMode={isPreviewMode}
            onGameUpdate={(data) => setGameScore(data.score || 0)}
            onGameComplete={handleGameComplete}
            onFirstInteraction={handleFirstInteraction}
            isPaused={isPaused || showPauseMenu}
            showHints={showHints}
          />
        );

      case 'wisdom_maze':
        return (
          <WisdomMaze
            gameContents={gameContents}
            isPreviewMode={isPreviewMode}
            onGameUpdate={(data) => setGameScore(data.score || 0)}
            onGameComplete={handleGameComplete}
            onFirstInteraction={handleFirstInteraction}
            isPaused={isPaused || showPauseMenu}
            showHints={showHints}
          />
        );

      case 'sharp_and_smooth':
        return (
          <SharpAndSmooth
            gameContents={gameContents}
            isPreviewMode={isPreviewMode}
            onGameUpdate={(data) => setGameScore(data.score || 0)}
            onGameComplete={handleGameComplete}
            onFirstInteraction={handleFirstInteraction}
            isPaused={isPaused || showPauseMenu}
            showHints={showHints}
          />
        );

      case 'memory_game':
        return (
          <MemoryGame
            gameContents={gameContents}
            isPreviewMode={isPreviewMode}
            onGameUpdate={(data) => setGameScore(data.score || 0)}
            onGameComplete={handleGameComplete}
            onFirstInteraction={handleFirstInteraction}
            isPaused={isPaused || showPauseMenu}
            showHints={showHints}
          />
        );

      case 'ar_up_there':
        return (
          <ArUpThere
            gameContents={gameContents}
            isPreviewMode={isPreviewMode}
            onGameUpdate={(data) => setGameScore(data.score || 0)}
            onGameComplete={handleGameComplete}
            onFirstInteraction={handleFirstInteraction}
            isPaused={isPaused || showPauseMenu}
            showHints={showHints}
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-2xl font-bold mb-2">סוג משחק לא נתמך</h2>
              <p className="text-gray-600">סוג המשחק '{gameType}' עדיין לא מומש</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-700 to-indigo-800 relative" dir="rtl">
      {/* Background Audio */}
      <audio ref={audioRef} />

      {/* Game Header */}
      <div className="absolute top-0 left-0 right-0 bg-black/20 backdrop-blur-lg p-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-bold text-lg">{game.title}</h2>
          <div className="flex items-center gap-2 text-white/80">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(gameTime)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Toggle */}
          <Button
            onClick={toggleAudio}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            title={audioEnabled ? 'השתק מוזיקה' : 'הפעל מוזיקה'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* Fullscreen Toggle */}
          {isFullscreenSupported && (
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              title={isFullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          )}

          {/* Pause Button */}
          <Button
            onClick={togglePause}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            title="השהייה"
          >
            <Pause className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Pause Menu Overlay */}
      {showPauseMenu && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4">
            <CardContent className="p-6 text-center space-y-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">המשחק מושהה</h3>

              <div className="space-y-3">
                <Button
                  onClick={togglePause}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
                >
                  <Play className="w-5 h-5 ml-2" />
                  המשך משחק
                </Button>

                <Button
                  onClick={restartGame}
                  variant="outline"
                  className="w-full py-3 text-lg border-2"
                >
                  <RotateCcw className="w-5 h-5 ml-2" />
                  התחל מחדש
                </Button>

                {user && user.role === 'admin' && ( // Use user prop
                  <Button
                    onClick={toggleHints}
                    variant="outline"
                    className="w-full py-3 text-lg border-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                  >
                    <Settings className="w-5 h-5 ml-2" />
                    {showHints ? 'הסתר תשובות' : 'הצג תשובות'}
                  </Button>
                )}

                <Button
                  onClick={toggleAudio}
                  variant="outline"
                  className="w-full py-3 text-lg border-2"
                >
                  {audioEnabled ? (
                    <>
                      <VolumeX className="w-5 h-5 ml-2" />
                      השתק מוזיקה
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5 ml-2" />
                      הפעל מוזיקה
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleExit}
                  variant="outline"
                  className="w-full py-3 text-lg border-2 border-red-500 text-red-700 hover:bg-red-50"
                >
                  <Home className="w-5 h-5 ml-2" />
                  חזרה לתפריט
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Game Content Area */}
      <div className="pt-20 p-4 h-full">
        {renderGame()} {/* Render the game dynamically */}
      </div>
    </div>
  );
}

