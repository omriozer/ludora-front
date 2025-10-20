import React, { useState, useEffect, useMemo } from "react";
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

// Move static data outside component to prevent recreating on every render
const sizeConfig = {
  sm: {
    spinner: "w-14 h-14",
    text: "text-sm",
    particles: 6,
    icons: 3,
    containerSize: "w-28 h-28"
  },
  md: {
    spinner: "w-18 h-18",
    text: "text-base",
    particles: 8,
    icons: 4,
    containerSize: "w-36 h-36"
  },
  lg: {
    spinner: "w-22 h-22",
    text: "text-lg",
    particles: 10,
    icons: 5,
    containerSize: "w-44 h-44"
  },
  xl: {
    spinner: "w-28 h-28",
    text: "text-xl",
    particles: 12,
    icons: 6,
    containerSize: "w-52 h-52"
  }
};

const themes = {
  educational: {
    colors: {
      primary: "from-blue-400 via-blue-500 to-blue-600",
      secondary: "from-slate-400 via-slate-500 to-slate-600",
      accent: "from-indigo-400 via-indigo-500 to-indigo-600",
      background: "from-blue-50/10 via-indigo-50/10 to-slate-50/10",
      glow: "rgba(59, 130, 246, 0.3)"
    },
    icon: GraduationCap,
    floatingIcons: [BookOpen, Lightbulb, Brain, Calculator, Globe, Puzzle],
    name: "educational"
  },
  science: {
    colors: {
      primary: "from-emerald-400 via-emerald-500 to-emerald-600",
      secondary: "from-teal-400 via-teal-500 to-teal-600",
      accent: "from-green-400 via-green-500 to-green-600",
      background: "from-emerald-50/10 via-teal-50/10 to-green-50/10",
      glow: "rgba(16, 185, 129, 0.3)"
    },
    icon: Microscope,
    floatingIcons: [Atom, Microscope, Globe, Lightbulb, Target, Rocket],
    name: "science"
  },
  creative: {
    colors: {
      primary: "from-pink-400 via-pink-500 to-pink-600",
      secondary: "from-purple-400 via-purple-500 to-purple-600",
      accent: "from-rose-400 via-rose-500 to-rose-600",
      background: "from-pink-50/10 via-purple-50/10 to-rose-50/10",
      glow: "rgba(236, 72, 153, 0.3)"
    },
    icon: Palette,
    floatingIcons: [Palette, Music, PenTool, Heart, Star, Sparkles],
    name: "creative"
  },
  gaming: {
    colors: {
      primary: "from-violet-400 via-violet-500 to-violet-600",
      secondary: "from-purple-400 via-purple-500 to-purple-600",
      accent: "from-indigo-400 via-indigo-500 to-indigo-600",
      background: "from-violet-50/10 via-purple-50/10 to-indigo-50/10",
      glow: "rgba(139, 92, 246, 0.3)"
    },
    icon: Gamepad2,
    floatingIcons: [Gamepad2, Trophy, Target, Zap, Star, Puzzle],
    name: "gaming"
  },
  arcade: {
    colors: {
      primary: "from-orange-400 via-orange-500 to-orange-600",
      secondary: "from-yellow-400 via-yellow-500 to-yellow-600",
      accent: "from-amber-400 via-amber-500 to-amber-600",
      background: "from-orange-50/10 via-yellow-50/10 to-amber-50/10",
      glow: "rgba(251, 146, 60, 0.3)"
    },
    icon: Gamepad2,
    floatingIcons: [Gamepad2, Trophy, Star, Zap, Target, Sparkles],
    name: "arcade"
  },
  neon: {
    colors: {
      primary: "from-cyan-400 via-cyan-500 to-cyan-600",
      secondary: "from-blue-400 via-blue-500 to-blue-600",
      accent: "from-teal-400 via-teal-500 to-teal-600",
      background: "from-slate-800/20 via-gray-800/20 to-zinc-800/20",
      glow: "rgba(34, 211, 238, 0.4)"
    },
    icon: Zap,
    floatingIcons: [Zap, Star, Sparkles, Target, Trophy, Rocket],
    name: "neon"
  },
  space: {
    colors: {
      primary: "from-indigo-400 via-indigo-500 to-indigo-600",
      secondary: "from-blue-400 via-blue-500 to-blue-600",
      accent: "from-purple-400 via-purple-500 to-purple-600",
      background: "from-slate-900/20 via-indigo-900/20 to-purple-900/20",
      glow: "rgba(99, 102, 241, 0.3)"
    },
    icon: Rocket,
    floatingIcons: [Rocket, Star, Globe, Atom, Zap, Target],
    name: "space"
  }
};

