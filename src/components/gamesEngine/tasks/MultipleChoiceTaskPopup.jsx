import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Clock, CheckCircle, XCircle, Trophy } from 'lucide-react';

export default function MultipleChoiceTaskPopup({ 
  task, 
  missionSettings = {},
  onComplete, 
  onTimeout, 
  onClose,
  isPreview = false 
}) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);

  // Initialize timer
  useEffect(() => {
    if (missionSettings.time_limit_seconds && missionSettings.time_limit_seconds > 0) {
      setTimeLeft(missionSettings.time_limit_seconds);
    }
  }, [missionSettings.time_limit_seconds]);

  // Shuffle answers on mount
  useEffect(() => {
    if (task && task.correct_answers && task.incorrect_answers) {
      const correct = task.correct_answers.map(answer => ({
        text: answer.answer_text,
        isCorrect: true,
        points: answer.points || 1
      }));
      
      const incorrect = task.incorrect_answers.map(answer => ({
        text: answer,
        isCorrect: false,
        points: 0
      }));

      const allAnswers = [...correct, ...incorrect];
      // Shuffle answers
      const shuffled = allAnswers.sort(() => Math.random() - 0.5);
      setShuffledAnswers(shuffled);
    }
  }, [task]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsTimeout(true);
          setShowResult(true);
          if (onTimeout) onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResult, onTimeout]);

  const handleAnswerSelect = (answerIndex) => {
    if (showResult || isTimeout) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null || showResult) return;

    const answer = shuffledAnswers[selectedAnswer];
    const correct = answer.isCorrect;
    
    setIsCorrect(correct);
    setShowResult(true);

    // Call completion callback with result
    if (onComplete) {
      onComplete({
        correct,
        points: correct ? (missionSettings.points || answer.points || 1) : 0,
        selectedAnswer: answer.text,
        timeUsed: missionSettings.time_limit_seconds ? 
          (missionSettings.time_limit_seconds - (timeLeft || 0)) : null
      });
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-white shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">משימה</CardTitle>
                {isPreview && (
                  <p className="text-blue-100 text-sm">תצוגה מקדימה</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Timer */}
              {timeLeft !== null && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                  timeLeft <= 10 ? 'bg-red-500/20 text-red-100' : 'bg-white/20'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span className="font-mono">{formatTime(timeLeft)}</span>
                </div>
              )}
              
              {/* Points */}
              {missionSettings.points > 0 && (
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-lg">
                  <Trophy className="w-4 h-4" />
                  <span>{missionSettings.points}</span>
                </div>
              )}
              
              <Button
                onClick={handleClose}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Question */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 leading-relaxed">
              {task.question_text}
            </h3>
          </div>

          {/* Result Display */}
          {showResult && (
            <div className={`p-4 rounded-xl border-2 text-center ${
              isTimeout 
                ? 'bg-orange-50 border-orange-200' 
                : isCorrect 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-center gap-3 mb-2">
                {isTimeout ? (
                  <>
                    <Clock className="w-6 h-6 text-orange-600" />
                    <span className="text-lg font-bold text-orange-700">הזמן נגמר!</span>
                  </>
                ) : isCorrect ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-lg font-bold text-green-700">תשובה נכונה!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-600" />
                    <span className="text-lg font-bold text-red-700">תשובה שגויה</span>
                  </>
                )}
              </div>
              
              {isCorrect && missionSettings.points > 0 && (
                <div className="text-sm text-green-600">
                  זכית ב-{missionSettings.points} נקודות! 🎉
                </div>
              )}
              
              {!isTimeout && !isCorrect && (
                <div className="text-sm text-gray-600">
                  התשובה הנכונה: {task.correct_answers[0]?.answer_text}
                </div>
              )}
            </div>
          )}

          {/* Answers */}
          {!showResult && (
            <div className="space-y-3">
              {shuffledAnswers.map((answer, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isTimeout}
                  className={`w-full p-4 text-right rounded-xl border-2 transition-all ${
                    selectedAnswer === index
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  } ${isTimeout ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswer === index
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedAnswer === index && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-lg">{answer.text}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            {!showResult && !isTimeout && (
              <Button
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                שלח תשובה
              </Button>
            )}
            
            {showResult && (
              <Button
                onClick={handleClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6"
              >
                סגור
              </Button>
            )}
            
            <Button
              onClick={handleClose}
              variant="outline"
              className="px-6"
            >
              {showResult ? 'סגור' : 'ביטול'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}