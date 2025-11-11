import React, { useState, useEffect } from 'react';
import { X, Timer as TimerIcon, Sparkles, Edit3, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Timer from '@/components/ui/Timer';
import ClassroomEffectMenu from '@/components/ui/ClassroomEffectMenu';

/**
 * ClassroomModeScreen - Full-screen classroom mode interface
 * Provides timer controls, effects, and clean presentation environment
 */
const ClassroomModeScreen = ({ onClose, defaultTimer = 300 }) => {
  const [showTimer, setShowTimer] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('מצב שיעור');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  // ESC key handler for exit
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        // If editing title, cancel editing instead of closing
        if (isEditingTitle) {
          cancelEditingTitle();
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditingTitle]);

  // Prevent body scroll when classroom mode is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const toggleTimer = () => {
    setShowTimer(!showTimer);
  };

  const startEditingTitle = () => {
    setTempTitle(lessonTitle);
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    if (tempTitle.trim()) {
      setLessonTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setTempTitle('');
  };

  const handleTitleKeyPress = (event) => {
    if (event.key === 'Enter') {
      saveTitle();
    } else if (event.key === 'Escape') {
      cancelEditingTitle();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-white z-50 flex flex-col"
      data-presentation-area="true" // Mark as presentation area for effects
    >
      {/* Exit Button - Top Left */}
      <div className="absolute top-4 left-4 z-60">
        <Button
          onClick={onClose}
          size="lg"
          className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          title="יציאה ממצב שיעור (ESC)"
        >
          <X className="w-5 h-5" />
          <span className="font-semibold">יציאה</span>
        </Button>
      </div>

      {/* Title - Top Center */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-60">
        <div className="bg-gray-100 border border-gray-300 rounded-xl px-6 py-3 shadow-lg flex items-center gap-3">
          {isEditingTitle ? (
            <>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={handleTitleKeyPress}
                className="text-xl font-bold text-gray-800 text-center bg-white border border-gray-300 rounded-lg px-3 py-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="נושא השיעור"
                autoFocus
              />
              <Button
                onClick={saveTitle}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white p-2"
                title="שמור נושא השיעור"
              >
                <Check className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-800 text-center">
                {lessonTitle}
              </h1>
              <Button
                onClick={startEditingTitle}
                size="sm"
                variant="ghost"
                className="text-gray-600 hover:text-gray-800 p-2"
                title="ערוך נושא השיעור"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 pt-24">

        {/* Classroom Tools Container - Timer and Effects */}
        <div className="bg-gray-100 rounded-3xl p-8 border border-gray-300 shadow-2xl max-w-4xl w-full">

          {/* Timer Section */}
          <div className="text-center mb-8">
            <Button
              onClick={toggleTimer}
              size="lg"
              className={`${
                showTimer
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              } text-white text-2xl font-bold px-16 py-8 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 flex items-center gap-4`}
              title={showTimer ? "הסתרת הטיימר" : "הצגת הטיימר"}
            >
              <TimerIcon className="w-8 h-8" />
              <span>
                {showTimer ? "הסתר טיימר" : "הצג טיימר"}
              </span>
            </Button>

            {/* Timer Display */}
            {showTimer && (
              <div className="mt-8 flex justify-center">
                <Timer
                  defaultTime={defaultTimer}
                  isDraggable={true}
                  allowTimeChange={true}
                  className="scale-125" // Make timer larger for classroom visibility
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-300 my-8"></div>

          {/* Effects Section */}
          <div className="text-center">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-600 mb-2 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                אפקטי כיתה
              </h2>
              <p className="text-sm text-gray-500">
                לחצו על האפקטים להפעלה
              </p>
            </div>

            {/* Effects Menu */}
            <div className="flex justify-center">
              <ClassroomEffectMenu
                display={true}
                mode="embedded"
                layout="horizontal"
                effectsToExclude={[]} // Show all effects
              />
            </div>
          </div>
        </div>

      </div>

      {/* Instructions - Bottom */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-60">
        <div className="bg-gray-100 border border-gray-300 rounded-xl px-4 py-2 shadow-lg">
          <p className="text-sm text-gray-600 text-center">
            לחצו ESC או על כפתור היציאה לחזרה לדשבורד
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClassroomModeScreen;