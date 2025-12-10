import React from 'react';
import { Users, GraduationCap, CheckCircle2, XCircle } from 'lucide-react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { STUDENT_COLORS, STUDENT_GRADIENTS } from '@/styles/studentsColorSchema';

/**
 * ClassroomCard Component
 * Kid-friendly card display for individual classrooms in student portal
 * Shows classroom info, teacher, student count with visual indicators
 */
const ClassroomCard = ({
  classroom,
  teacher,
  onJoinClick,
  variant = 'default',
  className = ''
}) => {
  const isFull = classroom.current_student_count >= classroom.max_students;
  const isNearFull = classroom.current_student_count >= classroom.max_students * 0.8;

  // Calculate fill percentage for visual indicator
  const fillPercentage = (classroom.current_student_count / classroom.max_students) * 100;

  // Status colors using student portal design
  const statusConfig = {
    full: {
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: XCircle
    },
    nearFull: {
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: Users
    },
    available: {
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: CheckCircle2
    }
  };

  const status = isFull ? statusConfig.full : isNearFull ? statusConfig.nearFull : statusConfig.available;
  const StatusIcon = status.icon;

  // Compact variant for smaller display
  if (variant === 'compact') {
    return (
      <div
        className={`mobile-safe-card group flex items-center gap-3 p-3 bg-white rounded-xl border-2 ${status.border} hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${className}`}
      >
        {/* Status Indicator */}
        <div className={`${status.bg} p-2 rounded-lg flex-shrink-0`}>
          <StatusIcon className={`w-5 h-5 ${status.color}`} />
        </div>

        {/* Classroom Info */}
        <div className="flex-1 min-w-0">
          <h3 className="mobile-truncate font-bold text-gray-900 text-sm">{classroom.name}</h3>
          <p className="text-xs text-gray-600 mobile-truncate">{teacher?.full_name || 'מורה'}</p>
        </div>

        {/* Student Count */}
        <div className="text-left flex-shrink-0">
          <div className="text-xs text-gray-500">תלמידים</div>
          <div className={`font-bold ${status.color}`}>
            {classroom.current_student_count}/{classroom.max_students}
          </div>
        </div>
      </div>
    );
  }

  // Default variant - full card
  return (
    <Card className={`mobile-safe-card group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 ${status.border} ${className}`}>
      <CardHeader className="mobile-padding pb-3">
        {/* Classroom Name */}
        <CardTitle className="mobile-truncate text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          {classroom.name}
        </CardTitle>

        {/* Teacher Info */}
        <CardDescription className="mobile-safe-flex items-center gap-2 mt-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="mobile-truncate font-medium text-gray-700">
            {teacher?.full_name || 'מורה'}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="mobile-padding pb-4">
        {/* Classroom Description */}
        {classroom.description && (
          <p className="mobile-safe-text text-sm text-gray-600 mb-4 mobile-line-clamp-2">
            {classroom.description}
          </p>
        )}

        {/* Student Count Section */}
        <div className={`${status.bg} rounded-xl p-3 border ${status.border}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="mobile-safe-flex items-center gap-2">
              <Users className={`w-4 h-4 ${status.color} flex-shrink-0`} />
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">מקומות פנויים</span>
            </div>
            <div className={`text-lg font-bold ${status.color}`}>
              {classroom.current_student_count}/{classroom.max_students}
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isFull ? 'bg-gradient-to-r from-red-400 to-red-600' :
                isNearFull ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                'bg-gradient-to-r from-emerald-400 to-emerald-600'
              }`}
              style={{ width: `${Math.min(fillPercentage, 100)}%` }}
            />
          </div>

          {/* Status Text */}
          <div className={`text-xs font-medium mt-2 ${status.color} text-center`}>
            {isFull ? 'הכיתה מלאה' :
             isNearFull ? `עוד ${classroom.max_students - classroom.current_student_count} מקומות` :
             'יש הרבה מקום!'}
          </div>
        </div>
      </CardContent>

      <CardFooter className="mobile-padding pt-0">
        {/* Join Button - Disabled if full */}
        <Button
          onClick={() => onJoinClick?.(classroom)}
          disabled={isFull}
          className={`w-full mobile-safe-text font-bold py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
            isFull
              ? 'bg-gray-300 text-gray-600'
              : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white hover:shadow-xl'
          }`}
        >
          {isFull ? 'הכיתה מלאה' : 'הצטרף לכיתה'}
        </Button>
      </CardFooter>
    </Card>
  );
};

ClassroomCard.propTypes = {
  classroom: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    max_students: PropTypes.number.isRequired,
    current_student_count: PropTypes.number.isRequired,
    teacher_id: PropTypes.string
  }).isRequired,
  teacher: PropTypes.shape({
    id: PropTypes.string,
    full_name: PropTypes.string,
    email: PropTypes.string
  }),
  onJoinClick: PropTypes.func,
  variant: PropTypes.oneOf(['default', 'compact']),
  className: PropTypes.string
};

export default ClassroomCard;
