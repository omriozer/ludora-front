import React, { useState } from 'react';
import { X, Search, AlertCircle, Keyboard } from 'lucide-react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/services/apiClient';
import { ludlog, luderror } from '@/lib/ludlog';
import ClassroomListView from './ClassroomListView';

// Validation schema for invitation code (6-character alphanumeric)
const discoverySchema = z.object({
  invitationCode: z
    .string()
    .length(6, 'קוד ההזמנה חייב להכיל 6 תווים')
    .regex(/^[A-Z0-9]+$/, 'קוד ההזמנה חייב להכיל רק אותיות גדולות ומספרים')
    .transform(val => val.toUpperCase())
});

/**
 * ClassroomDiscoveryModal Component
 * Main discovery interface for finding teacher classrooms via invitation code
 * Integrates with /student-portal/classrooms/discover API endpoint
 */
const ClassroomDiscoveryModal = ({ onClose, onJoinRequest }) => {
  const [discoveryState, setDiscoveryState] = useState({
    isSearching: false,
    hasSearched: false,
    classrooms: [],
    teacher: null,
    error: null
  });

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(discoverySchema),
    defaultValues: {
      invitationCode: ''
    }
  });

  const invitationCode = watch('invitationCode');

  // Handle invitation code discovery
  const onSubmit = async (data) => {
    try {
      setDiscoveryState({
        isSearching: true,
        hasSearched: false,
        classrooms: [],
        teacher: null,
        error: null
      });

      ludlog.ui('Discovering classrooms with invitation code:', { code: data.invitationCode });

      // Call discovery API endpoint
      const response = await apiRequest('/student-portal/classrooms/discover', {
        method: 'POST',
        body: JSON.stringify({ invitation_code: data.invitationCode })
      });

      ludlog.ui('Discovery successful:', { teacher: response.teacher?.full_name, classroomCount: response.classrooms?.length });

      setDiscoveryState({
        isSearching: false,
        hasSearched: true,
        classrooms: response.classrooms || [],
        teacher: response.teacher || null,
        error: null
      });
    } catch (error) {
      luderror.ui('Classroom discovery error:', error);

      setDiscoveryState({
        isSearching: false,
        hasSearched: true,
        classrooms: [],
        teacher: null,
        error: error.message || 'לא הצלחנו למצוא כיתות עם קוד זה. נסה שוב!'
      });
    }
  };

  // Handle input change with auto-uppercase
  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setValue('invitationCode', value, { shouldValidate: true });
  };

  // Handle join classroom click (for future phase)
  const handleJoinClick = (classroom) => {
    ludlog.ui('Join classroom clicked:', { classroomId: classroom.id, classroomName: classroom.name });
    onJoinRequest?.(classroom, discoveryState.teacher);
  };

  // Close modal handler
  const handleClose = () => {
    onClose?.();
  };

  // Escape key handler
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        {/* Modal Container */}
        <div className="mobile-safe-container bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mobile-no-scroll-x">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 mobile-padding rounded-t-2xl z-10">
            <div className="mobile-safe-flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold mobile-truncate">גלה כיתות</h2>
                <p className="text-sm opacity-90 mobile-safe-text">הזן את קוד ההזמנה של המורה שלך</p>
              </div>
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-2 rounded-lg flex-shrink-0"
                aria-label="סגור"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 mobile-padding">
            {/* Search Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
              <div className="mobile-safe-card bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border-2 border-purple-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Keyboard className="inline w-4 h-4 ml-1" />
                  קוד הזמנה (6 תווים)
                </label>

                <div className="mobile-safe-flex gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      {...register('invitationCode')}
                      type="text"
                      placeholder="ABC123"
                      maxLength={6}
                      value={invitationCode}
                      onChange={handleInputChange}
                      className={`mobile-safe-text text-center text-lg font-bold uppercase border-2 ${
                        errors.invitationCode
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-purple-300 focus:border-purple-500'
                      } rounded-lg h-12 tracking-wider`}
                      disabled={isSubmitting || discoveryState.isSearching}
                    />
                    {errors.invitationCode && (
                      <p className="text-red-600 text-xs mt-1 mobile-safe-text flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {errors.invitationCode.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || discoveryState.isSearching || invitationCode.length !== 6}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold px-6 h-12 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {discoveryState.isSearching ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent ml-2"></div>
                        מחפש...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 ml-2" />
                        חפש
                      </>
                    )}
                  </Button>
                </div>

                {/* Hint Text */}
                <p className="text-xs text-gray-600 mt-2 mobile-safe-text">
                  💡 קוד ההזמנה מורכב מ-6 אותיות ומספרים
                </p>
              </div>
            </form>

            {/* Error State */}
            {discoveryState.error && (
              <div className="mobile-safe-card mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="mobile-safe-flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-red-900 mobile-safe-text">לא נמצאו כיתות</h3>
                    <p className="text-sm text-red-700 mobile-safe-text">{discoveryState.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {discoveryState.hasSearched && !discoveryState.error && (
              <div className="mobile-safe-container">
                <ClassroomListView
                  classrooms={discoveryState.classrooms}
                  teacher={discoveryState.teacher}
                  onJoinClick={handleJoinClick}
                  isLoading={discoveryState.isSearching}
                />
              </div>
            )}

            {/* Initial State - Before Search */}
            {!discoveryState.hasSearched && !discoveryState.isSearching && (
              <div className="mobile-safe-card text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-4">
                  <Search className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">מוכן לגלות?</h3>
                <p className="text-gray-600 max-w-md mx-auto mobile-safe-text text-sm">
                  הזן את קוד ההזמנה שקיבלת מהמורה שלך כדי לראות את הכיתות הזמינות
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

ClassroomDiscoveryModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onJoinRequest: PropTypes.func // Callback for join request (future phase)
};

export default ClassroomDiscoveryModal;
