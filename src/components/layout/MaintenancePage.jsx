import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import Footer from "./Footer";
import { riddles } from "@/assets/riddles";

export default function MaintenancePage({
  showReturnButton,
  isDraggingReturn,
  returnButtonPosition,
  handleReturnDrag,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleReturnToSelf,
  handleLogin,
  isTemporaryIssue = false
}) {
  // Riddles game state
  const [currentRiddle, setCurrentRiddle] = useState(null);
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'answered', 'showing-result'
  const [userAnswer, setUserAnswer] = useState(null); // true or false
  const [isCorrect, setIsCorrect] = useState(null);
  const [showGame, setShowGame] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null); // 'truth' or 'lie'
  const [flipCard, setFlipCard] = useState(false);

  // Initialize game when component mounts
  useEffect(() => {
    if(riddles.filter(r => r.approved).length === 0) return;
    const timer = setTimeout(() => {
      setShowGame(true);
      selectRandomRiddle();
    }, 2000); // Show game after 2 seconds

    return () => clearTimeout(timer);
  }, []);

  const selectRandomRiddle = () => {
    const filteredRiddles = riddles.filter(r => r.approved);
    if(filteredRiddles.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredRiddles.length);
    setCurrentRiddle(filteredRiddles[randomIndex]);
    setGameState('waiting');
    setUserAnswer(null);
    setIsCorrect(null);
    setSelectedCard(null);
    setFlipCard(false);
  };

  const handleAnswer = (answer) => {
    if (gameState !== 'waiting') return;

    setUserAnswer(answer);
    setSelectedCard(answer ? 'truth' : 'lie');
    setGameState('answered');
    setIsCorrect(answer === currentRiddle.isTrue);

    // Start flip animation
    setTimeout(() => {
      setFlipCard(true);
      setGameState('showing-result');
    }, 1000);

    // Reset and show new riddle after delay
    setTimeout(() => {
      selectRandomRiddle();
    }, 8000);
  };

  const getResultMessage = () => {
    if (isCorrect) {
      return "כל הכבוד! 🎉";
    } else {
      const messages = ["האמת...", "למעשה..."];
      return messages[Math.floor(Math.random() * messages.length)];
    }
  };

  const getAnswerText = () => {
    if (currentRiddle.isTrue) {
      return currentRiddle.explanation || "זה נכון!";
    } else {
      return currentRiddle.correctAnswer || "זה לא נכון.";
    }
  };
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" dir="rtl">
      {/* Light Background matching site theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-100/30 via-transparent to-blue-100/30"></div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Large floating circles */}
        <div className="absolute top-4 left-4 sm:top-10 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 max-w-[40vw] max-h-[40vh] bg-purple-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 w-56 h-56 sm:w-96 sm:h-96 max-w-[45vw] max-h-[45vh] bg-blue-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-64 sm:h-64 max-w-[35vw] max-h-[35vh] bg-pink-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200/10 to-transparent bg-[length:100px_100px] opacity-40"></div>
      </div>

      {/* Draggable Return Button - show when impersonating even in maintenance mode */}
      {showReturnButton && (
        <div
          className={`fixed z-[9997] ${isDraggingReturn ? 'cursor-grabbing' : 'cursor-grab'} select-none group`}
          style={{
            left: `${Math.max(10, Math.min(returnButtonPosition.x, window.innerWidth - 70))}px`,
            top: `${Math.max(10, Math.min(returnButtonPosition.y, window.innerHeight - 70))}px`,
            touchAction: 'none'
          }}
          onMouseDown={handleReturnDrag}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Button
            onClick={handleReturnToSelf}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-2xl border-2 sm:border-4 border-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white transition-all duration-300 transform hover:scale-105"
            aria-label="חזור למנהל"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          {/* Tooltip */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/80 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            גרור כדי להזיז • לחץ כדי לחזור למנהל
          </div>
        </div>
      )}

      {/* Main Content with better spacing */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative z-10 min-h-[80vh]">
        <div className="text-center max-w-4xl mx-auto">
          {/* Enhanced Icon with glow effect */}
          <div className="mb-6 sm:mb-8 relative">
            <div className="relative mx-auto w-20 h-20 md:w-24 md:h-24 group">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-500 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
              {/* Main icon */}
              <div
                className="relative w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer hover:rotate-6"
                onClick={handleLogin}
              >
                <ShieldAlert className="w-12 h-12 text-white drop-shadow-lg" />
              </div>
              {/* Floating particles around icon */}
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-purple-300 rounded-full animate-ping"></div>
              <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-blue-300 rounded-full animate-ping delay-300"></div>
            </div>
          </div>

          {/* Maintenance Message */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4 leading-tight">
              {isTemporaryIssue ? "בעיה זמנית במערכת" : "האתר בתחזוקה"}
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              {isTemporaryIssue ? (
                <>
                  יש בעיה זמנית שאנחנו מתקנים והאתר יחזור לעבוד בקרוב.
                  <br />
                  <span className="text-xl">תודה על הסבלנות 🙏</span>
                </>
              ) : (
                <>
                  אנחנו מבצעים שדרוגים ושיפורים כדי להעניק לכם חוויה טובה יותר.
                  <br />
                  <span className="text-xl">נשוב בקרוב! תודה על הסבלנות 🙏</span>
                </>
              )}
            </p>

            {/* Enhanced Progress Indicator */}
            <div className="relative mb-8 max-w-md mx-auto">
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 h-full rounded-full animate-pulse w-3/4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg animate-bounce"></div>
            </div>

            <p className="text-md text-gray-600 font-medium">
              {isTemporaryIssue ? "מתקנים את הבעיה..." : "משדרגים את המערכת..."}
            </p>
          </div>

          {/* Riddles Game */}
          {showGame && currentRiddle && (
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border border-white/30 relative overflow-hidden">
              {/* Card background pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50"></div>

              <div className="relative z-10">
                {/* Game Title */}
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 mb-4 sm:mb-6">
                  בנתיים, יש לנו שאלה בשבילך... 🤔
                </h2>

                {/* Riddle Statement */}
                <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-purple-100">
                  <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 leading-relaxed">
                    "{currentRiddle.statement}"
                  </p>
                </div>

                {/* Question */}
                <p className="text-lg sm:text-xl font-bold text-gray-700 mb-6 sm:mb-8">
                  האם זה... 🤷‍♂️
                </p>

                {/* Result Message */}
                {gameState === 'showing-result' && (
                  <div className={`mb-6 p-4 rounded-2xl ${isCorrect ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border-2 animate-bounce`}>
                    <p className={`text-2xl font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {getResultMessage()}
                    </p>
                  </div>
                )}

                {/* Answer Cards */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                  {/* Truth Card */}
                  <div className="relative">
                    <div
                      className={`
                        w-40 h-28 sm:w-44 sm:h-30 md:w-48 md:h-32 cursor-pointer transition-all duration-700 transform-style-preserve-3d
                        ${selectedCard === 'truth' && flipCard ? 'rotate-y-180' : ''}
                        ${gameState === 'waiting' ? 'hover:scale-105 hover:shadow-2xl' : ''}
                      `}
                      onClick={() => handleAnswer(true)}
                    >
                      {/* Front of card */}
                      <div className={`
                        absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl
                        flex items-center justify-center shadow-xl backface-hidden
                        ${selectedCard === 'truth' && gameState !== 'waiting' ? 'ring-4 ring-green-300' : ''}
                      `}>
                        <div className="text-center">
                          <CheckCircle className="w-8 h-8 text-white mx-auto mb-2" />
                          <span className="text-2xl font-bold text-white">אמת</span>
                        </div>
                      </div>

                      {/* Back of card */}
                      <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center shadow-xl rotate-y-180 backface-hidden border-4 border-green-300">
                        <div className="text-center p-4">
                          <p className="text-lg font-semibold text-gray-800 leading-tight">
                            {flipCard && selectedCard === 'truth' ? getAnswerText() : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* VS Text */}
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-400 my-2 sm:my-0">או</div>

                  {/* Lie Card */}
                  <div className="relative">
                    <div
                      className={`
                        w-40 h-28 sm:w-44 sm:h-30 md:w-48 md:h-32 cursor-pointer transition-all duration-700 transform-style-preserve-3d
                        ${selectedCard === 'lie' && flipCard ? 'rotate-y-180' : ''}
                        ${gameState === 'waiting' ? 'hover:scale-105 hover:shadow-2xl' : ''}
                      `}
                      onClick={() => handleAnswer(false)}
                    >
                      {/* Front of card */}
                      <div className={`
                        absolute inset-0 bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl
                        flex items-center justify-center shadow-xl backface-hidden
                        ${selectedCard === 'lie' && gameState !== 'waiting' ? 'ring-4 ring-red-300' : ''}
                      `}>
                        <div className="text-center">
                          <XCircle className="w-8 h-8 text-white mx-auto mb-2" />
                          <span className="text-2xl font-bold text-white">שקר</span>
                        </div>
                      </div>

                      {/* Back of card */}
                      <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center shadow-xl rotate-y-180 backface-hidden border-4 border-red-300">
                        <div className="text-center p-4">
                          <p className="text-lg font-semibold text-gray-800 leading-tight">
                            {flipCard && selectedCard === 'lie' ? getAnswerText() : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                {gameState === 'waiting' && (
                  <p className="text-gray-500 text-sm mt-6">
                    לחץ על הכרטיס שלדעתך נכון 👆
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with more spacing */}
      <div className="mt-auto relative z-10">
        <Footer isMaintenanceMode={true} />
      </div>

      {/* Enhanced Floating Elements - adjusted for light theme */}
      <div className="absolute top-12 right-4 sm:top-20 sm:right-20 opacity-80">
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-bounce shadow-lg"></div>
      </div>
      <div className="absolute bottom-32 left-4 sm:bottom-48 sm:left-20 opacity-80">
        <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-bounce delay-700 shadow-lg"></div>
      </div>
      <div className="absolute top-1/3 right-1/4 opacity-80 hidden sm:block">
        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-bounce delay-1000 shadow-lg"></div>
      </div>
      <div className="absolute top-2/3 left-1/4 opacity-80 hidden sm:block">
        <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-bounce delay-500 shadow-lg"></div>
      </div>

      {/* Additional sparkles */}
      <div className="absolute top-1/4 left-1/3 opacity-60 hidden md:block">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping shadow-md"></div>
      </div>
      <div className="absolute bottom-1/3 right-1/3 opacity-60 hidden md:block">
        <div className="w-3 h-3 bg-blue-400 rounded-full animate-ping delay-1000 shadow-md"></div>
      </div>
    </div>
  );
}
