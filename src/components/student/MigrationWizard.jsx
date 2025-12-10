import React from 'react';
import PropTypes from 'prop-types';
import { Check } from 'lucide-react';

/**
 * MigrationWizard Component
 *
 * Multi-step wizard navigation component for player migration flow.
 * Features:
 * - Visual step progression (1/3, 2/3, 3/3)
 * - Completed steps marked with checkmarks
 * - Current step highlighted
 * - Mobile-responsive horizontal stepper
 * - Kid-friendly design with colors
 */
const MigrationWizard = ({ currentStep, totalSteps, stepTitles = [] }) => {
  // Generate steps array
  const steps = Array.from({ length: totalSteps }, (_, i) => ({
    number: i + 1,
    title: stepTitles[i] || `שלב ${i + 1}`,
    isComplete: i + 1 < currentStep,
    isCurrent: i + 1 === currentStep,
    isUpcoming: i + 1 > currentStep
  }));

  return (
    <div className="mb-8">
      {/* Step Progress Bar */}
      <div className="mobile-safe-flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                  transition-all duration-300 flex-shrink-0
                  ${step.isComplete
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg scale-110'
                    : step.isCurrent
                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-xl scale-125 ring-4 ring-purple-200'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {step.isComplete ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              {/* Step Title (shown on desktop, hidden on mobile) */}
              <div
                className={`
                  mt-2 text-xs font-medium text-center hidden sm:block whitespace-nowrap
                  ${step.isCurrent ? 'text-purple-600 font-bold' : 'text-gray-500'}
                `}
              >
                {step.title}
              </div>
            </div>

            {/* Connector Line (between steps) */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2 sm:mx-4">
                <div
                  className={`
                    h-1 rounded-full transition-all duration-500
                    ${step.isComplete
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gray-200'
                    }
                  `}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current Step Title (shown on mobile) */}
      <div className="text-center sm:hidden">
        <div className="text-sm font-bold text-purple-600">
          {steps.find(s => s.isCurrent)?.title}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          שלב {currentStep} מתוך {totalSteps}
        </div>
      </div>

      {/* Progress Percentage (desktop only) */}
      <div className="hidden sm:block mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <div className="text-center mt-2 text-xs text-gray-600">
          {Math.round((currentStep / totalSteps) * 100)}% הושלם
        </div>
      </div>
    </div>
  );
};

MigrationWizard.propTypes = {
  currentStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  stepTitles: PropTypes.arrayOf(PropTypes.string)
};

export default MigrationWizard;
