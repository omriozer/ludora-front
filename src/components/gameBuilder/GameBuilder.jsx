import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Game, User } from '@/services/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { getGameTypeName, getGameTypeConfig } from '@/config/gameTypes';
import GameTypeStep from './GameTypeStep';
import GameDetailsStep from './GameDetailsStep';
import ContentStagesStep from './steps/ContentRulesStep';
import GamePreviewStep from './GamePreviewStep';

const STEPS = [
  { id: 'type', title: 'בחירת סוג משחק', component: GameTypeStep },
  { id: 'details', title: 'פרטי המשחק', component: GameDetailsStep },
  { id: 'content_stages', title: 'תוכן ושלבי משחק', component: ContentStagesStep, tutorialAttribute: 'content-stages-tab' },
  { id: 'preview', title: 'תצוגה מקדימה', component: GamePreviewStep, tutorialAttribute: 'preview-tab' }
];

export default function GameBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Game data state
  const [gameData, setGameData] = useState({
    title: '',
    short_description: '',
    description: '',
    game_type: '',
    price: 0,
    is_published: false,
    image_url: '',
    subject: '',
    skills: [],
    age_range: '',
    grade_range: '',
    device_compatibility: 'both',
    game_settings: {},
    content_stages: [],
    content: {}
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    checkUserAndLoadGame();
  }, [id]);

  // Listen for tutorial step sync events
  useEffect(() => {
    const handleTutorialSetStep = (event) => {
      const { step } = event.detail;
      if (step !== undefined && step !== currentStep) {
        setCurrentStep(step);
      }
    };

    window.addEventListener('tutorialSetStep', handleTutorialSetStep);
    return () => {
      window.removeEventListener('tutorialSetStep', handleTutorialSetStep);
    };
  }, [currentStep]);

  const checkUserAndLoadGame = async () => {
    try {
      const user = await User.me();
      if (user.role !== 'admin') {
        setError('אין לך הרשאות ליצור או לערוך משחקים');
        return;
      }

      if (id) {
        // Edit mode - load existing game
        setIsEditMode(true);
        const game = await Game.get(id);
        setGameData({
          ...gameData,
          ...game,
          skills: typeof game.skills === 'string' ? JSON.parse(game.skills) : (game.skills || []),
          game_settings: game.game_settings || {},
          content_stages: Array.isArray(game.content_stages) ? game.content_stages : []
        });
      }
    } catch (error) {
      console.error('Error loading game:', error);
      setError('שגיאה בטעינת המשחק');
    } finally {
      setIsLoading(false);
    }
  };

  const updateGameData = useCallback((newData) => {
    setGameData(prevGameData => ({ ...prevGameData, ...newData }));
    // Clear validation errors for updated fields
    setValidationErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      Object.keys(newData).forEach(key => {
        delete newErrors[key];
      });
      return newErrors;
    });
  }, []);

  const validateCurrentStep = () => {
    const step = STEPS[currentStep];
    const errors = {};

    switch (step.id) {
      case 'type':
        if (!gameData.game_type) {
          errors.game_type = 'יש לבחור סוג משחק';
        }
        break;

      case 'details':
        if (!gameData.title || gameData.title.length < 3) {
          errors.title = 'כותרת המשחק חייבת להכיל לפחות 3 תווים';
        }
        if (gameData.title && gameData.title.length > 100) {
          errors.title = 'כותרת המשחק לא יכולה להכיל יותר מ-100 תווים';
        }
        if (!gameData.short_description || gameData.short_description.length < 10) {
          errors.short_description = 'תיאור קצר חייב להכיל לפחות 10 תווים';
        }
        if (gameData.short_description && gameData.short_description.length > 500) {
          errors.short_description = 'תיאור קצר לא יכול להכיל יותר מ-500 תווים';
        }
        if (gameData.price < 0 || gameData.price > 1000) {
          errors.price = 'מחיר חייב להיות בין 0 ל-1000';
        }
        break;

      case 'content_stages':
        // Validate that game has at least one stage with content
        if (!gameData.content_stages || gameData.content_stages.length === 0) {
          errors.content_stages = 'יש להוסיף לפחות שלב אחד למשחק';
        } else {
          // Check if any stage has actual content
          const hasContent = gameData.content_stages.some(stage =>
            stage.contentConnection?.content && Array.isArray(stage.contentConnection.content) && stage.contentConnection.content.length > 0
          );
          if (!hasContent) {
            errors.content_stages = 'יש להוסיף תוכן לפחות לשלב אחד';
          }
        }
        break;

      case 'preview':
        // No additional validation needed for preview
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Always allow navigation - validation shown in step components
  const isCurrentStepValid = useMemo(() => {
    return true; // Always allow next step, but validate on step change
  }, []);

  const handleNext = () => {
    if (validateCurrentStep() && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSaving(true);
    try {
      const gamePayload = {
        ...gameData,
        skills: JSON.stringify(gameData.skills),
        content_stages: gameData.content_stages || []
      };

      let savedGame;
      if (isEditMode) {
        savedGame = await Game.update(id, gamePayload);
      } else {
        savedGame = await Game.create(gamePayload);
      }

      navigate('/games');
    } catch (error) {
      console.error('Error saving game:', error);
      setError(`שגיאה בשמירת המשחק: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/games');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/games')} className="mt-4">
            חזרה לניהול משחקים
          </Button>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = STEPS[currentStep].component;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              חזרה
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditMode ? 'עריכת משחק' : 'יצירת משחק חדש'}
              </h1>
              {gameData.game_type && (
                <p className="text-gray-600 mt-1">
                  סוג משחק: {getGameTypeName(gameData.game_type)}
                </p>
              )}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold
                  ${index <= currentStep
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                  }
                `}>
                  {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                <span
                  className={`mr-2 text-sm font-medium ${
                    index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}
                  data-tutorial={step.tutorialAttribute || ''}
                >
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div className={`w-8 h-px mx-4 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="border-none shadow-xl bg-white">
          <CardContent className="p-8">
            <CurrentStepComponent
              gameData={gameData}
              updateGameData={updateGameData}
              onUpdate={updateGameData}
              validationErrors={validationErrors}
              isEditMode={isEditMode}
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            הקודם
          </Button>

          <div className="flex gap-4">
            <Button variant="outline" onClick={handleCancel}>
              ביטול
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                data-tutorial="publish-button"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    שומר...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {isEditMode ? 'עדכן משחק' : 'צור משחק'}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isCurrentStepValid}
                className="flex items-center gap-2"
                data-tutorial-next-step
              >
                הבא
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}