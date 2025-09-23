import React, { useEffect, useState, useRef } from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle,
  Lightbulb,
  Target,
  Play,
  GripVertical
} from 'lucide-react';

export default function TutorialOverlay() {
  const {
    isActive,
    currentStep,
    currentTutorial,
    getCurrentStepData,
    nextStep,
    prevStep,
    endTutorial,
    shouldShowOnRoute
  } = useTutorial();

  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [inputValues, setInputValues] = useState({});
  const tooltipRef = useRef(null);

  const currentStepData = getCurrentStepData();

  // Listen to input changes for conditional button enabling
  useEffect(() => {
    if (!isActive || !currentStepData || currentStepData.action !== 'input') return;

    const handleInputChange = (e) => {
      const targetSelectors = currentStepData.targetSelectors || [];
      const isTargetInput = targetSelectors.some(selector => {
        return e.target.closest(selector);
      });

      if (isTargetInput) {
        setInputValues(prev => ({
          ...prev,
          [currentStepData.validationField || 'value']: e.target.value
        }));
      }
    };

    document.addEventListener('input', handleInputChange, true);
    return () => {
      document.removeEventListener('input', handleInputChange, true);
    };
  }, [isActive, currentStep, currentStepData]);

  // Check if next button should be enabled
  const isNextEnabled = () => {
    if (!currentStepData || currentStepData.action === 'click') return false;

    if (currentStepData.required && currentStepData.validationField) {
      // Use state value if available, otherwise check DOM
      let value = inputValues[currentStepData.validationField] || '';

      if (!value) {
        const selector = currentStepData.targetSelectors?.[0];
        if (selector) {
          const element = document.querySelector(selector);
          if (element) {
            value = element.value || '';
          }
        }
      }

      if (currentStepData.validationField === 'title') {
        return value.length >= 3;
      }
      if (currentStepData.validationField === 'short_description') {
        return value.length >= 10;
      }
      return false;
    }

    return true; // Optional steps are always enabled
  };

  // Drag functionality
  const handleMouseDown = (e) => {
    if (e.target.closest('.tutorial-drag-handle')) {
      setIsDragging(true);
      const rect = tooltipRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setTooltipPosition({
        top: e.clientY - dragOffset.y,
        left: e.clientX - dragOffset.x
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Smart positioning based on highlighted elements (reset on step change)
  useEffect(() => {
    if (!isActive || !currentStepData || !shouldShowOnRoute(window.location.pathname)) {
      return;
    }

    const updatePosition = () => {
      const highlightedElements = document.querySelectorAll('.tutorial-highlight');

      // Add multiple highlight class if there are multiple elements
      if (highlightedElements.length > 1) {
        highlightedElements.forEach(el => el.classList.add('tutorial-multiple'));
      } else {
        // Remove multiple class from all elements
        document.querySelectorAll('.tutorial-multiple').forEach(el => {
          el.classList.remove('tutorial-multiple');
        });
      }

      // Reset position on step change (don't remember user drag position)
      if (highlightedElements.length === 0) {
        // No highlighted elements, center the tooltip
        setTooltipPosition({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        });
      } else if (highlightedElements.length === 1) {
        // Single element, position relative to it
        positionRelativeToElement(highlightedElements[0]);
      } else {
        // Multiple elements, center the tooltip
        setTooltipPosition({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        });
      }
    };

    // Multiple attempts to ensure elements are highlighted and positioned
    const updateWithRetry = (attempt = 0) => {
      updatePosition();

      // Check if highlighting was applied, if not retry up to 3 times
      const highlightedElements = document.querySelectorAll('.tutorial-highlight');
      if (highlightedElements.length === 0 && attempt < 3) {
        setTimeout(() => updateWithRetry(attempt + 1), 150 * (attempt + 1));
      }
    };

    // Initial positioning attempt with retry logic
    setTimeout(() => updateWithRetry(), 100);

    // Update on window resize
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentStepData, isActive, currentStep]);

  const positionRelativeToElement = (targetElement) => {
    if (!targetElement || !tooltipRef.current) return;

    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let top, left;
    const spacing = 20;

    // Try different positions to avoid overlap and find best fit
    const positions = ['bottom', 'right', 'left', 'top'];

    for (const position of positions) {
      switch (position) {
        case 'bottom':
          top = targetRect.bottom + spacing;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'top':
          top = targetRect.top - tooltipRect.height - spacing;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.left - tooltipRect.width - spacing;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.right + spacing;
          break;
      }

      // Check if this position fits in viewport
      if (left >= 10 &&
          left + tooltipRect.width <= windowWidth - 10 &&
          top >= 10 &&
          top + tooltipRect.height <= windowHeight - 10) {
        break; // Use this position
      }
    }

    // Final fallback - ensure it's within viewport bounds
    left = Math.max(10, Math.min(left, windowWidth - tooltipRect.width - 10));
    top = Math.max(10, Math.min(top, windowHeight - tooltipRect.height - 10));

    setTooltipPosition({ top, left });
  };

  // No overlay mask - just clean highlighting

  if (!isActive || !currentStepData || !shouldShowOnRoute(window.location.pathname)) {
    return null;
  }

  const progressPercentage = currentTutorial ?
    ((currentStep + 1) / currentTutorial.steps.length) * 100 : 0;

  return (
    <>
      {/* Tutorial tooltip */}
      <div
        ref={tooltipRef}
        className="fixed tutorial-overlay max-w-sm pointer-events-auto"
        style={tooltipPosition}
        onMouseDown={handleMouseDown}
      >
        <Card className="border-blue-200 shadow-2xl">
          <CardContent className="p-4">
            {/* Header with drag handle */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="tutorial-drag-handle cursor-move p-1 hover:bg-gray-100 rounded"
                  title="גרור לשינוי מיקום"
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {currentStep + 1}
                </div>
                <span className="text-xs text-gray-500">
                  {currentStep + 1} מתוך {currentTutorial?.steps.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={endTutorial}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Title */}
            <h3 className="font-semibold text-lg mb-2 text-right">
              {currentStepData.title}
            </h3>

            {/* Content */}
            <p className="text-gray-600 text-sm leading-relaxed mb-4 text-right">
              {currentStepData.content}
            </p>

            {/* Action hints */}
            {currentStepData.action === 'click' && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 rounded-lg">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700">לחצו על האלמנט המסומן</span>
              </div>
            )}

            {currentStepData.action === 'input' && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-green-50 rounded-lg">
                <Lightbulb className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700">מלאו את השדה המסומן</span>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                קודם
              </Button>

              <div className="flex gap-1">
                {currentTutorial?.steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStep
                        ? 'bg-blue-600'
                        : index < currentStep
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Show Next button based on action and requirements */}
              {currentStepData.action === 'click' ? (
                <div className="text-sm text-blue-600 font-medium">
                  לחצו על האלמנט המסומן
                </div>
              ) : currentStepData.action === 'input' ? (
                <>
                  <Button
                    size="sm"
                    onClick={nextStep}
                    disabled={!isNextEnabled()}
                    className="flex items-center gap-1"
                  >
                    {currentStep === (currentTutorial?.steps.length - 1) ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        סיום
                      </>
                    ) : (
                      <>
                        הבא
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </Button>
                  {currentStepData.required && !isNextEnabled() && (
                    <div className="text-xs text-gray-500 mt-1">
                      מלאו את השדה כדי להמשיך
                    </div>
                  )}
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={nextStep}
                  className="flex items-center gap-1"
                >
                  {currentStep === (currentTutorial?.steps.length - 1) ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      סיום
                    </>
                  ) : (
                    <>
                      הבא
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}