import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clog } from '@/lib/utils';

const TutorialContext = createContext();

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

export const TutorialProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTutorial, setCurrentTutorial] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isWaitingForAction, setIsWaitingForAction] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Apply tutorial step classes and handle highlighting
  useEffect(() => {
    if (!isActive || !currentTutorial) {
      // Remove all tutorial classes when tutorial is not active
      document.body.classList.remove(...Object.keys(tutorials).map(id => `tutorial-${id}`));
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
      return;
    }

    const currentStepData = currentTutorial.steps[currentStep];

    // Add tutorial body class for current tutorial
    document.body.classList.add(`tutorial-${currentTutorial.id}`);
    document.body.classList.add(`tutorial-step-${currentStepData.id}`);

    // Apply highlighting with retry logic for better timing
    const applyHighlighting = (retryCount = 0) => {
      if (currentStepData.targetSelectors) {
        let foundElements = 0;

        currentStepData.targetSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          clog(`Tutorial: Looking for selector "${selector}", found ${elements.length} elements`);

          if (elements.length > 0) {
            foundElements++;
            elements.forEach(el => {
              el.classList.add('tutorial-highlight');
              clog('Tutorial: Added highlight to element', el);

              // Auto-focus input fields
              if (currentStepData.action === 'input' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                setTimeout(() => {
                  el.focus();
                  clog('Tutorial: Focused input element', el);
                }, 200);
              }
            });
          }
        });

        clog(`Tutorial: Found ${foundElements} element groups, retry count: ${retryCount}`);

        // If no elements found and we haven't retried too many times, try again
        if (foundElements === 0 && retryCount < 5) {
          setTimeout(() => applyHighlighting(retryCount + 1), 100 * (retryCount + 1));
        }
      }
    };

    // Initial highlighting attempt
    applyHighlighting();

    // Set up MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Only re-apply highlighting if new nodes were added
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any of the added nodes or their children match our selectors
          const hasTargetElements = currentStepData.targetSelectors?.some(selector => {
            return Array.from(mutation.addedNodes).some(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                return node.matches?.(selector) || node.querySelector?.(selector);
              }
              return false;
            });
          });

          if (hasTargetElements) {
            clog('Tutorial: MutationObserver detected target elements added');
            // Debounce the highlighting to avoid excessive calls
            setTimeout(() => applyHighlighting(), 50);
          }
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup function
    return () => {
      observer.disconnect();
      document.body.classList.remove(`tutorial-step-${currentStepData.id}`);
      if (currentStepData.targetSelectors) {
        currentStepData.targetSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.classList.remove('tutorial-highlight'));
        });
      }
    };
  }, [isActive, currentStep, currentTutorial]);

  // Add event listeners to tutorial elements for auto-advance
  useEffect(() => {
    if (!isActive || !currentTutorial) return;

    const currentStepData = currentTutorial.steps[currentStep];

    if (currentStepData.action === 'click' && currentStepData.targetSelectors) {
      const handleElementClick = (e) => {
        // Check if any of the target selectors match
        const isTargetClick = currentStepData.targetSelectors.some(selector => {
          return e.target.closest(selector);
        });

        if (isTargetClick) {
          // Small delay to let the actual action complete
          setTimeout(() => {
            completeStep();
          }, 100);
        }
      };

      document.addEventListener('click', handleElementClick, true);
      return () => {
        document.removeEventListener('click', handleElementClick, true);
      };
    }

    // Removed auto-advance on input - will be handled by next button
  }, [isActive, currentStep, currentTutorial]);

  // Tutorial definitions
  const tutorials = {
    'game-creation': {
      id: 'game-creation',
      name: 'יצירת משחק מאפס עד סוף',
      steps: [
        {
          id: 'start',
          route: '/admin/help/game-creation-tutorial',
          title: 'ברוכים הבאים למדריך יצירת משחק',
          content: 'בואו ניצור יחד את המשחק הראשון שלכם! נתחיל בבחירת סוג המשחק.',
          action: 'navigate',
          target: '/games/create',
          targetSelector: null,
          position: 'center'
        },
        {
          id: 'game-type-selection',
          route: '/games/create',
          title: 'בחירת סוג משחק',
          content: 'בחרו את סוג המשחק שתרצו ליצור. כל סוג משחק מציע חוויה חינוכית שונה - בחרו את זה שהכי מתאים למטרה החינוכית שלכם.',
          targetSelectors: ['[data-tutorial="game-type-cards"]', '[data-tutorial-game-type]'],
          action: 'click',
          requiresGameBuilderStep: 0
        },
        {
          id: 'game-details',
          route: '/games/create',
          title: 'פרטי המשחק',
          content: 'עכשיו נגדיר את שם המשחק ותיאור קצר. בחרו שם שמעורר עניין ותיאור שמסביר את המטרה החינוכית.',
          targetSelectors: ['[data-tutorial="game-title-input"]'],
          action: 'input',
          requiresGameBuilderStep: 1,
          required: true,
          validationField: 'title'
        },
        {
          id: 'game-description',
          route: '/games/create',
          title: 'תיאור המשחק',
          content: 'הוסיפו תיאור קצר שיעזור לתלמידים להבין על מה המשחק ומה הם ילמדו.',
          targetSelectors: ['[data-tutorial="game-description-input"]'],
          action: 'input',
          requiresGameBuilderStep: 1,
          required: true,
          validationField: 'short_description'
        },
        {
          id: 'content-creation',
          route: '/games/create',
          title: 'הוספת תוכן למשחק',
          content: 'זה החלק הכי חשוב! כאן נוסיף את התוכן שיופיע במשחק. לחצו על "הגדרת כללי תוכן" כדי להתחיל.',
          targetSelectors: ['[data-tutorial="content-rules-tab"]'],
          action: 'click',
          requiresGameBuilderStep: 2
        },
        {
          id: 'add-content-rule',
          route: '/games/create',
          title: 'יצירת כלל תוכן ראשון',
          content: 'לחצו על "הוסף כלל" כדי ליצור את הכלל הראשון שיקבע איך המשחק יבחר תוכן.',
          targetSelectors: ['[data-tutorial="add-rule-button"]'],
          action: 'click',
          requiresGameBuilderStep: 2
        },
        {
          id: 'rule-configuration',
          route: '/games/create',
          title: 'הגדרת כלל התוכן',
          content: 'מצוין! עכשיו נגדיר את כלל התוכן. תוכלו לבחור איך המשחק יבחר תוכן - בחירה ידנית, לפי תכונות, או מרשימות קיימות.',
          targetSelectors: ['[data-tutorial="rule-editor"]'],
          action: 'view',
          requiresGameBuilderStep: 2
        },
        {
          id: 'content-connection-type',
          route: '/games/create',
          title: 'בחירת סוג חיבור תוכן',
          content: 'בחרו איך תרצו לחבר תוכן לכלל: "בחירה ידנית" לבחירה מדויקת, "לפי תכונות" לסינון אוטומטי, או "רשימת תוכן" לשימוש ברשימה קיימת.',
          targetSelectors: ['[data-tutorial="connection-type-select"]'],
          action: 'select',
          requiresGameBuilderStep: 2
        },
        {
          id: 'add-content-items',
          route: '/games/create',
          title: 'הוספת תוכן למשחק',
          content: 'עכשיו הגיע הזמן להוסיף תוכן אמיתי למשחק! לחצו על "הוסף תוכן" כדי לבחור מילים, תמונות או שאלות למשחק.',
          targetSelectors: ['[data-tutorial="add-content-button"]'],
          action: 'click',
          requiresGameBuilderStep: 2
        },
        {
          id: 'content-selection',
          route: '/games/create',
          title: 'בחירת התוכן',
          content: 'בחרו את התוכן שתרצו שיופיע במשחק. תוכלו לבחור מתוכן קיים או ליצור תוכן חדש במיוחד למשחק.',
          targetSelectors: ['[data-tutorial="content-selector"]'],
          action: 'select',
          requiresGameBuilderStep: 2
        },
        {
          id: 'save-rule',
          route: '/games/create',
          title: 'שמירת הכלל',
          content: 'מעולה! עכשיו שמרו את הכלל עם התוכן שבחרתם. הכלל יקבע איך המשחק יציג את התוכן לתלמידים.',
          targetSelectors: ['[data-tutorial="save-rule-button"]'],
          action: 'click',
          requiresGameBuilderStep: 2
        },
        {
          id: 'preview-game',
          route: '/games/create',
          title: 'תצוגה מקדימה',
          content: 'מצוין! עכשיו בואו נראה איך המשחק נראה. לחצו על "תצוגה מקדימה" כדי לבדוק את המשחק.',
          targetSelectors: ['[data-tutorial="preview-tab"]'],
          action: 'click',
          requiresGameBuilderStep: 3
        },
        {
          id: 'publish-game',
          route: '/games/create',
          title: 'פרסום המשחק',
          content: 'המשחק מוכן! לחצו על "פרסם משחק" כדי שתלמידים יוכלו לשחק בו.',
          targetSelectors: ['[data-tutorial="publish-button"]'],
          action: 'click',
          requiresGameBuilderStep: 3
        },
        {
          id: 'completion',
          route: '/games',
          title: 'כל הכבוד!',
          content: 'סיימתם ליצור את המשחק הראשון שלכם! המשחק זמין עכשיו לתלמידים. תוכלו לערוך אותו או ליצור משחקים נוספים.',
          position: 'center',
          action: 'complete'
        }
      ]
    }
  };

  // Start a tutorial
  const startTutorial = (tutorialId) => {
    const tutorial = tutorials[tutorialId];
    if (!tutorial) return;

    setCurrentTutorial(tutorial);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsActive(true);
    setIsWaitingForAction(false);

    // Navigate to first step if needed
    const firstStep = tutorial.steps[0];
    if (firstStep.route && location.pathname !== firstStep.route) {
      navigate(firstStep.route + '?tutorial=true');
    }
  };

  // End tutorial
  const endTutorial = () => {
    setIsActive(false);
    setCurrentTutorial(null);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsWaitingForAction(false);
  };

  // Go to next step
  const nextStep = () => {
    if (!currentTutorial || currentStep >= currentTutorial.steps.length - 1) {
      endTutorial();
      return;
    }

    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setIsWaitingForAction(false);

    // Navigate if needed
    const step = currentTutorial.steps[newStep];
    if (step.route && location.pathname !== step.route) {
      navigate(step.route + '?tutorial=true');
    }

    // Sync GameBuilder step if needed
    if (step.requiresGameBuilderStep !== undefined) {
      const gameBuilderStepEvent = new CustomEvent('tutorialSetStep', {
        detail: { step: step.requiresGameBuilderStep }
      });
      window.dispatchEvent(gameBuilderStepEvent);
    }
  };

  // Go to previous step with route/GameBuilder sync
  const prevStep = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      const prevStepData = currentTutorial.steps[newStep];

      setCurrentStep(newStep);
      setIsWaitingForAction(false);

      // Navigate to route if needed
      if (prevStepData.route && location.pathname !== prevStepData.route) {
        navigate(prevStepData.route + '?tutorial=true');
      }

      // Sync GameBuilder step if needed
      if (prevStepData.requiresGameBuilderStep !== undefined) {
        // Trigger GameBuilder to go to specific step
        const gameBuilderStepEvent = new CustomEvent('tutorialSetStep', {
          detail: { step: prevStepData.requiresGameBuilderStep }
        });
        window.dispatchEvent(gameBuilderStepEvent);
      }
    }
  };

  // Mark step as completed
  const completeStep = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setIsWaitingForAction(false);

    // Auto advance after a short delay
    setTimeout(() => {
      nextStep();
    }, 1000);
  };

  // Handle tutorial action (click, input, etc.)
  const handleTutorialAction = (actionType, target) => {
    if (!isActive || !currentTutorial) return;

    const currentStepData = currentTutorial.steps[currentStep];

    if (currentStepData.action === actionType) {
      if (actionType === 'click' && target === currentStepData.targetSelector) {
        completeStep();
      } else if (actionType === 'input' && target === currentStepData.targetSelector) {
        if (currentStepData.waitForInput) {
          setIsWaitingForAction(true);
        } else {
          completeStep();
        }
      } else if (actionType === 'navigate' && target === currentStepData.target) {
        completeStep();
      }
    }
  };

  // Handle input completion
  const handleInputComplete = (target) => {
    if (isWaitingForAction && currentTutorial) {
      const currentStepData = currentTutorial.steps[currentStep];
      if (currentStepData.targetSelector === target) {
        completeStep();
      }
    }
  };

  // Get current step data
  const getCurrentStepData = () => {
    if (!currentTutorial || !isActive) return null;
    return currentTutorial.steps[currentStep];
  };

  // Check if we should show tutorial on current route
  const shouldShowOnRoute = (route) => {
    if (!isActive || !currentTutorial) return false;
    const currentStepData = getCurrentStepData();
    return currentStepData && currentStepData.route === route;
  };

  const value = {
    isActive,
    currentStep,
    currentTutorial,
    completedSteps,
    isWaitingForAction,
    startTutorial,
    endTutorial,
    nextStep,
    prevStep,
    completeStep,
    handleTutorialAction,
    handleInputComplete,
    getCurrentStepData,
    shouldShowOnRoute,
    tutorials
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};