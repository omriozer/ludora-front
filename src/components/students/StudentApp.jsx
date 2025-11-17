import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLayout from './StudentLayout';
import StudentHome from './StudentHome';
import StudentMaintenancePage from './StudentMaintenancePage';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
// Import public pages that students can access
import * as LazyPages from '@/pages/lazy.jsx';

// Suspense fallback for lazy loaded pages
const SuspenseLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LudoraLoadingSpinner size="md" />
  </div>
);

/**
 * Root component for the student portal
 * Handles routing for all student-facing pages
 * @param {boolean} isMaintenanceMode - Whether the site is in maintenance mode
 * @param {boolean} settingsLoadFailed - Whether settings failed to load
 */
const StudentApp = ({ isMaintenanceMode = false, settingsLoadFailed = false }) => {
  // If in maintenance mode, show maintenance page
  if (isMaintenanceMode) {
    return (
      <StudentLayout isMaintenanceMode={true}>
        <StudentMaintenancePage isTemporaryIssue={settingsLoadFailed && !isMaintenanceMode} />
      </StudentLayout>
    );
  }

  // Normal student portal
  return (
    <StudentLayout isMaintenanceMode={false}>
      <Routes>
        {/* Home page - main landing for students */}
        <Route path="/" element={<StudentHome />} />

        {/* Public pages accessible to students */}
        <Route
          path="/contact"
          element={
            <Suspense fallback={<SuspenseLoader />}>
              <LazyPages.Contact />
            </Suspense>
          }
        />
        <Route
          path="/privacy"
          element={
            <Suspense fallback={<SuspenseLoader />}>
              <LazyPages.PrivacyPolicy />
            </Suspense>
          }
        />
        <Route
          path="/terms"
          element={
            <Suspense fallback={<SuspenseLoader />}>
              <LazyPages.TermsOfService />
            </Suspense>
          }
        />
        <Route
          path="/accessibility"
          element={
            <Suspense fallback={<SuspenseLoader />}>
              <LazyPages.Accessibility />
            </Suspense>
          }
        />

        {/* Future routes for student features */}
        {/* <Route path="/game/:invitationId" element={<StudentGameAccess />} /> */}
        {/* <Route path="/play/:gameId" element={<StudentGameInterface />} /> */}

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StudentLayout>
  );
};

export default StudentApp;