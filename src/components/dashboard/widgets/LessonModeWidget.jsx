import React, { useState } from 'react';
import { Presentation } from 'lucide-react';
import ClassroomModeScreen from '@/components/classroom/ClassroomModeScreen';

/**
 * LessonModeWidget - Dashboard widget for entering classroom lesson mode
 * Provides a button to launch full-screen classroom mode with timer and effects
 */
const LessonModeWidget = ({ widgetId, settings = {} }) => {
  const [isClassroomModeOpen, setIsClassroomModeOpen] = useState(false);

  // Get button text from widget settings
  const buttonText = settings?.buttonText || "היכנס למצב שיעור";

  const handleOpenClassroomMode = () => {
    setIsClassroomModeOpen(true);
  };

  const handleCloseClassroomMode = () => {
    setIsClassroomModeOpen(false);
  };

  return (
    <>
      {/* Widget Content */}
      <div className="h-full flex items-center justify-center p-4">
        <button
          onClick={handleOpenClassroomMode}
          className="w-full h-full min-h-[120px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg md:text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
          aria-label={buttonText}
        >
          <Presentation className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 transition-transform duration-200" />
          <span className="text-center px-2 leading-tight">
            {buttonText}
          </span>
        </button>
      </div>

      {/* Classroom Mode Screen - Full Screen Overlay */}
      {isClassroomModeOpen && (
        <ClassroomModeScreen onClose={handleCloseClassroomMode} />
      )}
    </>
  );
};

export default LessonModeWidget;