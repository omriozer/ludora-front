import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  Zap,
  Star,
  CheckCircle,
  XCircle,
  Trophy,
  Target,
  Sparkles,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Puzzle,
  Palette,
  Microscope,
  Calculator,
  Globe,
  Music,
  PenTool,
  Rocket,
  Atom,
  Heart,
  Brain
} from "lucide-react";

const LudoraLoadingSpinner = ({
  message = "טוען...",
  status = "loading", // 'loading', 'success', 'error'
  size = "md",
  theme = "educational",
  showParticles = true,
  showLogo = false, // New prop for logo animation
  onAnimationComplete
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showSuccessParty, setShowSuccessParty] = useState(false);
  const [floatingIcons, setFloatingIcons] = useState([]);
  const [activeLetter, setActiveLetter] = useState(0);

  // Enhanced size configurations
  const sizeConfig = {
    sm: {
      spinner: "w-16 h-16",
      text: "text-sm",
      particles: 8,
      icons: 4,
      containerSize: "w-32 h-32"
    },
    md: {
      spinner: "w-20 h-20",
      text: "text-base",
      particles: 12,
      icons: 6,
      containerSize: "w-40 h-40"
    },
    lg: {
      spinner: "w-24 h-24",
      text: "text-lg",
      particles: 16,
      icons: 8,
      containerSize: "w-48 h-48"
    },
    xl: {
      spinner: "w-32 h-32",
      text: "text-xl",
      particles: 20,
      icons: 10,
      containerSize: "w-56 h-56"
    }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Enhanced educational themes
  const themes = {
    educational: {
      colors: {
        primary: "from-blue-500 via-indigo-500 to-purple-600",
        secondary: "from-emerald-400 via-teal-500 to-cyan-600",
        accent: "from-amber-400 via-orange-500 to-red-500",
        background: "from-blue-50 via-indigo-50 to-purple-50"
      },
      icon: GraduationCap,
      floatingIcons: [BookOpen, Lightbulb, Brain, Calculator, Globe, Puzzle],
      name: "educational"
    },
    science: {
      colors: {
        primary: "from-green-400 via-emerald-500 to-teal-600",
        secondary: "from-blue-400 via-cyan-500 to-teal-600",
        accent: "from-yellow-400 via-amber-500 to-orange-500",
        background: "from-emerald-50 via-teal-50 to-cyan-50"
      },
      icon: Microscope,
      floatingIcons: [Atom, Microscope, Globe, Lightbulb, Target, Rocket],
      name: "science"
    },
    creative: {
      colors: {
        primary: "from-pink-400 via-rose-500 to-red-500",
        secondary: "from-purple-400 via-violet-500 to-indigo-500",
        accent: "from-yellow-400 via-amber-500 to-orange-500",
        background: "from-pink-50 via-rose-50 to-orange-50"
      },
      icon: Palette,
      floatingIcons: [Palette, Music, PenTool, Heart, Star, Sparkles],
      name: "creative"
    },
    gaming: {
      colors: {
        primary: "from-violet-500 via-purple-600 to-indigo-700",
        secondary: "from-cyan-400 via-blue-500 to-indigo-600",
        accent: "from-lime-400 via-green-500 to-emerald-600",
        background: "from-violet-50 via-purple-50 to-indigo-50"
      },
      icon: Gamepad2,
      floatingIcons: [Gamepad2, Trophy, Target, Zap, Star, Puzzle],
      name: "gaming"
    },
    arcade: {
      colors: {
        primary: "from-yellow-400 via-orange-500 to-red-500",
        secondary: "from-blue-400 via-purple-500 to-pink-500",
        accent: "from-green-400 to-emerald-500",
        background: "from-yellow-50 via-orange-50 to-red-50"
      },
      icon: Gamepad2,
      floatingIcons: [Gamepad2, Trophy, Star, Zap, Target, Sparkles],
      name: "arcade"
    },
    neon: {
      colors: {
        primary: "from-cyan-400 via-blue-500 to-purple-600",
        secondary: "from-pink-400 via-purple-500 to-indigo-600",
        accent: "from-emerald-400 to-teal-500",
        background: "from-slate-800 via-gray-900 to-black"
      },
      icon: Zap,
      floatingIcons: [Zap, Star, Sparkles, Target, Trophy, Rocket],
      name: "neon"
    },
    space: {
      colors: {
        primary: "from-indigo-400 via-purple-500 to-pink-500",
        secondary: "from-blue-400 via-indigo-500 to-purple-600",
        accent: "from-yellow-400 to-orange-500",
        background: "from-slate-900 via-purple-900 to-indigo-900"
      },
      icon: Rocket,
      floatingIcons: [Rocket, Star, Globe, Atom, Zap, Target],
      name: "space"
    }
  };

  const currentTheme = themes[theme] || themes.educational;

  // Ludora letters configuration
  const ludoraLetters = [
    { letter: 'L', color: 'from-teal-400 via-teal-500 to-cyan-600', delay: 0 },
    { letter: 'U', color: 'from-cyan-400 via-blue-400 to-teal-500', delay: 0.1 },
    { letter: 'D', color: 'from-yellow-400 via-amber-500 to-yellow-600', delay: 0.2 },
    { letter: 'O', color: 'from-orange-400 via-orange-500 to-amber-600', delay: 0.3 },
    { letter: 'R', color: 'from-orange-500 via-red-500 to-pink-600', delay: 0.4 },
    { letter: 'A', color: 'from-pink-500 via-rose-500 to-red-600', delay: 0.5 }
  ];

  // Initialize floating icons
  useEffect(() => {
    if (status === "loading" && showParticles && currentTheme.floatingIcons) {
      const icons = currentTheme.floatingIcons.slice(0, config.icons).map((IconComponent, i) => ({
        id: i,
        Icon: IconComponent,
        delay: i * 0.2,
        angle: (360 / config.icons) * i,
        speed: 0.5 + Math.random() * 0.5
      }));
      setFloatingIcons(icons);
    }
  }, [status, showParticles, currentTheme, config.icons]);

  // Letter cycling animation
  useEffect(() => {
    if (status === "loading" && showLogo) {
      const interval = setInterval(() => {
        setActiveLetter(prev => (prev + 1) % ludoraLetters.length);
      }, 600); // Change active letter every 600ms
      return () => clearInterval(interval);
    }
  }, [status, showLogo, ludoraLetters.length]);

  useEffect(() => {
    if (status === "loading") {
      const interval = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % 12);
      }, 120);
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    if (status === "success") {
      setShowSuccessParty(true);
      const timer = setTimeout(() => {
        setShowSuccessParty(false);
        onAnimationComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    } else if (status === "error") {
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onAnimationComplete]);

  // Enhanced loading spinner component
  const LoadingSpinner = () => (
    <motion.div
      className={`${config.containerSize} relative flex items-center justify-center`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      {/* Animated background glow */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${currentTheme.colors.background} opacity-30 blur-xl`}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Outer rotating ring with gradient border */}
      <motion.div
        className={`${config.spinner} absolute border-4 border-transparent rounded-full`}
        style={{
          background: `conic-gradient(from 0deg, transparent, ${currentTheme.colors.primary.replace('from-', '').replace(' via-', ', ').replace(' to-', ', ')}, transparent)`,
          padding: '2px'
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className="w-full h-full bg-white dark:bg-gray-900 rounded-full" />
      </motion.div>

      {/* Middle pulsing ring */}
      <motion.div
        className={`absolute w-14 h-14 ${size === 'lg' ? 'w-16 h-16' : ''} ${size === 'xl' ? 'w-20 h-20' : ''} ${size === 'sm' ? 'w-10 h-10' : ''} rounded-full bg-gradient-to-r ${currentTheme.colors.secondary} opacity-20`}
        animate={{
          scale: [0.8, 1.2, 0.8],
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Inner spinning ring */}
      <motion.div
        className={`absolute w-10 h-10 ${size === 'lg' ? 'w-12 h-12' : ''} ${size === 'xl' ? 'w-16 h-16' : ''} ${size === 'sm' ? 'w-8 h-8' : ''} border-2 border-transparent rounded-full`}
        style={{
          borderTopColor: currentTheme.colors.accent.includes('from-') ? '#10b981' : currentTheme.colors.accent,
          borderRightColor: 'transparent'
        }}
        animate={{ rotate: -360 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Center icon with enhanced animation */}
      <motion.div
        className="relative z-10"
        animate={{
          scale: [1, 1.15, 1],
          rotate: currentTheme.name === 'educational' ? [0, 0, 0] : [0, 10, -10, 0],
          y: [0, -2, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <currentTheme.icon
          className={`w-6 h-6 ${size === 'lg' ? 'w-8 h-8' : ''} ${size === 'xl' ? 'w-10 h-10' : ''} ${size === 'sm' ? 'w-5 h-5' : ''} text-white drop-shadow-xl`}
          style={{
            filter: `drop-shadow(0 0 8px ${currentTheme.colors.primary.includes('from-blue') ? '#3b82f6' : '#8b5cf6'})`
          }}
        />
      </motion.div>

      {/* Floating educational icons */}
      {showParticles && floatingIcons.map((iconData) => {
        const { Icon, id, delay, angle, speed } = iconData;
        const radius = size === 'sm' ? 50 : size === 'lg' ? 80 : size === 'xl' ? 100 : 65;

        return (
          <motion.div
            key={id}
            className="absolute"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.7, 0],
              scale: [0, 1, 0],
              x: Math.cos((angle + currentFrame * 3) * Math.PI / 180) * radius,
              y: Math.sin((angle + currentFrame * 3) * Math.PI / 180) * radius,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: delay,
              ease: "easeInOut"
            }}
          >
            <Icon className={`w-4 h-4 ${size === 'lg' ? 'w-5 h-5' : ''} ${size === 'xl' ? 'w-6 h-6' : ''} ${size === 'sm' ? 'w-3 h-3' : ''} text-gray-400 opacity-60`} />
          </motion.div>
        );
      })}

      {/* Energy particles */}
      {showParticles && [...Array(config.particles)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: `linear-gradient(45deg, ${currentTheme.colors.accent.includes('from-') ? '#10b981' : currentTheme.colors.accent}, transparent)`
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            x: Math.cos((i * 30 + currentFrame * 5) * Math.PI / 180) * (30 + i * 3),
            y: Math.sin((i * 30 + currentFrame * 5) * Math.PI / 180) * (30 + i * 3),
          }}
          transition={{
            duration: 2 + (i % 3) * 0.5,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeOut"
          }}
        />
      ))}
    </motion.div>
  );

  // Ludora Logo Letter Animation Component
  const LudoraLogoLoader = () => (
    <motion.div
      className="flex items-center justify-center gap-1 md:gap-2"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      {ludoraLetters.map((letterData, index) => {
        const isActive = index === activeLetter;
        const shouldBounce = index === (activeLetter + 1) % ludoraLetters.length;

        return (
          <motion.div
            key={letterData.letter}
            className="relative"
            initial={{ y: 0, scale: 1 }}
            animate={{
              y: isActive ? [-20, -40, -20, 0] : shouldBounce ? [-10, 0] : 0,
              scale: isActive ? [1, 1.3, 1.1, 1] : shouldBounce ? [1, 1.1, 1] : 1,
              rotateY: isActive ? [0, 180, 360] : 0,
            }}
            transition={{
              duration: isActive ? 1.2 : shouldBounce ? 0.6 : 0.4,
              ease: isActive ? "easeInOut" : "easeOut",
              delay: letterData.delay
            }}
          >
            {/* Letter shadow/glow effect */}
            <motion.div
              className={`absolute inset-0 blur-lg opacity-60 bg-gradient-to-br ${letterData.color}`}
              animate={{
                scale: isActive ? [1, 1.5, 1] : 1,
                opacity: isActive ? [0.6, 0.9, 0.6] : 0.4
              }}
              transition={{
                duration: 1.2,
                repeat: isActive ? Infinity : 0,
                ease: "easeInOut"
              }}
              style={{
                clipPath: 'text',
                WebkitClipPath: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: size === 'sm' ? '3rem' : size === 'lg' ? '5rem' : size === 'xl' ? '6rem' : '4rem',
                fontWeight: '900',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
              }}
            >
              {letterData.letter}
            </motion.div>

            {/* Main letter */}
            <motion.div
              className={`relative z-10 text-transparent bg-clip-text bg-gradient-to-br ${letterData.color} select-none`}
              style={{
                fontSize: size === 'sm' ? '3rem' : size === 'lg' ? '5rem' : size === 'xl' ? '6rem' : '4rem',
                fontWeight: '900',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                filter: isActive ? 'drop-shadow(0 0 20px currentColor)' : 'drop-shadow(0 2px 10px rgba(0,0,0,0.2))'
              }}
              animate={{
                filter: isActive
                  ? [
                      'drop-shadow(0 0 20px currentColor) hue-rotate(0deg)',
                      'drop-shadow(0 0 30px currentColor) hue-rotate(180deg)',
                      'drop-shadow(0 0 20px currentColor) hue-rotate(360deg)'
                    ]
                  : 'drop-shadow(0 2px 10px rgba(0,0,0,0.2))'
              }}
              transition={{
                duration: 1.2,
                repeat: isActive ? Infinity : 0,
                ease: "easeInOut"
              }}
            >
              {letterData.letter}
            </motion.div>

            {/* Sparkle particles for active letter */}
            {isActive && showParticles && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`sparkle-${i}`}
                    className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                    animate={{
                      x: Math.cos(i * 45 * Math.PI / 180) * (30 + i * 5),
                      y: Math.sin(i * 45 * Math.PI / 180) * (30 + i * 5),
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                      rotate: [0, 360]
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.1,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </>
            )}

            {/* Color wave effect */}
            <motion.div
              className="absolute inset-0 opacity-0"
              animate={{
                opacity: isActive ? [0, 0.3, 0] : 0,
              }}
              transition={{
                duration: 1.2,
                repeat: isActive ? Infinity : 0,
                ease: "easeInOut"
              }}
              style={{
                background: `linear-gradient(45deg, ${letterData.color.replace('from-', '').replace(' via-', ', ').replace(' to-', ', ')})`,
                mixBlendMode: 'overlay',
                borderRadius: '8px'
              }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );

  // Enhanced success animation component
  const SuccessAnimation = () => (
    <motion.div
      className={`${config.containerSize} relative flex items-center justify-center`}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 15, stiffness: 400 }}
    >
      {/* Success glow background */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 opacity-20 blur-xl"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.5, 1.2] }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      {/* Success ring with pulsing effect */}
      <motion.div
        className={`${config.spinner} absolute rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-xl`}
        initial={{ scale: 0, rotate: -180 }}
        animate={{
          scale: [0, 1.1, 1],
          rotate: 0
        }}
        transition={{
          scale: { duration: 0.8, times: [0, 0.6, 1], type: "spring" },
          rotate: { duration: 0.6, ease: "easeOut" }
        }}
      />

      {/* Inner success glow */}
      <motion.div
        className={`absolute w-16 h-16 ${size === 'lg' ? 'w-20 h-20' : ''} ${size === 'xl' ? 'w-24 h-24' : ''} ${size === 'sm' ? 'w-12 h-12' : ''} rounded-full bg-gradient-to-r from-green-300 to-emerald-400 opacity-50`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Animated check mark */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 0.4,
          type: "spring",
          damping: 12,
          stiffness: 500
        }}
      >
        <CheckCircle
          className={`w-8 h-8 ${size === 'lg' ? 'w-10 h-10' : ''} ${size === 'xl' ? 'w-12 h-12' : ''} ${size === 'sm' ? 'w-6 h-6' : ''} text-white drop-shadow-2xl`}
          style={{
            filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.8))'
          }}
        />
      </motion.div>

      {/* Enhanced success particles */}
      {showSuccessParty && [...Array(config.particles * 1.5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            scale: 0,
            x: 0,
            y: 0,
            opacity: 1
          }}
          animate={{
            scale: [0, 1, 0.5, 0],
            x: (Math.cos(i * 22.5) * (40 + i * 4)),
            y: (Math.sin(i * 22.5) * (40 + i * 4)),
            opacity: [1, 1, 0.5, 0],
            rotate: [0, 360]
          }}
          transition={{
            duration: 2,
            delay: i * 0.05,
            ease: "easeOut"
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: ['#10b981', '#059669', '#047857', '#fbbf24', '#f59e0b', '#8b5cf6', '#7c3aed'][i % 7]
            }}
          />
        </motion.div>
      ))}

      {/* Success ripple effect */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`ripple-${i}`}
          className="absolute border-2 border-green-400 rounded-full"
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{
            scale: [0, 3],
            opacity: [0.8, 0]
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.2,
            ease: "easeOut"
          }}
        />
      ))}
    </motion.div>
  );

  // Enhanced error animation component
  const ErrorAnimation = () => (
    <motion.div
      className={`${config.containerSize} relative flex items-center justify-center`}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 15, stiffness: 400 }}
    >
      {/* Error glow background */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-red-400 via-rose-500 to-pink-600 opacity-20 blur-xl"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.5, 1.2] }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      {/* Error ring with shake effect */}
      <motion.div
        className={`${config.spinner} absolute rounded-full bg-gradient-to-r from-red-400 to-red-600 shadow-xl`}
        initial={{ scale: 0 }}
        animate={{
          scale: [0, 1.1, 1],
          x: [0, -2, 2, -2, 2, 0]
        }}
        transition={{
          scale: { duration: 0.6, type: "spring" },
          x: { duration: 0.5, delay: 0.6 }
        }}
      />

      {/* Inner error glow */}
      <motion.div
        className={`absolute w-16 h-16 ${size === 'lg' ? 'w-20 h-20' : ''} ${size === 'xl' ? 'w-24 h-24' : ''} ${size === 'sm' ? 'w-12 h-12' : ''} rounded-full bg-gradient-to-r from-red-300 to-rose-400 opacity-50`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Animated X mark with shake */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0, rotate: -90 }}
        animate={{
          scale: 1,
          rotate: 0,
          x: [0, -1, 1, -1, 1, 0]
        }}
        transition={{
          scale: { delay: 0.3, type: "spring", damping: 12, stiffness: 500 },
          rotate: { delay: 0.3, duration: 0.4 },
          x: { delay: 0.8, duration: 0.4 }
        }}
      >
        <XCircle
          className={`w-8 h-8 ${size === 'lg' ? 'w-10 h-10' : ''} ${size === 'xl' ? 'w-12 h-12' : ''} ${size === 'sm' ? 'w-6 h-6' : ''} text-white drop-shadow-2xl`}
          style={{
            filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.8))'
          }}
        />
      </motion.div>

      {/* Error warning particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            scale: 0,
            x: 0,
            y: 0,
            opacity: 1
          }}
          animate={{
            scale: [0, 1, 0],
            x: (Math.cos(i * 45) * (30 + i * 3)),
            y: (Math.sin(i * 45) * (30 + i * 3)),
            opacity: [1, 0.5, 0],
          }}
          transition={{
            duration: 1.2,
            delay: 0.5 + i * 0.05,
            ease: "easeOut",
            repeat: 2
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: ['#ef4444', '#dc2626', '#b91c1c', '#fbbf24'][i % 4]
            }}
          />
        </motion.div>
      ))}

      {/* Error ripple effect */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`error-ripple-${i}`}
          className="absolute border-2 border-red-400 rounded-full"
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{
            scale: [0, 2.5],
            opacity: [0.8, 0]
          }}
          transition={{
            duration: 1.2,
            delay: i * 0.15,
            ease: "easeOut"
          }}
        />
      ))}
    </motion.div>
  );

  const getStatusMessage = () => {
    switch (status) {
      case "success":
        return "נשמר בהצלחה! 🎉";
      case "error":
        return "שגיאה בשמירה 😞";
      default:
        return message;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-8 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Main spinner/status animation */}
      <div className="mb-8 relative">
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              exit={{ scale: 0.8, opacity: 0, rotate: -180 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              {showLogo ? <LudoraLogoLoader /> : <LoadingSpinner />}
            </motion.div>
          )}
          {status === "success" && (
            <motion.div
              key="success"
              initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
            >
              <SuccessAnimation />
            </motion.div>
          )}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ scale: 0.5, opacity: 0, x: -20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 400 }}
            >
              <ErrorAnimation />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Enhanced status message with better typography */}
      <motion.div
        className="text-center max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", damping: 25, stiffness: 300 }}
      >
        <motion.p
          key={getStatusMessage()}
          className={`${config.text} font-semibold text-center ${getStatusColor()} mb-2`}
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '0.025em'
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 20 }}
        >
          {getStatusMessage()}
        </motion.p>

        {/* Subtle theme indicator */}
        <motion.div
          className="flex justify-center items-center gap-1 opacity-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.6 }}
        >
          <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${currentTheme.colors.primary}`} />
          <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${currentTheme.colors.secondary}`} />
          <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${currentTheme.colors.accent}`} />
        </motion.div>
      </motion.div>

      {/* Enhanced loading progress dots for loading state */}
      {status === "loading" && (
        <motion.div
          className="flex justify-center items-center gap-2 mt-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          {[0, 1, 2, 3, 4].map((index) => (
            <motion.div
              key={index}
              className="relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <motion.div
                className={`w-2 h-2 rounded-full bg-gradient-to-r ${currentTheme.colors.accent}`}
                animate={{
                  scale: [0.8, 1.4, 0.8],
                  opacity: [0.3, 1, 0.3],
                  y: [0, -8, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: index * 0.15,
                  ease: "easeInOut"
                }}
              />
              {/* Dot glow effect */}
              <motion.div
                className={`absolute inset-0 w-2 h-2 rounded-full bg-gradient-to-r ${currentTheme.colors.accent} blur-sm`}
                animate={{
                  scale: [1, 2, 1],
                  opacity: [0, 0.6, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: index * 0.15,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default LudoraLoadingSpinner;