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
  Sparkles
} from "lucide-react";

const LudoraLoadingSpinner = ({
  message = "טוען...",
  status = "loading", // 'loading', 'success', 'error'
  size = "md",
  theme = "arcade",
  showParticles = true,
  onAnimationComplete
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showSuccessParty, setShowSuccessParty] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: { spinner: "w-12 h-12", text: "text-sm", particles: 6 },
    md: { spinner: "w-16 h-16", text: "text-base", particles: 8 },
    lg: { spinner: "w-20 h-20", text: "text-lg", particles: 10 },
    xl: { spinner: "w-24 h-24", text: "text-xl", particles: 12 }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Theme configurations
  const themes = {
    arcade: {
      colors: {
        primary: "from-yellow-400 via-orange-500 to-red-500",
        secondary: "from-blue-400 via-purple-500 to-pink-500",
        accent: "from-green-400 to-emerald-500"
      },
      icon: Gamepad2
    },
    neon: {
      colors: {
        primary: "from-cyan-400 via-blue-500 to-purple-600",
        secondary: "from-pink-400 via-purple-500 to-indigo-600",
        accent: "from-emerald-400 to-teal-500"
      },
      icon: Zap
    },
    space: {
      colors: {
        primary: "from-indigo-400 via-purple-500 to-pink-500",
        secondary: "from-blue-400 via-indigo-500 to-purple-600",
        accent: "from-yellow-400 to-orange-500"
      },
      icon: Star
    }
  };

  const currentTheme = themes[theme] || themes.arcade;

  useEffect(() => {
    if (status === "loading") {
      const interval = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % 8);
      }, 150);
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

  // Loading spinner component
  const LoadingSpinner = () => (
    <motion.div
      className={`${config.spinner} relative flex items-center justify-center`}
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      {/* Outer pulsing ring */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${currentTheme.colors.primary} opacity-20`}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      {/* Middle spinning ring */}
      <motion.div
        className={`absolute inset-2 rounded-full border-4 border-transparent bg-gradient-to-r ${currentTheme.colors.secondary} bg-clip-border`}
        style={{
          borderImage: `linear-gradient(45deg, transparent, currentColor) 1`,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />

      {/* Center gaming icon */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <currentTheme.icon className={`w-6 h-6 text-white drop-shadow-lg`} />
      </motion.div>

      {/* Orbiting dots */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-2 h-2 rounded-full bg-gradient-to-r ${currentTheme.colors.accent}`}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.5
          }}
          style={{
            transformOrigin: `${config.spinner.includes('w-12') ? '24px' : config.spinner.includes('w-16') ? '32px' : '40px'} 0px`
          }}
        />
      ))}
    </motion.div>
  );

  // Success animation component
  const SuccessAnimation = () => (
    <motion.div
      className={`${config.spinner} relative flex items-center justify-center`}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.6 }}
    >
      {/* Success ring */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-500`}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.8, times: [0, 0.6, 1] }}
      />

      {/* Check mark */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, type: "spring", duration: 0.5 }}
      >
        <CheckCircle className="w-8 h-8 text-white drop-shadow-lg" />
      </motion.div>

      {/* Success particles */}
      {showSuccessParty && [...Array(config.particles)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: ['#fbbf24', '#f59e0b', '#10b981', '#06d6a0', '#8b5cf6'][i % 5]
          }}
          initial={{
            scale: 0,
            x: 0,
            y: 0,
            opacity: 1
          }}
          animate={{
            scale: [0, 1, 0],
            x: (Math.cos(i * 45) * 60),
            y: (Math.sin(i * 45) * 60),
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.1,
            ease: "easeOut"
          }}
        />
      ))}
    </motion.div>
  );

  // Error animation component
  const ErrorAnimation = () => (
    <motion.div
      className={`${config.spinner} relative flex items-center justify-center`}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.6 }}
    >
      {/* Error ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-red-400 to-red-600"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.1, 1] }}
        transition={{ duration: 0.6 }}
      />

      {/* Error shake animation */}
      <motion.div
        animate={{ x: [-2, 2, -2, 2, 0] }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <XCircle className="w-8 h-8 text-white drop-shadow-lg" />
      </motion.div>
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
    <div className="flex flex-col items-center justify-center py-8">
      {/* Main spinner/status animation */}
      <div className="mb-6">
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LoadingSpinner />
            </motion.div>
          )}
          {status === "success" && (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <SuccessAnimation />
            </motion.div>
          )}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <ErrorAnimation />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status message */}
      <motion.p
        key={getStatusMessage()}
        className={`${config.text} font-medium text-center ${getStatusColor()}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {getStatusMessage()}
      </motion.p>

      {/* Loading dots for loading state */}
      {status === "loading" && (
        <motion.div
          className="flex justify-center space-x-1 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full bg-gradient-to-r ${currentTheme.colors.primary}`}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: index * 0.2
              }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default LudoraLoadingSpinner;