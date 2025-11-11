import React, { useState } from 'react';
import { Presentation, Clock } from 'lucide-react';
import ClassroomModeScreen from '@/components/classroom/ClassroomModeScreen';

/**
 * LessonModeWidget - Dashboard widget for entering classroom lesson mode
 * Provides a button to launch full-screen classroom mode with timer and effects
 */
const LessonModeWidget = ({ widgetId, settings = {} }) => {
  const [isClassroomModeOpen, setIsClassroomModeOpen] = useState(false);
  const [selectedTimerPreset, setSelectedTimerPreset] = useState(settings?.defaultTimer || 300);

  // Timer presets in seconds
  const timerPresets = [
    { label: '15 דקות', value: 900 },
    { label: '30 דקות', value: 1800 },
    { label: '45 דקות', value: 2700 },
    { label: '60 דקות', value: 3600 },
    { label: 'מותאם', value: 'custom' }
  ];

  // Get button text from widget settings
  const buttonText = settings?.buttonText || "היכנס למצב שיעור";

  const handleOpenClassroomMode = () => {
    setIsClassroomModeOpen(true);
  };

  const handleCloseClassroomMode = () => {
    setIsClassroomModeOpen(false);
  };

  const handleTimerPresetChange = (value) => {
    setSelectedTimerPreset(value);
  };

  return (
    <>
      {/* Widget Content */}
      <div className="h-full flex flex-col p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl">
        {/* Widget Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">מצב שיעור</h3>
          <p className="text-sm text-gray-600">היכנס למצב מצגת ללא הפרעות</p>
        </div>

        {/* Main Button */}
        <div className="flex-1 flex items-center justify-center mb-6">
          <button
            onClick={handleOpenClassroomMode}
            className="w-full h-full min-h-[120px] bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-lg md:text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
            aria-label={buttonText}
          >
            {/* Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <Presentation className="w-12 h-12 md:w-14 md:h-14 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative z-10" />
            <span className="text-center px-4 leading-tight relative z-10 group-hover:text-blue-100 transition-colors duration-300">
              {buttonText}
            </span>

            {/* Timer indicator */}
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <Clock className="w-3 h-3 text-white/40" />
              <span className="text-xs text-white/60">
                {selectedTimerPreset === 'custom' ? 'מותאם' :
                 selectedTimerPreset === 900 ? '15m' :
                 selectedTimerPreset === 1800 ? '30m' :
                 selectedTimerPreset === 2700 ? '45m' :
                 selectedTimerPreset === 3600 ? '60m' : '5m'}
              </span>
            </div>
          </button>
        </div>

        {/* Timer Preset Selector */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            זמן שיעור מוגדר מראש
          </label>
          <div className="grid grid-cols-2 gap-2">
            {timerPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleTimerPresetChange(preset.value)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  selectedTimerPreset === preset.value
                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Classroom Mode Screen - Full Screen Overlay */}
      {isClassroomModeOpen && (
        <ClassroomModeScreen
          onClose={handleCloseClassroomMode}
          defaultTimer={selectedTimerPreset === 'custom' ? 300 : selectedTimerPreset}
        />
      )}
    </>
  );
};

export default LessonModeWidget;