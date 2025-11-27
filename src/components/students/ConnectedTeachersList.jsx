import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserIcon, GraduationCap, BookOpenIcon, ExternalLinkIcon } from 'lucide-react';

/**
 * ConnectedTeachersList - Reusable component to display list of connected teachers
 * Shows teacher information and provides navigation to their catalog
 *
 * Props:
 * - teachers: Array of teacher objects (supports multiple for future expansion)
 * - currentPlayer: Player object with teacher connection data
 * - className: Additional CSS classes
 * - variant: 'compact' | 'full' (display style)
 *
 * Expected Data Structure (Backend Requirements):
 * currentPlayer.teachers = [
 *   {
 *     id: string,               // Teacher's user ID
 *     full_name: string,        // Teacher's display name
 *     name: string,             // Teacher's short name (fallback)
 *     invitation_code: string,  // Teacher's invitation code (REQUIRED for navigation)
 *     email: string,            // Teacher's email (non-sensitive)
 *     subject: string,          // Teacher's subject/specialty (optional)
 *     // Additional non-sensitive fields as needed
 *   }
 * ]
 *
 * Backend TODO:
 * 1. Add 'teachers' field to player response (/players/me)
 * 2. Populate with selected User fields (avoid sensitive data)
 * 3. Ensure invitation_code is always included
 * 4. Support future multiple teacher connections
 */
const ConnectedTeachersList = ({
  teachers = [],
  currentPlayer = null,
  className = '',
  variant = 'full'
}) => {
  // Convert current player's teacher connection to array format for future compatibility
  const getConnectedTeachers = () => {
    if (!currentPlayer) return [];

    // TODO remove debug - temporary logging to understand data structure
    console.log('🔍 ConnectedTeachersList - currentPlayer data:', {
      currentPlayer,
      teacher_id: currentPlayer.teacher_id,
      teacher: currentPlayer.teacher,
      teachers: currentPlayer.teachers
    });

    // TODO remove debug - detailed teacher object inspection
    if (currentPlayer.teacher) {
      console.log('🔍 Detailed teacher object analysis:', {
        teacher_keys: Object.keys(currentPlayer.teacher),
        teacher_values: currentPlayer.teacher,
        has_invitation_code: 'invitation_code' in currentPlayer.teacher,
        invitation_code_value: currentPlayer.teacher.invitation_code,
        invitation_code_type: typeof currentPlayer.teacher.invitation_code
      });
    }

    // If explicit teachers array is provided, use it (future support for multiple teachers)
    if (teachers && teachers.length > 0) {
      console.log('📋 Using explicit teachers array:', teachers);
      return teachers;
    }

    // Expected backend structure: currentPlayer.teachers (array of teacher objects)
    // Each teacher should include: id, full_name, name, invitation_code, email (non-sensitive fields)
    if (currentPlayer.teachers && Array.isArray(currentPlayer.teachers)) {
      console.log('✅ Using currentPlayer.teachers array:', currentPlayer.teachers);
      return currentPlayer.teachers;
    }

    // Fallback: Legacy single teacher connection (currentPlayer.teacher)
    if (currentPlayer.teacher_id && currentPlayer.teacher) {
      console.log('🔄 Using legacy teacher object:', currentPlayer.teacher);

      // Ensure we have the required fields for navigation
      const teacher = {
        id: currentPlayer.teacher.id || currentPlayer.teacher_id,
        full_name: currentPlayer.teacher.full_name || currentPlayer.teacher.name || 'המורה שלי',
        name: currentPlayer.teacher.name || currentPlayer.teacher.full_name || 'המורה שלי',
        invitation_code: currentPlayer.teacher.invitation_code || null, // Don't fallback to ID yet
        // Add other non-sensitive fields as needed
        email: currentPlayer.teacher.email || null,
        subject: currentPlayer.teacher.subject || null
      };

      console.log('🔧 Constructed teacher object:', teacher);

      // If no invitation_code, we need to prevent navigation or find another way
      if (!teacher.invitation_code) {
        console.warn('⚠️ Missing invitation_code for teacher:', teacher);
        // For now, still include the teacher but flag the issue
        teacher._missingInvitationCode = true;
      }

      return [teacher];
    } else if (currentPlayer.teacher_id) {
      console.log('⚠️ Only teacher_id available, no teacher object:', currentPlayer.teacher_id);

      // Minimal fallback when only teacher_id is available
      return [{
        id: currentPlayer.teacher_id,
        full_name: 'המורה שלי',
        name: 'המורה שלי',
        invitation_code: null, // Don't use teacher_id as invitation_code
        email: null,
        subject: null,
        _missingInvitationCode: true
      }];
    }

    return [];
  };

  const connectedTeachers = getConnectedTeachers();

  // Don't render if no teachers connected
  if (connectedTeachers.length === 0) {
    return null;
  }

  const isCompact = variant === 'compact';

  return (
    <div className={`connected-teachers-list ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className={`font-bold text-gray-800 flex items-center gap-2 ${isCompact ? 'text-lg' : 'text-xl'}`}>
          <GraduationCap className={`text-purple-600 ${isCompact ? 'w-5 h-5' : 'w-6 h-6'}`} />
          {connectedTeachers.length === 1 ? 'המורה שלי' : 'המורים שלי'}
        </h3>
        {!isCompact && (
          <p className="text-gray-600 text-sm mt-1">
            מחובר ל{connectedTeachers.length === 1 ? 'מורה' : `${connectedTeachers.length} מורים`}
          </p>
        )}
      </div>

      {/* Teachers Grid */}
      <div className={`grid gap-4 ${connectedTeachers.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {connectedTeachers.map((teacher, index) => {
          const teacherCode = teacher.invitation_code;
          const teacherName = teacher.full_name || teacher.name || `מורה #${index + 1}`;
          const hasValidCode = teacherCode && !teacher._missingInvitationCode;

          // TODO remove debug
          console.log('🎯 Teacher card data:', { teacherCode, teacherName, hasValidCode, teacher });

          return (
            <Card
              key={teacher.id || index}
              className={`bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border-l-4 ${
                hasValidCode ? 'border-purple-500' : 'border-orange-500'
              } ${isCompact ? 'p-3' : 'p-4'}`}
            >
              <CardContent className={isCompact ? 'p-0' : 'p-0'}>
                <div className={`flex ${isCompact ? 'items-center justify-between' : 'flex-col space-y-4'}`}>

                  {/* Teacher Info */}
                  <div className={`flex items-center ${isCompact ? 'space-x-3' : 'space-x-4'}`}>
                    <div className={`rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 ${
                      isCompact ? 'w-10 h-10' : 'w-12 h-12'
                    }`}>
                      <UserIcon className={`text-white ${isCompact ? 'w-5 h-5' : 'w-6 h-6'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-gray-800 truncate ${isCompact ? 'text-base' : 'text-lg'}`}>
                        {teacherName}
                      </h4>
                      {!isCompact && teacher.subject && (
                        <p className="text-gray-600 text-sm truncate">{teacher.subject}</p>
                      )}
                      {isCompact && (
                        <p className={`text-xs ${hasValidCode ? 'text-gray-500' : 'text-orange-600'}`}>
                          {hasValidCode ? 'לצפייה בקטלוג' : 'קוד מורה חסר'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className={isCompact ? 'flex-shrink-0' : 'w-full'}>
                    {hasValidCode ? (
                      <Link to={`/portal/${teacherCode}`}>
                        <Button
                          className={`bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 ${
                            isCompact
                              ? 'px-4 py-2 text-sm'
                              : 'w-full py-3 text-base'
                          }`}
                        >
                          <BookOpenIcon className={`${isCompact ? 'w-4 h-4 mr-2' : 'w-5 h-5 mr-2'}`} />
                          {isCompact ? 'לקטלוג' : 'לצפייה בקטלוג המשחקים'}
                          {!isCompact && <ExternalLinkIcon className="w-4 h-4 mr-2" />}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        disabled
                        className={`bg-gray-400 text-gray-700 cursor-not-allowed shadow-lg transition-all duration-200 ${
                          isCompact
                            ? 'px-4 py-2 text-sm'
                            : 'w-full py-3 text-base'
                        }`}
                        title="קוד הזמנה של המורה לא זמין - יש צורך בעדכון מהשרת"
                      >
                        <BookOpenIcon className={`${isCompact ? 'w-4 h-4 mr-2' : 'w-5 h-5 mr-2'}`} />
                        {isCompact ? 'לא זמין' : 'קטלוג לא זמין זמנית'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Additional Info for Full Variant */}
                {!isCompact && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs">
                      {hasValidCode ? (
                        <>
                          <span className="text-green-600">✨ מחובר בהצלחה</span>
                          {teacher.games_count && (
                            <span className="text-gray-500">{teacher.games_count} משחקים זמינים</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-orange-600">⚠️ קוד מורה חסר</span>
                          <span className="text-gray-500">נדרש עדכון שרת</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ConnectedTeachersList;