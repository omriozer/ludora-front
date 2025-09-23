
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Game, GameAudioSettings, AudioFile, Word, WordEN, ContentRelationship, User } from '@/services/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  ArrowRight,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Gamepad2,
  Users,
  Award,
  LogIn
} from 'lucide-react';

const GAME_TYPE_NAMES = {
  'sharp_and_smooth': 'חד וחלק',
  'elevator_game': 'משחק המעלית',
  'memory_game': 'משחק זיכרון',
  'scatter_game': 'תפזורת'
};

const GAME_TYPE_ICONS = {
  'sharp_and_smooth': '✏️',
  'elevator_game': '🏢',
  'memory_game': '🧠',
  'scatter_game': '🎯'
};

export default function GameLauncher() {
  const location = useLocation();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  
  const [game, setGame] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Changed to false - show UI immediately
  const [isGameDataLoading, setIsGameDataLoading] = useState(true); // New state for game data loading
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameWords, setGameWords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const gameId = new URLSearchParams(location.search).get('id');

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        // User not logged in - this is fine for free games
        setCurrentUser(null);
      }
    };

    loadCurrentUser();
  }, []);

  // Function to clean words for the game (remove punctuation, extra spaces, etc.)
  const cleanWordForGame = useCallback((word) => {
    if (!word) return null;
    
    // Remove common punctuation and symbols
    // Keep apostrophes if they are part of a word (e.g., aren't)
    // Replace non-alphabetic, non-numeric, non-Hebrew characters (except basic spaces)
    const cleaned = word
      .replace(/[^\p{L}\p{N}\s']/gu, '') // Keep letters, numbers, spaces, and apostrophes
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing spaces
    
    // Return null if word becomes empty or too short
    // Consider cases where cleaning results in only an apostrophe or very short non-word
    if (!cleaned || cleaned.length < 2) {
      return null;
    }
    
    return cleaned;
  }, []);

  const playAudioSafely = useCallback(async () => {
    if (!audioRef.current || !audioLoaded || audioError) return;

    try {
      if (!audioRef.current.paused) return;

      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
        console.error('Audio play error:', error.message || error);
        setAudioError(true);
      } else {
        console.log('Audio play prevented by browser policy:', error.name);
      }
    }
  }, [audioLoaded, audioRef, audioError]); // Removed setAudioError, as setState dispatchers are stable

  const pauseAudioSafely = useCallback(() => {
    if (!audioRef.current) return;

    try {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
    } catch (error) {
      console.warn('Could not pause audio:', error.message);
    }
  }, [audioRef]);

  const loadGameAudio = useCallback(async (gameData) => {
    try {
      const gameSettings = await GameAudioSettings.filter({ game_type: gameData.game_type });
      let audioFileId = null;

      if (gameSettings && gameSettings.length > 0 && gameSettings[0].opening_music) {
        audioFileId = gameSettings[0].opening_music;
      }
      else {
        const generalSettings = await GameAudioSettings.filter({ game_type: 'general' });
        if (generalSettings && generalSettings.length > 0 && generalSettings[0].opening_music) {
          audioFileId = generalSettings[0].opening_music;
        }
      }

      if (audioFileId) {
        const audioFiles = await AudioFile.filter({ id: audioFileId });
        if (audioFiles && audioFiles.length > 0) {
          const audioFile = audioFiles[0];
          setCurrentAudioUrl(audioFile.file_url);
          setVolume(audioFile.volume || 0.7);
        }
      } else {
        setCurrentAudioUrl(null);
        setAudioEnabled(false);
      }
    } catch (error) {
      console.error('Error loading game audio:', error);
      setCurrentAudioUrl(null);
      setAudioEnabled(false);
    }
  }, [setCurrentAudioUrl, setVolume, setAudioEnabled]);

  const loadGameData = useCallback(async (forceReload = false) => {
    if (!forceReload) {
      setIsGameDataLoading(true); // Use new loading state
      setError(null);
    }

    try {
      console.log('🎮 Loading game data for ID:', gameId, 'Force reload:', forceReload);

      // Load the game
      const games = await Game.filter({ id: gameId });
      if (!games || games.length === 0) {
        throw new Error('משחק לא נמצא');
      }

      const gameData = games[0];
      console.log('📋 Game data loaded:', gameData);
      
      if (!forceReload) {
        setGame(gameData);
      }

      // Load content for scatter game
      if (gameData.game_type === 'scatter_game') {
        console.log('🔤 Loading content for scatter game from relationships...');
        
        // Parse game settings
        let gameSettings;
        try {
          gameSettings = typeof gameData.game_settings === 'string' 
            ? JSON.parse(gameData.game_settings) 
            : gameData.game_settings;
          console.log('⚙️ Parsed game settings:', gameSettings);
        } catch (e) {
          console.error('Error parsing game settings:', e);
          throw new Error('הגדרות המשחק פגומות');
        }

        if (!gameSettings) {
          throw new Error('לא נמצאו הגדרות למשחק');
        }

        const gameLanguage = gameSettings.language || 'hebrew';
        const requiredWords = gameSettings.required_words || 3;
        console.log('🌐 Game language:', gameLanguage);
        console.log('🎯 Required words:', requiredWords);

        // Load content relationships for this game
        // These relationships link the game to its content sources (words, lists, etc.)
        const gameRelationships = await ContentRelationship.filter({ 
          target_id: gameId, 
          target_type: 'Game' 
        });

        console.log(`🔗 Found ${gameRelationships.length} content relationships for this game`);

        const allAvailableWords = []; // All words available for selection
        
        // Calculate max word length based on grid size instead of hardcoded 12
        let maxWordLength = 12; // Default fallback
        try {
          if (gameSettings && gameSettings.grid_size) {
            const gridWidth = gameSettings.grid_size.width || 12;
            const gridHeight = gameSettings.grid_size.height || 12;
            maxWordLength = Math.max(gridWidth, gridHeight); // Max word length is the larger dimension
            console.log(`📏 Calculated max word length based on grid ${gridWidth}x${gridHeight}: ${maxWordLength}`);
          } else {
            console.log('📏 Using default max word length:', maxWordLength);
          }
        } catch (error) {
          console.error('Error calculating max word length:', error);
          console.log('📏 Using fallback max word length:', maxWordLength);
        }

        // Pre-calculate game-wide excluded word IDs
        const gameExcludedWordIds = new Set();
        gameRelationships.forEach(rel => {
          if ((rel.source_type === 'Word' || rel.source_type === 'WordEN') &&
              rel.relationship_types.includes('excluded_game_content')) {
            gameExcludedWordIds.add(rel.source_id);
          }
        });
        console.log('🚨 Game-wide excluded word IDs:', [...gameExcludedWordIds]);

        // Process each relationship to build available words pool
        for (const relationship of gameRelationships) {
          try {
            const contextData = relationship.context_data ? JSON.parse(relationship.context_data) : {};
            console.log('🔍 Processing relationship:', relationship.id, 'Type:', contextData.content_type, 'Source:', relationship.source_type);

            // If the relationship itself signifies an exclusion (e.g., exclude an entire ContentList from the game)
            if (relationship.relationship_types.includes('excluded_game_content')) {
              console.log('⏭️ Skipping content relationship that is an exclusion itself (e.g., excluded list/category):', relationship.id);
              continue; // Skip processing this relationship entirely
            }

            // Handle custom words
            if (contextData.content_type === 'custom_word') {
              const wordData = contextData.word;
              console.log('🎯 Found custom word:', wordData, 'Type:', typeof wordData);
              
              let actualWordText = null;
              
              // Handle both string and object formats
              if (typeof wordData === 'string') {
                actualWordText = wordData;
              } else if (typeof wordData === 'object' && wordData && wordData.word) {
                // If it's an object with a 'word' property, extract the text
                actualWordText = wordData.word;
              } else if (typeof wordData === 'object' && wordData && wordData.text) {
                // Alternative property name
                actualWordText = wordData.text;
              }
              
              console.log('📝 Extracted word text:', actualWordText, 'Type:', typeof actualWordText);
              
              if (actualWordText && typeof actualWordText === 'string') {
                if (gameExcludedWordIds.has(relationship.source_id)) {
                  console.log(`⏭️ Skipping custom word '${actualWordText}' because it's game-wide excluded. ID: ${relationship.source_id}`);
                  continue;
                }
                
                console.log(`📏 Checking custom word length: "${actualWordText}" (Length: ${actualWordText.length}, Max: ${maxWordLength})`);
                
                if (actualWordText.length <= maxWordLength) {
                  const cleanWord = cleanWordForGame(actualWordText);
                  if (cleanWord) {
                    allAvailableWords.push({
                      id: relationship.source_id,
                      text: cleanWord,
                      type: 'custom',
                      originalText: actualWordText
                    });
                    console.log('📝 Added custom word to pool:', cleanWord);
                  } else {
                    console.log('⏭️ Custom word became empty after cleaning, skipping:', actualWordText);
                  }
                } else {
                  console.log('⏭️ Skipping custom word (too long):', actualWordText, `(Length: ${actualWordText.length}, Max: ${maxWordLength})`);
                }
              } else {
                console.log('⚠️ Could not extract valid word text from:', wordData, 'Type:', typeof wordData);
              }
            }
            
            // Handle individual words (Word/WordEN entities)
            else if (contextData.content_type === 'selected_word') {
              if (relationship.source_type === 'Word' || relationship.source_type === 'WordEN') {
                // Check if language matches the game's language setting
                if ((gameLanguage === 'hebrew' && relationship.source_type !== 'Word') ||
                    (gameLanguage === 'english' && relationship.source_type !== 'WordEN')) {
                  console.log(`⏭️ Skipping individual word due to language mismatch. Game: ${gameLanguage}, Word source type: ${relationship.source_type}`);
                  continue;
                }
                
                // Load the actual word entity
                const words = relationship.source_type === 'Word' ? 
                  await Word.filter({ id: relationship.source_id }) :
                  await WordEN.filter({ id: relationship.source_id });
                
                if (words && words.length > 0) {
                  const wordEntity = words[0];
                  if (gameExcludedWordIds.has(wordEntity.id)) { // Check if this word is game-excluded
                    console.log(`⏭️ Skipping individual word '${wordEntity.word}' because it's game-wide excluded. ID: ${wordEntity.id}`);
                    continue;
                  }

                  const wordText = wordEntity.vocalized || wordEntity.word;
                  
                  if (wordText) {
                    if (wordText.length <= maxWordLength) {
                      const cleanWord = cleanWordForGame(wordText);
                      if (cleanWord) {
                        allAvailableWords.push({
                          id: wordEntity.id,
                          text: cleanWord,
                          type: relationship.source_type,
                          originalText: wordText
                        });
                        console.log('📝 Added individual word to pool:', cleanWord);
                      } else {
                        console.log('⏭️ Individual word became empty after cleaning, skipping:', wordText);
                      }
                    } else {
                      console.log('⏭️ Skipping individual word (too long):', wordText, `(Length: ${wordText.length}, Max: ${maxWordLength})`);
                    }
                  }
                } else {
                  console.log('❌ Individual word entity not found for ID:', relationship.source_id);
                }
              } else {
                console.log('⏭️ Relationship source_type not Word/WordEN for selected_word type:', relationship.source_type);
              }
            }
            
            // Handle content lists - load ALL words from lists into pool
            else if (contextData.content_type === 'content_list') {
              if (relationship.source_type === 'ContentList') {
                console.log('📚 Processing content list:', relationship.source_id);
                
                // Get all relationships where this ContentList is involved (in both directions: List -> Word and Word -> List)
                const [listToWordsRelationships, wordsToListRelationships] = await Promise.all([
                  ContentRelationship.filter({ 
                    source_id: relationship.source_id, 
                    source_type: 'ContentList' 
                  }),
                  ContentRelationship.filter({ 
                    target_id: relationship.source_id, 
                    target_type: 'ContentList' 
                  })
                ]);

                // Combine both directions and filter unique relationships by ID to avoid redundant processing
                const allListRelationships = [...listToWordsRelationships, ...wordsToListRelationships]
                  .filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
                
                console.log(`📚 Found ${allListRelationships.length} unique relationships for content list ${relationship.source_id}`);

                // Check for words specifically excluded from *this list* when used *for this game*
                const listSpecificExcludedWordIds = gameRelationships
                  .filter(rel => 
                    rel.relationship_types.includes('excluded_game_content') &&
                    rel.context_data && rel.context_data.includes(`"from_list_id":"${relationship.source_id}"`) &&
                    (rel.source_type === 'Word' || rel.source_type === 'WordEN')
                  )
                  .map(rel => rel.source_id);

                console.log('❌ List-specific excluded word IDs for this game:', listSpecificExcludedWordIds);
                
                // Process each relationship to get the actual words from the list
                for (const listRel of allListRelationships) {
                  let wordEntityType = null;
                  let wordEntityId = null;
                  
                  // If this specific relationship within the list is an exclusion (e.g., word X is excluded from list Y)
                  if (listRel.relationship_types.includes('excluded_game_content')) {
                    console.log('⏭️ Skipping word due to list relationship being an exclusion:', listRel.id);
                    continue;
                  }

                  // Determine which entity in the relationship is the word (the one that is not the ContentList)
                  if (listRel.source_type === 'ContentList') {
                    // ContentList -> Word: word is target
                    wordEntityType = listRel.target_type;
                    wordEntityId = listRel.target_id;
                  } else if (listRel.target_type === 'ContentList') {
                    // Word -> ContentList: word is source
                    wordEntityType = listRel.source_type;
                    wordEntityId = listRel.source_id;
                  } else {
                    console.log('⏭️ Skipping non-word relationship in list:', listRel.id);
                    continue; // Skip relationships that don't involve our ContentList and a word
                  }
                  
                  // Only process Word and WordEN entities
                  if (wordEntityType === 'Word' || wordEntityType === 'WordEN') {
                    // Check if language matches the game's language setting
                    if ((gameLanguage === 'hebrew' && wordEntityType !== 'Word') ||
                        (gameLanguage === 'english' && wordEntityType !== 'WordEN')) {
                      console.log(`⏭️ Skipping word from list due to language mismatch. Game: ${gameLanguage}, Word type: ${wordEntityType}, Word ID: ${wordEntityId}`);
                      continue;
                    }
                    
                    try {
                      // Load the actual word entity
                      const words = wordEntityType === 'Word' ? 
                        await Word.filter({ id: wordEntityId }) :
                        await WordEN.filter({ id: wordEntityId });
                      
                      if (words && words.length > 0) {
                        const wordEntity = words[0];

                        // Apply game-wide exclusion check first
                        if (gameExcludedWordIds.has(wordEntity.id)) {
                          console.log(`⏭️ Skipping word '${wordEntity.word}' from list because it's game-wide excluded. ID: ${wordEntity.id}`);
                          continue;
                        }
                        // Apply list-specific exclusion check
                        if (listSpecificExcludedWordIds.includes(wordEntity.id)) {
                          console.log(`⏭️ Skipping word '${wordEntity.word}' because it's excluded specifically from this list for this game. ID: ${wordEntity.id}`);
                          continue;
                        }

                        const wordText = wordEntity.vocalized || wordEntity.word;
                        
                        if (wordText) {
                          if (wordText.length <= maxWordLength) {
                            const cleanWord = cleanWordForGame(wordText);
                            if (cleanWord) {
                              allAvailableWords.push({
                                id: wordEntity.id,
                                text: cleanWord,
                                type: wordEntityType,
                                originalText: wordText,
                                fromList: relationship.source_id // Keep for tracing origin
                              });
                              console.log('📝 Added word from list to pool:', cleanWord, 'from list:', relationship.source_id);
                            } else {
                              console.log('⏭️ Word from list became empty after cleaning, skipping:', wordText);
                            }
                          } else {
                            console.log('⏭️ Skipping word from list (too long):', wordText, `(Length: ${wordText.length}, Max: ${maxWordLength})`);
                          }
                        }
                      } else {
                        console.log('❌ Word entity not found for ID from list:', wordEntityId);
                      }
                    } catch (error) {
                      console.error(`Error loading word ${wordEntityId} from list:`, error);
                    }
                  } else {
                    console.log('⏭️ Relationship points to non-Word/WordEN entity in list:', wordEntityType);
                  }
                }
              } else {
                console.log('⏭️ Relationship source_type not ContentList for content_list type:', relationship.source_type);
              }
            }
            else {
              console.log('❓ Unknown content_type or unhandled relationship:', contextData.content_type);
            }
          } catch (error) {
            console.error('❌ Error processing relationship:', relationship.id, error);
          }
        }

        console.log(`🎯 Total available words in pool: ${allAvailableWords.length}`);
        console.log('📋 Available words:', allAvailableWords.map(w => w.text));

        // Validate we have enough words
        if (allAvailableWords.length < requiredWords) {
          throw new Error(`נדרשות לפחות ${requiredWords} מילים למשחק, נמצאו רק ${allAvailableWords.length} מילים פוטנציאליות. אנא הוסף עוד מילים.`);
        }

        // Randomly select required number of words from the available pool
        const shuffledWords = [...allAvailableWords].sort(() => Math.random() - 0.5);
        const selectedWords = shuffledWords.slice(0, requiredWords);

        console.log(`🎲 Selected ${selectedWords.length} words for this game:`, selectedWords.map(w => w.text));

        // Remove duplicates based on text (in case of duplicates from different sources or accidental repeats)
        const uniqueSelectedWords = selectedWords.filter((word, index, array) => 
          array.findIndex(w => w.text === word.text) === index
        );

        console.log(`✨ Final unique words for game: ${uniqueSelectedWords.length}`, uniqueSelectedWords.map(w => w.text));

        // Set the selected words for the game
        setGameWords(uniqueSelectedWords);
      }

      // Load game audio after setting words (only on initial load)
      if (!forceReload) {
        await loadGameAudio(gameData);
      }

    } catch (error) {
      console.error('❌ Error loading game data:', error);
      setError(error.message);
      if (!forceReload) {
        navigate('/catalog');
      }
    } finally {
      if (!forceReload) {
        setIsGameDataLoading(false); // Data loading complete
      }
    }
  }, [gameId, navigate, cleanWordForGame, loadGameAudio]);

  const reloadGameWords = useCallback(() => {
    console.log('🔄 Reloading game words...');
    loadGameData(true); // Force reload flag
  }, [loadGameData]);

  const handleGameComplete = useCallback(() => {
    // For now, navigate back to games catalog
    navigate('/catalog');
  }, [navigate]);

  useEffect(() => {
    if (gameId) {
      loadGameData();
    } else {
      navigate('/catalog');
    }
  }, [gameId, navigate, loadGameData]);

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

  useEffect(() => {
    if (audioRef.current && typeof volume === 'number' && !isNaN(volume)) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      audioRef.current.volume = clampedVolume;
    }
  }, [volume]);

  useEffect(() => {
    if (!currentAudioUrl || !audioRef.current) return;
    if (gameStarted) {
      pauseAudioSafely();
      return;
    }

    const audio = audioRef.current;
    
    setAudioLoaded(false);
    setAudioError(false);

    audio.src = currentAudioUrl;
    audio.loop = true;
    
    const handleCanPlayThrough = async () => {
      setAudioLoaded(true);
      setAudioError(false);
      
      if (typeof volume === 'number' && !isNaN(volume)) {
        audio.volume = Math.max(0, Math.min(1, volume));
      }
      
      // Try to auto-play, if fails set audioEnabled to false
      if (audioEnabled) {
        try {
          console.log('🎵 Trying to auto-play opening music');
          await audio.play();
          console.log('🎵 Opening music auto-play successful');
        } catch (playError) {
          if (playError.name === 'NotAllowedError' || playError.name === 'AbortError') {
            console.log('🎵 Opening music auto-play blocked, setting audio to disabled');
            setAudioEnabled(false); // Set button to muted state
          } else {
            console.error('Opening music play error:', playError.message);
          }
        }
      }
    };

    const handleError = (e) => {
      const errorMessage = e.target?.error?.message || 
                          e.message || 
                          `Audio load failed: ${e.target?.src || 'unknown source'}`;
      console.error('Opening audio error:', errorMessage);
      setAudioError(true);
      setAudioLoaded(false);
    };

    const handleLoadStart = () => {
      setAudioLoaded(false);
    };

    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    audio.load();

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      
      if (!audio.paused) {
        audio.pause();
      }
      audio.src = '';
      audio.load();
    };
  }, [currentAudioUrl, gameStarted, volume, audioEnabled, pauseAudioSafely, setAudioEnabled, setAudioError, setAudioLoaded]); // Added pauseAudioSafely, setAudioEnabled, setAudioError, setAudioLoaded to ensure stability

  // Handle manual audio toggle
  useEffect(() => {
    if (!audioRef.current || !audioLoaded || gameStarted) return;

    if (audioEnabled) {
      console.log('🎵 User manually enabled audio - playing opening music');
      playAudioSafely();
    } else {
      pauseAudioSafely();
    }
  }, [audioEnabled, audioLoaded, gameStarted, playAudioSafely, pauseAudioSafely]);

  const toggleFullscreen = async () => {
    try {
      const elem = document.documentElement;
      
      if (!document.fullscreenElement && 
          !document.webkitFullscreenElement && 
          !document.mozFullScreenElement && 
          !document.msFullscreenElement) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        } else {
          console.warn('Fullscreen API not supported on this device');
          alert('מסך מלא לא נתמך במכשיר זה');
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
      alert('שגיאה בכניסה למסך מלא');
    }
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  const goBackToGames = () => {
    pauseAudioSafely();
    navigate('/catalog');
  };

  const handleExit = () => {
    navigate('/catalog');
  };

  useEffect(() => {
    const currentAudio = audioRef.current; // Capture current ref value
    
    return () => {
      if (currentAudio) {
        pauseAudioSafely(); 
        currentAudio.src = '';
        currentAudio.load();
      }
    };
  }, [pauseAudioSafely]); 

  const getAgeRangeDisplay = (ageRange) => {
    if (!ageRange) return null;
    
    let range;
    if (typeof ageRange === 'string') {
      try {
        range = JSON.parse(ageRange);
      } catch (e) {
        return null;
      }
    } else {
      range = ageRange;
    }

    if (range.min && range.max) {
      return `גילאי ${range.min}-${range.max}`;
    } else if (range.min) {
      return `מגיל ${range.min}`;
    } else if (range.max) {
      return `עד גיל ${range.max}`;
    }
    return null;
  };

  const getGradeRangeDisplay = (gradeRange) => {
    if (!gradeRange) return null;
    
    let range;
    if (typeof gradeRange === 'string') {
      try {
        range = JSON.parse(gradeRange);
      } catch (e) {
        return null;
      }
    } else {
      range = gradeRange;
    }

    const gradeLabels = {
      'kindergarten': 'גן',
      '1': "א'", '2': "ב'", '3': "ג'", 
      '4': "ד'", '5': "ה'", '6': "ו'",
      '7': "ז'", '8': "ח'", '9': "ט'",
      '10': "י'", '11': "יא'", '12': "יב'"
    };

    if (range.min && range.max) {
      const minLabel = gradeLabels[range.min] || range.min;
      const maxLabel = gradeLabels[range.max] || range.max;
      if (range.min === range.max) {
        return minLabel;
      }
      return `${minLabel}-${maxLabel}`;
    } else if (range.min) {
      return `מ${gradeLabels[range.min] || range.min}`;
    } else if (range.max) {
      return `עד ${gradeLabels[range.max] || range.max}`;
    }
    return null;
  };

  // Remove the old isLoading check - we show UI immediately
  // if (isLoading) { ... }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-700 to-indigo-800 flex items-center justify-center" dir="rtl">
        <div className="text-center text-white p-4">
          <p className="text-2xl font-bold mb-4">שגיאה בטעינת המשחק</p>
          <p className="text-lg mb-6">{error || "המשחק לא נמצא או אירעה שגיאה בלתי צפויה."}</p>
          <Button
            onClick={() => navigate('/catalog')}
            variant="outline"
            className="bg-white/20 backdrop-blur-lg border-white/30 text-white hover:bg-white/30 transition-colors shadow-lg"
          >
            חזרה לקטלוג המשחקים
          </Button>
        </div>
      </div>
    );
  }

  // Check if game is free (accessible to everyone)
  const isGameFree = game && game.price === 0;

  // Modify the game start condition to allow free games for everyone
  const canPlayGame = () => {
    if (isGameFree) {
      return true; // Free games are accessible to everyone
    }
    
    if (!currentUser) {
      return false; // Paid games require login
    }
    
    // TODO: Add subscription/purchase logic here later
    return true; // For now, logged-in users can play any game
  };

  // Handle game start for scatter game specifically, which relies on gameWords
  if (gameStarted) {
    console.log('🎮 PREPARING to render GameEngine with gameWords:', gameWords.map(w => w.text));
    console.log('🎮 gameWords length being passed to GameEngine:', gameWords.length);

    // Only render GameEngine for 'scatter_game' as it's the only type that loads 'gameWords'
    // If other game types were to use GameEngine, they would need their own word loading logic or different props.
    if (game.game_type === 'scatter_game') {
      return (
        <GameEngine 
          game={game} 
          gameData={{ gameWords: gameWords }}
          user={currentUser}
          onGameComplete={handleGameComplete}
          onExit={handleExit}
        />
      );
    } 
    // If gameStarted is true but it's not a scatter_game, it means this GameEngine
    // might not be suitable or the game type is not yet fully supported to proceed.
    // In this case, fall through to render the launcher UI again.
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-700 to-indigo-800 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {currentAudioUrl && (
        <audio
          ref={audioRef}
        />
      )}

      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="absolute top-4 left-4 right-4 flex justify-between z-50">
        <div className="flex gap-3">
          <Button
            onClick={goBackToGames}
            variant="outline"
            className="bg-white/20 backdrop-blur-lg border-white/30 text-white hover:bg-white/30 transition-colors shadow-lg"
          >
            <ArrowRight className="w-4 h-4 ml-4" />
            חזרה למשחקים
          </Button>
        </div>

        <div className="flex gap-3 items-center">
          {currentAudioUrl && (
            <Button
              onClick={toggleAudio}
              variant="outline"
              className="bg-white/20 backdrop-blur-lg border-white/30 text-white hover:bg-white/30 transition-colors shadow-lg flex items-center gap-2"
              title={audioEnabled ? 'השתק מוזיקה' : 'הפעל מוזיקה'}
            >
              {audioEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline">מוזיקה פועלת</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="hidden sm:inline">מוזיקה מושתקת</span>
                </>
              )}
            </Button>
          )}

          <Button
            onClick={toggleFullscreen}
            variant="outline"
            className="bg-white/20 backdrop-blur-lg border-white/30 text-white hover:bg-white/30 transition-colors shadow-lg flex items-center gap-2"
            title={isFullscreen ? 'יציאה ממסך מלא' : 'כניסה למסך מלא'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4" />
                <span className="hidden sm:inline">יציאה</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4" />
                <span className="hidden sm:inline">מסך מלא</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center pt-16">
        <div className="mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-6 transition-transform duration-500">
            {game.image_url ? (
              <img
                src={game.image_url}
                alt={game.title}
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <div className="text-5xl text-white">
                {GAME_TYPE_ICONS[game.game_type] || '🎮'}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {game.title}
          </h1>
          
          <div className="flex justify-center items-center gap-4 mb-4 flex-wrap">
            <Badge className="bg-white/20 backdrop-blur-lg text-white border-white/20 px-4 py-2 text-lg">
              <span className="ml-2 text-xl">{GAME_TYPE_ICONS[game.game_type]}</span>
              {GAME_TYPE_NAMES[game.game_type]}
            </Badge>
            
            {game.price === 0 && (
              <Badge className="bg-green-500 text-white px-4 py-2 text-lg font-bold">
                חינם
              </Badge>
            )}
          </div>

          <p className="text-lg text-purple-100 mb-6 max-w-2xl mx-auto leading-relaxed">
            {game.description}
          </p>

          <div className="flex justify-center items-center gap-6 mb-6 flex-wrap">
            {getAgeRangeDisplay(game.age_range) && (
              <div className="flex items-center gap-2 text-white/80">
                <Users className="w-5 h-5" />
                <span className="font-medium">{getAgeRangeDisplay(game.age_range)}</span>
              </div>
            )}
            
            {getGradeRangeDisplay(game.grade_range) && (
              <div className="flex items-center gap-2 text-white/80">
                <span className="text-lg">🎓</span>
                <span className="font-medium">{getGradeRangeDisplay(game.grade_range)}</span>
              </div>
            )}
            
            {game.subject && (
              <div className="flex items-center gap-2 text-white/80">
                <Award className="w-5 h-5" />
                <span className="font-medium">{game.subject}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          {canPlayGame() ? (
            <Button
              onClick={() => { 
                // Don't auto-start music here if audioEnabled is false
                setGameStarted(true); 
                pauseAudioSafely(); 
              }}
              size="lg"
              disabled={isGameDataLoading} // Disable button while loading game data
              className="relative bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-gray-900 hover:from-yellow-300 hover:via-orange-400 hover:to-red-400 px-16 py-8 text-3xl font-black rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 border-4 border-white/30 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full animate-ping"></div>
                <div className="absolute bottom-3 left-6 w-1 h-1 bg-white rounded-full animate-ping delay-1000"></div>
                <div className="absolute top-1/2 left-3 w-1.5 h-1.5 bg-white rounded-full animate-ping delay-500"></div>
              </div>
              
              <div className="relative z-10 flex items-center">
                {isGameDataLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-gray-900 ml-4"></div>
                    <span>טוען משחק...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-10 h-10 ml-4" />
                    <span>התחל משחק!</span>
                  </>
                )}
              </div>
            </Button>
          ) : (
            <div className="text-center">
              <div className="mb-6 p-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
                <h3 className="text-xl font-bold text-white mb-2">נדרשת התחברות</h3>
                <p className="text-white/80 mb-4">
                  כדי לשחק במשחק זה, עליך להתחבר תחילה
                </p>
                <Button
                  onClick={() => User.login()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-xl"
                >
                  <LogIn className="w-5 h-5 ml-2" />
                  התחבר עכשיו
                </Button>
              </div>
            </div>
          )}
        </div>

        {game.skills && game.skills.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white/80 mb-4">מיומנויות שתפתח:</h3>
            <div className="flex justify-center flex-wrap gap-2">
              {(typeof game.skills === 'string' ? JSON.parse(game.skills) : game.skills).map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-white/10 border-white/20 text-white">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
