import React from 'react';
import { School, Sparkles } from 'lucide-react';
import PropTypes from 'prop-types';
import ClassroomCard from './ClassroomCard';

/**
 * ClassroomListView Component
 * Container for displaying classroom cards in a responsive grid
 * Handles loading, empty states, and mobile-safe layouts
 */
const ClassroomListView = ({
  classrooms = [],
  teacher = null,
  onJoinClick,
  isLoading = false,
  variant = 'default',
  className = ''
}) => {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`mobile-safe-container ${className}`}>
        <div className="mobile-safe-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mobile-gap animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mobile-safe-card">
              <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mobile-padding">
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-20 bg-gray-100 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state - no classrooms found
  if (!classrooms || classrooms.length === 0) {
    return (
      <div className={`mobile-safe-container ${className}`}>
        <div className="mobile-safe-card text-center py-12 px-4 mobile-padding">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border-2 border-purple-200">
            {/* Empty State Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full mb-4">
              <School className="w-10 h-10 text-white" />
            </div>

            {/* Empty State Text */}
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              לא נמצאו כיתות
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mobile-safe-text">
              {teacher
                ? `המורה ${teacher.full_name || ''} עדיין לא יצר כיתות. נסה שוב מאוחר יותר!`
                : 'לא נמצאו כיתות זמינות כרגע. נסה שוב מאוחר יותר!'}
            </p>

            {/* Decorative Elements */}
            <div className="flex items-center justify-center gap-2 mt-6 opacity-50">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <Sparkles className="w-5 h-5 text-blue-400" />
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant - stacked list view
  if (variant === 'compact') {
    return (
      <div className={`mobile-safe-container space-y-2 ${className}`}>
        {classrooms.map((classroom) => (
          <ClassroomCard
            key={classroom.id}
            classroom={classroom}
            teacher={teacher}
            onJoinClick={onJoinClick}
            variant="compact"
          />
        ))}
      </div>
    );
  }

  // Default variant - responsive grid
  return (
    <div className={`mobile-safe-container ${className}`}>
      {/* Teacher Header - show when teacher info is available */}
      {teacher && (
        <div className="mobile-safe-card mb-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border-2 border-purple-200">
          <div className="mobile-safe-flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
              <School className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="mobile-truncate font-bold text-gray-900 text-lg">
                הכיתות של {teacher.full_name || 'המורה'}
              </h2>
              <p className="text-sm text-gray-600 mobile-truncate">
                {classrooms.length} {classrooms.length === 1 ? 'כיתה זמינה' : 'כיתות זמינות'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Classrooms Grid */}
      <div className="mobile-safe-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mobile-gap">
        {classrooms.map((classroom) => (
          <ClassroomCard
            key={classroom.id}
            classroom={classroom}
            teacher={teacher}
            onJoinClick={onJoinClick}
            variant="default"
          />
        ))}
      </div>
    </div>
  );
};

ClassroomListView.propTypes = {
  classrooms: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
      max_students: PropTypes.number.isRequired,
      current_student_count: PropTypes.number.isRequired,
      teacher_id: PropTypes.string
    })
  ),
  teacher: PropTypes.shape({
    id: PropTypes.string,
    full_name: PropTypes.string,
    email: PropTypes.string
  }),
  onJoinClick: PropTypes.func,
  isLoading: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'compact']),
  className: PropTypes.string
};

export default ClassroomListView;