const ludoraLetters = [
  { letter: 'L', color: 'from-teal-400 via-teal-500 to-cyan-600', delay: 0 },
  { letter: 'U', color: 'from-cyan-400 via-blue-400 to-teal-500', delay: 0.1 },
  { letter: 'D', color: 'from-yellow-400 via-amber-500 to-yellow-600', delay: 0.2 },
  { letter: 'O', color: 'from-orange-400 via-orange-500 to-amber-600', delay: 0.3 },
  { letter: 'R', color: 'from-orange-500 via-red-500 to-pink-600', delay: 0.4 },
  { letter: 'A', color: 'from-pink-500 via-rose-500 to-red-600', delay: 0.5 }
];

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

  // Use useMemo to prevent infinite re-renders
  const config = useMemo(() => sizeConfig[size] || sizeConfig.md, [size]);
  const currentTheme = useMemo(() => themes[theme] || themes.educational, [theme]);

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
  }, [status, showParticles, currentTheme.floatingIcons, config.icons]);

  // Letter cycling animation
  useEffect(() => {
    if (status === "loading" && showLogo) {
      const interval = setInterval(() => {
        setActiveLetter(prev => (prev + 1) % ludoraLetters.length);
      }, 800); // Change active letter every 800ms for smoother feel
      return () => clearInterval(interval);
    }
  }, [status, showLogo]); // Remove ludoraLetters.length since it's constant

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
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${currentTheme.colors.glow} 0%, transparent 70%)`
        }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.4, 0.8, 0.4]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Outer rotating ring with gradient border */}
      <motion.div
        className={`${config.spinner} absolute rounded-full`}
        style={{
          background: `conic-gradient(from 0deg, transparent 30%, ${currentTheme.colors.glow} 50%, transparent 70%)`,
          padding: '3px',
          borderRadius: '50%'
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className="w-full h-full bg-white/90 dark:bg-gray-900/90 rounded-full backdrop-blur-sm border border-white/20" />
      </motion.div>

      {/* Middle pulsing ring */}
      <motion.div
        className={`absolute ${size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-10 h-10' : size === 'lg' ? 'w-12 h-12' : 'w-16 h-16'} rounded-full`}
        style={{
          background: `radial-gradient(circle, ${currentTheme.colors.glow} 0%, transparent 60%)`,
        }}
        animate={{
          scale: [0.9, 1.1, 0.9],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Inner spinning ring */}
      <motion.div
        className={`absolute ${size === 'sm' ? 'w-6 h-6 border-1' : size === 'md' ? 'w-8 h-8 border-2' : size === 'lg' ? 'w-10 h-10 border-2' : 'w-12 h-12 border-2'} border-transparent rounded-full`}
        style={{
          borderTopColor: currentTheme.colors.glow,
          borderRightColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent'
        }}
        animate={{ rotate: -360 }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Center icon with enhanced animation */}
      <motion.div
        className="relative z-10"
        animate={{
          scale: [1, 1.08, 1],
          y: [0, -1, 0]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <currentTheme.icon
          className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : size === 'lg' ? 'w-6 h-6' : 'w-8 h-8'} text-white`}
          style={{
            filter: `drop-shadow(0 2px 12px ${currentTheme.colors.glow}) drop-shadow(0 0 6px rgba(255,255,255,0.4))`
          }}
        />
      </motion.div>

      {/* Floating educational icons */}
      {showParticles && floatingIcons.map((iconData) => {
        const { Icon, id, delay, angle } = iconData;
        const radius = size === 'sm' ? 35 : size === 'md' ? 45 : size === 'lg' ? 55 : 65;

        return (
          <motion.div
            key={id}
            className="absolute"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.5, 0],
              scale: [0, 0.8, 0],
              x: Math.cos((angle + currentFrame * 2) * Math.PI / 180) * radius,
              y: Math.sin((angle + currentFrame * 2) * Math.PI / 180) * radius,
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: delay,
              ease: "easeInOut"
            }}
          >
            <Icon
              className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-4 h-4' : 'w-5 h-5'} opacity-40`}
              style={{ color: currentTheme.colors.glow }}
            />
          </motion.div>
        );
      })}

      {/* Energy particles */}
      {showParticles && [...Array(Math.floor(config.particles * 0.6))].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: currentTheme.colors.glow,
            opacity: 0.6
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 0.8, 0],
            x: Math.cos((i * 45 + currentFrame * 3) * Math.PI / 180) * (25 + i * 2),
            y: Math.sin((i * 45 + currentFrame * 3) * Math.PI / 180) * (25 + i * 2),
          }}
          transition={{
            duration: 3 + (i % 2) * 0.5,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut"
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
              y: isActive ? [-15, -25, -15, 0] : shouldBounce ? [-8, 0] : 0,
              scale: isActive ? [1, 1.15, 1.05, 1] : shouldBounce ? [1, 1.05, 1] : 1,
              rotateY: isActive ? [0, 15, -15, 0] : 0,
            }}
            transition={{
              duration: isActive ? 1.5 : shouldBounce ? 0.8 : 0.5,
              ease: isActive ? [0.4, 0, 0.2, 1] : "easeOut",
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
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={`sparkle-${i}`}
                    className="absolute w-1 h-1 rounded-full"
                    style={{
                      left: '50%',
                      top: '50%',
                      backgroundColor: letterData.color.includes('teal') ? '#14b8a6' :
                                     letterData.color.includes('cyan') ? '#06b6d4' :
                                     letterData.color.includes('yellow') ? '#eab308' :
                                     letterData.color.includes('orange') ? '#ea580c' :
                                     letterData.color.includes('pink') ? '#ec4899' : '#f59e0b'
                    }}
                    animate={{
                      x: Math.cos(i * 90 * Math.PI / 180) * (20 + i * 3),
                      y: Math.sin(i * 90 * Math.PI / 180) * (20 + i * 3),
                      scale: [0, 0.8, 0],
                      opacity: [0, 0.9, 0]
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.15,
                      repeat: Infinity,
                      ease: "easeInOut"
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
      {showSuccessParty && [...Array(Math.floor(config.particles * 0.8))].map((_, i) => (
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
            scale: [0, 1, 0.3, 0],
            x: (Math.cos(i * 30) * (35 + i * 2)),
            y: (Math.sin(i * 30) * (35 + i * 2)),
            opacity: [1, 0.9, 0.3, 0],
            rotate: [0, 180]
          }}
          transition={{
            duration: 2.5,
            delay: i * 0.08,
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: ['#10b981', '#059669', '#fbbf24', '#f59e0b'][i % 4]
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
      {[...Array(6)].map((_, i) => (
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
            scale: [0, 0.8, 0],
            x: (Math.cos(i * 60) * (25 + i * 2)),
            y: (Math.sin(i * 60) * (25 + i * 2)),
            opacity: [1, 0.7, 0],
          }}
          transition={{
            duration: 1.5,
            delay: 0.4 + i * 0.08,
            ease: [0.4, 0, 0.2, 1],
            repeat: 1
          }}
        >
          <div
            className="w-1 h-1 rounded-full"
            style={{
              background: ['#ef4444', '#dc2626', '#fbbf24'][i % 3]
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
      className="flex flex-col items-center justify-center py-12 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Main spinner/status animation */}
      <div className="mb-10 relative">
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
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", damping: 25, stiffness: 300 }}
      >
        <motion.p
          key={getStatusMessage()}
          className={`${config.text} font-medium text-center ${getStatusColor()} mb-4 tracking-wide`}
          style={{
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            lineHeight: '1.6',
            fontWeight: '500'
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 20 }}
        >
          {getStatusMessage()}
        </motion.p>

        {/* Subtle theme indicator */}
        <motion.div
          className="flex justify-center items-center gap-2 opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.8 }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: currentTheme.colors.glow }}
          />
          <div
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: currentTheme.colors.glow, opacity: 0.7 }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: currentTheme.colors.glow }}
          />
        </motion.div>
      </motion.div>

      {/* Enhanced loading progress dots for loading state */}
      {status === "loading" && (
        <motion.div
          className="flex justify-center items-center gap-3 mt-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + index * 0.1 }}
            >
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentTheme.colors.glow }}
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.4, 1, 0.4],
                  y: [0, -4, 0]
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: "easeInOut"
                }}
              />
              {/* Dot glow effect */}
              <motion.div
                className="absolute inset-0 w-2 h-2 rounded-full blur-sm"
                style={{ backgroundColor: currentTheme.colors.glow }}
                animate={{
                  scale: [1, 1.8, 1],
                  opacity: [0, 0.5, 0]
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: index * 0.2,
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