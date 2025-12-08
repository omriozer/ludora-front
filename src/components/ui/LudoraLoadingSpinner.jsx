import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Sparkles } from "lucide-react";

// Configuration for different sizes
const sizeConfig = {
  sm: {
    fontSize: '2.5rem',
    gap: '0.25rem',
    containerPadding: 'py-8 px-4'
  },
  md: {
    fontSize: '4rem',
    gap: '0.5rem',
    containerPadding: 'py-12 px-6'
  },
  lg: {
    fontSize: '5rem',
    gap: '0.75rem',
    containerPadding: 'py-16 px-8'
  },
  xl: {
    fontSize: '6rem',
    gap: '1rem',
    containerPadding: 'py-20 px-10'
  }
};

// Educational theme colors only
const educationalTheme = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  accent: '#8b5cf6'
};

// Ludora letters matching the actual logo colors
const ludoraLetters = [
  { letter: 'L', colors: ['#00C2C7', '#00A8B5', '#008E9B'] },
  { letter: 'logo', colors: ['#00C2C7', '#00A8B5', '#008E9B'] }, // SVG logo replaces 'u'
  { letter: 'd', colors: ['#FFD700', '#FFC107', '#FF8F00'] },
  { letter: 'o', colors: ['#FF8C00', '#FF7043', '#F4511E'] },
  { letter: 'r', colors: ['#FF4B6E', '#F06292', '#E91E63'] },
  { letter: 'a', colors: ['#FF4B6E', '#F06292', '#E91E63'] }
];

