import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Game, User } from '@/services/entities';
import { getGameTypeName } from '@/config/gameTypes';
import gamePluginRegistry from '@/plugins/GamePluginRegistry';
import WizardShell from '@/components/shared/WizardShell';
import { createStepManager } from '@/utils/StepManager';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

// Import step components
import GameTypeStep from './GameTypeStep';
import GameDetailsStep from './GameDetailsStep';
import ContentRulesStep from './steps/ContentRulesStep';
import GamePreviewStep from './GamePreviewStep';

/**
 * GameBuilder V2 - Plugin-Based Game Creation Wizard
 *
 * This component replaces the original GameBuilder with a plugin-based
 * architecture that allows game types to customize their creation flow
 * while maintaining a consistent UX.
 */
export default function GameBuilderV2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Save status tracking for spinner
  const [saveStatus, setSaveStatus] = useState(null); // 'saving-draft', 'saving-final', 'success', 'error', null

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

  // Get the current plugin based on selected game type
  const currentPlugin = useMemo(() => {
    if (!gameData.game_type) return null;
    return gamePluginRegistry.getPlugin(gameData.game_type);
  }, [gameData.game_type]);

  // Define wizard steps with dynamic plugin customization
  const steps = useMemo(() => {
    const baseSteps = [
      {
        id: 'type',
        title: 'בחירת סוג משחק',
        component: GameTypeStep,
        validate: (data) => {
          const errors = {};
          if (!data.game_type) {
            errors.game_type = 'יש לבחור סוג משחק';
          }
          return {
            isValid: Object.keys(errors).length === 0,
            errors
          };
        }
      },
      {
        id: 'details',
        title: 'פרטי המשחק',
        component: GameDetailsStep,
        validate: (data) => {
          const errors = {};
          if (!data.title || data.title.length < 3) {
            errors.title = 'כותרת המשחק חייבת להכיל לפחות 3 תווים';
          }
          if (data.title && data.title.length > 100) {
            errors.title = 'כותרת המשחק לא יכולה להכיל יותר מ-100 תווים';
          }
          if (!data.short_description || data.short_description.length < 10) {
            errors.short_description = 'תיאור קצר חייב להכיל לפחות 10 תווים';
          }
          if (data.short_description && data.short_description.length > 500) {
            errors.short_description = 'תיאור קצר לא יכול להכיל יותר מ-500 תווים';
          }
          if (data.price < 0 || data.price > 1000) {
            errors.price = 'מחיר חייב להיות בין 0 ל-1000';
          }
          return {
            isValid: Object.keys(errors).length === 0,
            errors
          };
        }
      },
      {
        id: 'content_stages',
        title: 'תוכן ושלבי משחק',
        component: ContentRulesStep,
        tutorialAttribute: 'content-stages-tab',
        validate: (data) => {
          const errors = {};

          // Use plugin validation if available
          if (currentPlugin) {
            const pluginValidation = gamePluginRegistry.validateGameData(data.game_type, data);
            return pluginValidation;
          }

          // Default validation
          if (!data.content_stages || data.content_stages.length === 0) {
            errors.content_stages = 'יש להוסיף לפחות שלב אחד למשחק';
          } else {
            const hasContent = data.content_stages.some(stage =>
              stage.contentConnection?.content && Array.isArray(stage.contentConnection.content) && stage.contentConnection.content.length > 0
            );
            if (!hasContent) {
              errors.content_stages = 'יש להוסיף תוכן לפחות לשלב אחד';
            }
          }

          return {
            isValid: Object.keys(errors).length === 0,
            errors
          };
        }
      },
      {
        id: 'preview',
        title: 'תצוגה מקדימה',
        component: GamePreviewStep,
        tutorialAttribute: 'preview-tab',
        validate: () => ({ isValid: true, errors: {} })
      }
    ];

    // Use StepManager to handle plugin customizations
    const stepManager = createStepManager(baseSteps);
    const customizedSteps = stepManager.buildSteps(currentPlugin);

    // Validate the final steps configuration
    const validation = stepManager.validateSteps(customizedSteps);
    if (!validation.isValid) {
      console.error('Step validation errors:', validation.errors);
      // Fall back to base steps if customization fails
      return baseSteps;
    }

    return customizedSteps;
  }, [currentPlugin, gameData.game_type]);

  // Initialize and load game data
  useEffect(() => {
    checkUserAndLoadGame();
  }, [id]);

  // Set initial step based on edit mode
  useEffect(() => {
    if (isEditMode) {
      // In edit mode, start from step 1 (details) since game type cannot be changed
      setCurrentStep(1);
    }
  }, [isEditMode]);

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
        const game = await Game.findById(id);

        // Transform game data using plugin if available
        let transformedGame = game;
        if (game.game_type) {
          transformedGame = gamePluginRegistry.transformForEdit(game.game_type, game);
        }

        setGameData({
          ...gameData,
          ...transformedGame,
          skills: typeof transformedGame.skills === 'string'
            ? JSON.parse(transformedGame.skills)
            : (transformedGame.skills || []),
          game_settings: transformedGame.game_settings || {},
          content_stages: Array.isArray(transformedGame.content_stages)
            ? transformedGame.content_stages
            : []
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
    setGameData(prevGameData => {
      const updatedData = { ...prevGameData, ...newData };

      // If game type changed, notify the plugin
      if (newData.game_type && newData.game_type !== prevGameData.game_type) {
        gamePluginRegistry.onGameTypeSelected(newData.game_type, (pluginData) => {
          setGameData(prevData => ({ ...prevData, ...pluginData }));
        });
      }

      // If settings changed, notify the plugin
      if (newData.game_settings && updatedData.game_type) {
        gamePluginRegistry.onSettingsUpdated(
          updatedData.game_type,
          newData.game_settings,
          (pluginData) => {
            setGameData(prevData => ({ ...prevData, ...pluginData }));
          }
        );
      }

      return updatedData;
    });

    // Clear validation errors for updated fields
    setValidationErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      Object.keys(newData).forEach(key => {
        delete newErrors[key];
      });
      return newErrors;
    });
  }, []);

  const handleSave = async (data, isComplete = false) => {
    setIsSaving(true);
    setSaveStatus('saving-final');
    try {
      let gamePayload = {
        ...data,
        skills: JSON.stringify(data.skills),
        content_stages: data.content_stages || [],
        is_published: isComplete // Only publish if wizard is complete and valid
      };

      // Transform game data using plugin if available
      if (data.game_type) {
        gamePayload = gamePluginRegistry.transformForSave(data.game_type, gamePayload);
      }

      let savedGame;
      if (isEditMode) {
        savedGame = await Game.update(id, gamePayload);
      } else {
        savedGame = await Game.create(gamePayload);
      }

      setSaveStatus('success');
      setTimeout(() => {
        navigate('/games');
      }, 1500); // Wait for success animation
    } catch (error) {
      console.error('Error saving game:', error);
      setError(`שגיאה בשמירת המשחק: ${error.message}`);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async (data) => {
    setIsSavingDraft(true);
    setSaveStatus('saving-draft');
    try {
      // For drafts, only send fields that exist in the Game model with correct types
      let gamePayload = {
        // Basic Game model fields only
        title: data.title && data.title.length >= 3 ? data.title : 'טיוטת משחק חדש', // Ensure min 3 chars
        short_description: data.short_description && data.short_description.length >= 10 ? data.short_description : 'תיאור זמני למשחק זה', // Ensure min 10 chars
        description: data.description || '',
        game_type: data.game_type || '',
        price: typeof data.price === 'number' ? data.price : 0,
        skills: Array.isArray(data.skills) ? data.skills : [], // Keep as array, not stringified
        age_range: typeof data.age_range === 'object' && data.age_range !== null ? data.age_range : null, // Object field
        grade_range: typeof data.grade_range === 'object' && data.grade_range !== null ? data.grade_range : null, // Object field
        device_compatibility: data.device_compatibility || 'both',
        subject: data.subject || '',
        game_settings: typeof data.game_settings === 'object' ? data.game_settings : {},
        image_url: data.image_url || '',
        language: 'hebrew', // Required for update validation
        tags: [], // Required for update validation
        is_published: false // Always save as draft (not published)
        // Exclude: content_stages, content, scatter_settings, _structuredData, image_is_private, etc.
      };

      // Transform game data using plugin if available
      if (data.game_type) {
        gamePayload = gamePluginRegistry.transformForSave(data.game_type, gamePayload);

        // Clean up any fields that plugins might have added but aren't allowed for drafts
        const allowedFields = [
          'title', 'short_description', 'description', 'game_type', 'price',
          'skills', 'age_range', 'grade_range', 'device_compatibility',
          'subject', 'game_settings', 'image_url', 'language', 'tags', 'is_published'
        ];
        gamePayload = Object.fromEntries(
          Object.entries(gamePayload).filter(([key]) => allowedFields.includes(key))
        );
      }

      console.log('Draft save - isEditMode:', isEditMode, 'id:', id, 'payload:', gamePayload);

      let savedGame;
      if (isEditMode) {
        savedGame = await Game.update(id, gamePayload);
      } else {
        savedGame = await Game.create(gamePayload);
        // Only update URL and state AFTER successful save - switch to edit mode
        window.history.replaceState(null, '', `/games/edit/${savedGame.id}`);
        setIsEditMode(true);
      }

      // Show success message without navigating away
      setError(null);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Error saving draft:', error);
      setError(`שגיאה בשמירת הטיוטה: ${error.message}`);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCancel = () => {
    navigate('/games');
  };

  const wizardTitle = isEditMode ? 'עריכת משחק' : 'יצירת משחק חדש';
  const wizardSubtitle = gameData.game_type
    ? `סוג משחק: ${getGameTypeName(gameData.game_type)}`
    : null;

  const saveButtonText = isEditMode ? 'עדכן משחק' : 'צור משחק';

  return (
    <div className="relative">
      <WizardShell
        title={wizardTitle}
        subtitle={wizardSubtitle}
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        data={gameData}
        onDataChange={updateGameData}
        validationErrors={validationErrors}
        onSave={handleSave}
        onSaveDraft={handleSaveDraft}
        onCancel={handleCancel}
        isLoading={isLoading}
        isSaving={isSaving}
        isSavingDraft={isSavingDraft}
        error={error}
        isEditMode={isEditMode}
        saveButtonText={saveButtonText}
        draftButtonText="שמור כטיוטה"
        className="game-builder-v2"
        stepProps={{ isEditMode }} // Pass edit mode to all steps
      />

      {/* Save Status Overlay */}
      {saveStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-2xl">
            <LudoraLoadingSpinner
              message={
                saveStatus === 'saving-draft' ? 'שומר טיוטה...' :
                saveStatus === 'saving-final' ? 'שומר משחק...' :
                saveStatus === 'success' ? 'נשמר בהצלחה!' :
                saveStatus === 'error' ? 'שגיאה בשמירה' : 'שומר...'
              }
              status={
                saveStatus === 'saving-draft' || saveStatus === 'saving-final' ? 'loading' :
                saveStatus === 'success' ? 'success' :
                saveStatus === 'error' ? 'error' : 'loading'
              }
              size="lg"
              theme="arcade"
              onAnimationComplete={() => {
                if (saveStatus === 'success' || saveStatus === 'error') {
                  setSaveStatus(null);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}