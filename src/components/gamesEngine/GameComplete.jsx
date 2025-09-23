
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Play,
  Home
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function GameComplete({
  foundWords = [], // Add default empty array
  totalWords = 0, // Add default value
  score = 0, // Add default value
  onPlayAgain,
  onExit,
  sessionDuration = 0, // Add default value
  completionPercentage = 0 // Add new prop
}) {
  const audioRef = useRef(null);

  // Play ending music when component loads - try auto-play, if blocked set audioEnabled to false
  useEffect(() => {
    const loadEndingMusic = async () => {
      try {
        const { GameAudioSettings, AudioFile } = await import('@/services/entities');

        let audioFileId = null;

        // Try to get ending music for this specific game type first
        const gameSettings = await GameAudioSettings.filter({ game_type: 'scatter_game' }); // or get from props
        if (gameSettings && gameSettings.length > 0 && gameSettings[0].ending_music) {
          audioFileId = gameSettings[0].ending_music;
        } else {
          // Fall back to general ending music
          const generalSettings = await GameAudioSettings.filter({ game_type: 'general' });
          if (generalSettings && generalSettings.length > 0 && generalSettings[0].ending_music) {
            audioFileId = generalSettings[0].ending_music;
          }
        }

        if (audioFileId && audioRef.current) {
          const audioFiles = await AudioFile.filter({ id: audioFileId });
          if (audioFiles && audioFiles.length > 0) {
            const audioFile = audioFiles[0];
            
            audioRef.current.src = audioFile.file_url;
            audioRef.current.volume = audioFile.volume || 0.7;
            audioRef.current.loop = false; // Don't loop ending music
            
            // Try auto-play, if blocked we don't set any state since GameComplete doesn't have audio toggle
            try {
              console.log('🎵 Trying to auto-play ending music');
              await audioRef.current.play();
              console.log('🎵 Ending music auto-play successful');
            } catch (playError) {
              if (playError.name === 'NotAllowedError' || playError.name === 'AbortError') {
                console.log('🎵 Ending music auto-play blocked');
                // GameComplete doesn't have audio controls, so we just log this
              } else {
                console.error('Ending music play error:', playError.message);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading ending music:', error);
      }
    };

    loadEndingMusic();

    // Cleanup - capture current audio element
    const currentAudio = audioRef.current;
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
    };
  }, []);

  // Smart time formatting function
  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${seconds} שניות`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (secs === 0) {
        return `${mins} דקות`;
      }
      return `${mins} דקות ו-${secs} שניות`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      let result = `${hours} שעות`;
      if (mins > 0) {
        result += ` ו-${mins} דקות`;
      }
      // Only add seconds if minutes are zero or if hours are also zero, otherwise it could get too long.
      // This logic prevents "X hours and Y minutes and Z seconds" when Z is small.
      if (secs > 0 && mins === 0) {
        result += ` ו-${secs} שניות`;
      }
      return result;
    }
  };

  // Enhanced confetti animation variants
  const confettiVariants = {
    initial: {
      y: -100,
      opacity: 0,
      rotate: 0,
      x: 0,
      scale: 1
    },
    animate: (i) => ({
      y: window.innerHeight + 100,
      opacity: [0, 1, 1, 0.8, 0],
      rotate: [0, 180, 360, 540, 720],
      x: [0, Math.sin(i * 0.5) * 50, Math.sin(i * 0.8) * -30, Math.sin(i * 1.2) * 40, 0],
      scale: [0.5, 1, 0.8, 1.2, 0.3],
      transition: {
        duration: Math.random() * 3 + 2, // 2-5 seconds
        ease: [0.25, 0.46, 0.45, 0.94], // Custom easing
        repeat: Infinity,
        repeatDelay: Math.random() * 1,
        times: [0, 0.2, 0.5, 0.8, 1]
      }
    })
  };

  // Generate diverse confetti pieces with different shapes and properties
  const confettiPieces = Array.from({ length: 80 }, (_, i) => {
    const shapes = ['circle', 'square', 'triangle', 'star', 'diamond'];
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#FFB6C1', '#87CEEB', '#F0E68C',
      '#FFD700', '#C0C0C0', '#FFA500', '#FF69B4', '#00CED1'
    ];

    return {
      id: i,
      shape: shapes[i % shapes.length],
      color: colors[i % colors.length],
      left: Math.random() * 100,
      delay: Math.random() * 4,
      size: Math.random() * 8 + 4, // 4-12px
      rotation: Math.random() * 360,
      swingAmplitude: Math.random() * 60 + 20 // 20-80px swing
    };
  });

  // Confetti shape components
  const ConfettiShape = ({ piece, variants }) => {
    const baseClasses = "absolute pointer-events-none";

    switch (piece.shape) {
      case 'square':
        return (
          <motion.div
            className={`${baseClasses} rounded-sm`}
            style={{
              backgroundColor: piece.color,
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              transformOrigin: 'center'
            }}
            variants={variants}
            initial="initial"
            animate="animate"
            custom={piece.id}
            transition={{ delay: piece.delay }}
          />
        );

      case 'triangle':
        return (
          <motion.div
            className={`${baseClasses}`}
            style={{
              left: `${piece.left}%`,
              width: 0,
              height: 0,
              borderLeft: `${piece.size/2}px solid transparent`,
              borderRight: `${piece.size/2}px solid transparent`,
              borderBottom: `${piece.size}px solid ${piece.color}`,
              transformOrigin: 'center bottom'
            }}
            variants={variants}
            initial="initial"
            animate="animate"
            custom={piece.id}
            transition={{ delay: piece.delay }}
          />
        );

      case 'star':
        return (
          <motion.div
            className={`${baseClasses} flex items-center justify-center`}
            style={{
              left: `${piece.left}%`,
              fontSize: `${piece.size}px`, // Use fontSize for icon-like rendering
              color: piece.color,
              transformOrigin: 'center'
            }}
            variants={variants}
            initial="initial"
            animate="animate"
            custom={piece.id}
            transition={{ delay: piece.delay }}
          >
            ⭐
          </motion.div>
        );

      case 'diamond':
        return (
          <motion.div
            className={`${baseClasses} rotate-45`}
            style={{
              backgroundColor: piece.color,
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              transformOrigin: 'center'
            }}
            variants={variants}
            initial="initial"
            animate="animate"
            custom={piece.id}
            transition={{ delay: piece.delay }}
          />
        );

      default: // circle
        return (
          <motion.div
            className={`${baseClasses} rounded-full`}
            style={{
              backgroundColor: piece.color,
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              transformOrigin: 'center'
            }}
            variants={variants}
            initial="initial"
            animate="animate"
            custom={piece.id}
            transition={{ delay: piece.delay }}
          />
        );
    }
  };

  const handleExit = () => {
    // Stop ending music when exiting
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    onExit();
  };

  const handlePlayAgain = () => {
    // Stop ending music when playing again
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    onPlayAgain();
  };

  // Safe calculations with default values
  const safeFoundWordsLength = foundWords ? foundWords.length : 0;
  const safeTotalWords = totalWords || 0;
  const safeScore = score || 0;
  const safeDuration = sessionDuration || 0;
  const safeCompletionPercentage = completionPercentage || (safeTotalWords > 0 ? Math.round((safeFoundWordsLength / safeTotalWords) * 100) : 0);

  console.log('🎮 GameComplete - sessionDuration received:', sessionDuration, 'formatted:', formatDuration(safeDuration));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Audio element for ending music */}
      <audio ref={audioRef} />

      {/* Enhanced Confetti Animation */}
      <div className="absolute inset-0 pointer-events-none">
        {confettiPieces.map((piece) => (
          <ConfettiShape
            key={piece.id}
            piece={piece}
            variants={confettiVariants}
          />
        ))}
      </div>

      {/* Floating sparkles for extra magic */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }, (_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Background Decorations */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-pink-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 6, repeat: Infinity, delay: 2 }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <Card className="bg-white/95 backdrop-blur-lg shadow-2xl max-w-2xl mx-auto rounded-3xl border-4 border-white/30">
          <CardContent className="p-8">
            {/* Congratulations Message (simplified) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mb-6"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                🎉 סיכום המשחק! 🎉
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                הנה הביצועים שלך:
              </p>
            </motion.div>

            {/* Enhanced Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8"
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500 mb-2">{safeFoundWordsLength}</div>
                  <div className="text-gray-700">מילים שנמצאו</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500 mb-2">{safeScore.toLocaleString()}</div>
                  <div className="text-gray-700">ניקוד</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500 mb-2">
                    {safeCompletionPercentage}%
                  </div>
                  <div className="text-gray-700">אחוז הצלחה</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500 mb-2">
                    {formatDuration(safeDuration)}
                  </div>
                  <div className="text-gray-700">זמן משחק</div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handlePlayAgain}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                >
                  <Play className="w-5 h-5 ml-2" />
                  שחק שוב
                </Button>

                <Button
                  onClick={handleExit}
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-300 hover:bg-gray-50 text-gray-700 px-8 py-4 text-lg font-semibold rounded-2xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <Home className="w-5 h-5 ml-2" />
                  חזרה לתפריט
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