const LudoraLoadingSpinner = ({
  message = "טוען...",
  status = "loading", // 'loading', 'success', 'error'
  size = "md",
  showParticles = true,
  onAnimationComplete
}) => {
  const [activeLetter, setActiveLetter] = useState(0);

  const config = sizeConfig[size] || sizeConfig.md;

  // Letter cycling animation for loading state
  useEffect(() => {
    if (status === "loading") {
      const interval = setInterval(() => {
        setActiveLetter(prev => (prev + 1) % ludoraLetters.length);
      }, 600);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Handle status changes and animation completion
  useEffect(() => {
    if (status !== "loading") {
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onAnimationComplete]);

  const getStatusMessage = () => {
    switch (status) {
      case "success":
        return "הושלם בהצלחה! 🎉";
      case "error":
        return "אירעה שגיאה 😞";
      default:
        return message;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "error":
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return null;
    }
  };

  const LetterComponent = ({ letterData, isActive }) => {
    const [color1, color2, color3] = letterData.colors;
    const isLogo = letterData.letter === 'logo';

    // Calculate logo size based on config fontSize
    const getLogoSize = () => {
      const fontSizeNum = parseFloat(config.fontSize);
      return `${fontSizeNum * 0.8}rem`; // Logo is slightly smaller than text
    };

    if (isLogo) {
      return (
        <motion.div
          className="relative select-none flex items-center justify-center"
          style={{
            width: getLogoSize(),
            height: getLogoSize(),
          }}
          initial={{ y: 0, scale: 1 }}
          animate={{
            y: isActive ? [-10, -20, -10, 0] : 0,
            scale: isActive ? [1, 1.1, 1.05, 1] : 1,
            rotateY: isActive ? [0, 10, -10, 0] : 0,
          }}
          transition={{
            duration: isActive ? 1.2 : 0.3,
            ease: isActive ? [0.4, 0, 0.2, 1] : "easeOut"
          }}
        >
          {/* Logo glow/shadow */}
          <motion.div
            className="absolute inset-0 blur-lg"
            animate={{
              scale: isActive ? [1, 1.3, 1] : 1,
              opacity: isActive ? [0.6, 0.9, 0.6] : 0.4
            }}
            transition={{
              duration: 1.2,
              repeat: isActive ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <img
              src="/logo_sm.svg"
              alt="Ludora Logo"
              className="w-full h-full"
              style={{
                filter: `drop-shadow(0 0 20px ${color2})`
              }}
            />
          </motion.div>

          {/* Main logo */}
          <motion.div
            className="relative z-10 w-full h-full"
            animate={{
              filter: isActive
                ? [
                    `drop-shadow(0 0 20px ${color2})`,
                    `drop-shadow(0 0 30px ${color1})`,
                    `drop-shadow(0 0 20px ${color2})`
                  ]
                : 'drop-shadow(0 2px 10px rgba(0,0,0,0.2))'
            }}
            transition={{
              duration: 1.2,
              repeat: isActive ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <img
              src="/logo_sm.svg"
              alt="Ludora Logo"
              className="w-full h-full"
            />
          </motion.div>

          {/* Sparkle particles for active logo */}
          {isActive && showParticles && (
            <>
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={`sparkle-${i}`}
                  className="absolute w-1.5 h-1.5"
                  style={{
                    left: '50%',
                    top: '50%',
                    backgroundColor: color2
                  }}
                  animate={{
                    x: Math.cos(i * 90 * Math.PI / 180) * (30 + i * 5),
                    y: Math.sin(i * 90 * Math.PI / 180) * (30 + i * 5),
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                    rotate: [0, 360]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.1,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles className="w-full h-full" />
                </motion.div>
              ))}
            </>
          )}
        </motion.div>
      );
    }

    // Original letter rendering for non-logo letters
    return (
      <motion.div
        className="relative select-none"
        style={{
          fontSize: config.fontSize,
          fontWeight: '600',
          fontFamily: 'Atma-SemiBold, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
        }}
        initial={{ y: 0, scale: 1 }}
        animate={{
          y: isActive ? [-10, -20, -10, 0] : 0,
          scale: isActive ? [1, 1.1, 1.05, 1] : 1,
          rotateY: isActive ? [0, 10, -10, 0] : 0,
        }}
        transition={{
          duration: isActive ? 1.2 : 0.3,
          ease: isActive ? [0.4, 0, 0.2, 1] : "easeOut"
        }}
      >
        {/* Letter glow/shadow */}
        <motion.div
          className="absolute inset-0 blur-lg opacity-60"
          style={{
            background: `linear-gradient(135deg, ${color1} 0%, ${color2} 50%, ${color3} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }}
          animate={{
            scale: isActive ? [1, 1.3, 1] : 1,
            opacity: isActive ? [0.6, 0.9, 0.6] : 0.4
          }}
          transition={{
            duration: 1.2,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut"
          }}
        >
          {letterData.letter}
        </motion.div>

        {/* Main letter */}
        <motion.div
          className="relative z-10"
          style={{
            background: `linear-gradient(135deg, ${color1} 0%, ${color2} 50%, ${color3} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            filter: isActive ? `drop-shadow(0 0 20px ${color2})` : 'drop-shadow(0 2px 10px rgba(0,0,0,0.2))'
          }}
          animate={{
            filter: isActive
              ? [
                  `drop-shadow(0 0 20px ${color2})`,
                  `drop-shadow(0 0 30px ${color1})`,
                  `drop-shadow(0 0 20px ${color2})`
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
                className="absolute w-1.5 h-1.5"
                style={{
                  left: '50%',
                  top: '50%',
                  backgroundColor: color2
                }}
                animate={{
                  x: Math.cos(i * 90 * Math.PI / 180) * (30 + i * 5),
                  y: Math.sin(i * 90 * Math.PI / 180) * (30 + i * 5),
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 360]
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Sparkles className="w-full h-full" />
              </motion.div>
            ))}
          </>
        )}
      </motion.div>
    );
  };

  const StatusOverlay = () => {
    if (status === 'loading') return null;

    return (
      <motion.div
        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 backdrop-blur-sm rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 400 }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", damping: 12, stiffness: 500 }}
          >
            {getStatusIcon()}
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <motion.div
      className={`flex flex-col items-center justify-center ${config.containerPadding}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Logo Animation */}
      <motion.div
        className="relative flex items-center justify-center"
        style={{ gap: config.gap, direction: 'ltr' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {ludoraLetters.map((letterData, index) => {
          const isActive = status === 'loading' && index === activeLetter;

          return (
            <LetterComponent
              key={letterData.letter}
              letterData={letterData}
              isActive={isActive}
            />
          );
        })}

        {/* Status overlay */}
        <StatusOverlay />
      </motion.div>

      {/* Status Message */}
      <motion.div
        className="text-center mt-8 max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", damping: 25, stiffness: 300 }}
      >
        <motion.p
          key={getStatusMessage()}
          className={`text-lg font-medium text-center tracking-wide ${
            status === 'success' ? 'text-green-600' :
            status === 'error' ? 'text-red-600' : 'text-gray-600'
          }`}
          style={{
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            lineHeight: '1.6'
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 20 }}
        >
          {getStatusMessage()}
        </motion.p>
      </motion.div>

      {/* Loading dots animation */}
      {status === "loading" && (
        <motion.div
          className="flex justify-center items-center gap-2 mt-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: educationalTheme.primary }}
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.5, 1, 0.5],
                y: [0, -4, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Background particles */}
      {showParticles && status === "loading" && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`bg-particle-${i}`}
              className="absolute w-1 h-1 rounded-full opacity-30"
              style={{
                backgroundColor: educationalTheme.accent,
                left: `${10 + (i * 10)}%`,
                top: `${20 + (i % 3) * 30}%`
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 0.6, 0],
                y: [0, -20, 0],
                x: [0, Math.sin(i) * 10, 0]
              }}
              transition={{
                duration: 3 + (i % 2),
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default LudoraLoadingSpinner;