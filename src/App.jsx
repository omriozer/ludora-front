import './App.css';
import './styles/studentsGlobalStyles.css';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense, useState, useCallback } from 'react';
// Core pages - loaded immediately for better UX
import { Home, Dashboard, Registration, NotFound } from '@/pages/lazy.jsx';
// Lazy-loaded pages
import * as LazyPages from '@/pages/lazy.jsx';
import { EnhancedToaster } from '@/components/ui/enhanced-toast';
// Enhanced error handling for lazy loading
import AuthAwareSuspense, { AuthAwareSuspenseConfig } from '@/components/error/AuthAwareSuspense';
import Layout from '@/pages/Layout';
import { useUser } from '@/contexts/UserContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';
import ConditionalRoute from '@/components/auth/ConditionalRoute';
import OnboardingRedirect from '@/components/auth/OnboardingRedirect';
import { ConfirmationProvider } from '@/components/ui/ConfirmationProvider';
import { AuthErrorProvider } from '@/components/providers/AuthErrorProvider';
import { AudioCacheProvider } from '@/contexts/AudioCacheContext';
import { PRODUCT_TYPES } from './config/productTypes';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { showSuccess, showError } from '@/utils/messaging';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
// Student Portal
import { isStudentPortal } from '@/utils/domainUtils';
import Footer from '@/components/layout/Footer';
import StudentsNav from '@/components/layout/StudentsNav';
import MaintenancePage from '@/components/layout/MaintenancePage';
import StudentLoginModal from '@/components/auth/StudentLoginModal';
import { useLoginModal, LoginModalProvider } from '@/hooks/useLoginModal';
import { canBypassMaintenance } from '@/utils/adminCheck';
import { SYSTEM_KEYS, getSetting } from '@/constants/settings';

// Suspense fallback component
const SuspenseLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LudoraLoadingSpinner size="lg" />
  </div>
);

// Student Portal Component (only allowed routes)
function StudentPortal() {
	const { currentUser, settings, settingsLoadFailed, isLoading, settingsLoading, login } = useUser();
	const { showLoginModal, openLoginModal, closeLoginModal, executeCallback, modalMessage } = useLoginModal();
	const location = useLocation();

	// Teacher catalog state
	const [teacherInfo, setTeacherInfo] = useState(null);

	// Check if we're on teacher catalog page and fetch teacher info
	useEffect(() => {
		const fetchTeacherInfo = async () => {
			const match = location.pathname.match(/^\/portal\/([A-Z0-9]{8})$/);
			if (match) {
				const userCode = match[1];
				try {
					const response = await fetch(`/api/games/teacher/${userCode}`);
					if (response.ok) {
						const data = await response.json();
						setTeacherInfo({
							name: data.teacher?.name || "המורה",
							invitation_code: data.teacher?.invitation_code || userCode
						});
					} else {
						setTeacherInfo(null);
					}
				} catch (error) {
					setTeacherInfo(null);
				}
			} else {
				setTeacherInfo(null);
			}
		};

		fetchTeacherInfo();
	}, [location.pathname]);

	// Draggable return button states (same as Layout.jsx)
	const [showReturnButton, setShowReturnButton] = useState(false);
	const [returnButtonPosition, setReturnButtonPosition] = useState({ x: 20, y: 20 });
	const [isDraggingReturn, setIsDraggingReturn] = useState(false);
	const [returnDragOffset, setReturnDragOffset] = useState({ x: 0, y: 0 });

	// Admin bypass state for maintenance mode
	const [canAdminBypass, setCanAdminBypass] = useState(false);
	const [isCheckingAdminBypass, setIsCheckingAdminBypass] = useState(true);

	// Check if user is being impersonated and show return button
	useEffect(() => {
		if (currentUser && currentUser._isImpersonated) {
			setShowReturnButton(true);
		} else {
			setShowReturnButton(false);
		}
	}, [currentUser]);

	// Check admin bypass for maintenance mode
	useEffect(() => {
		const checkAdminBypass = async () => {
			const isMaintenanceMode = getSetting(settings, SYSTEM_KEYS.MAINTENANCE_MODE, false);
			if (isMaintenanceMode || settingsLoadFailed) {
				setIsCheckingAdminBypass(true);
				try {
					const canBypass = await canBypassMaintenance(currentUser);
					setCanAdminBypass(canBypass);
				} catch (error) {
					setCanAdminBypass(false);
				} finally {
					setIsCheckingAdminBypass(false);
				}
			} else {
				setCanAdminBypass(false);
				setIsCheckingAdminBypass(false);
			}
		};

		checkAdminBypass();
	}, [currentUser, settings, settingsLoadFailed]);

	// Mouse/touch handlers for draggable return button (same as Layout.jsx)
	const handleMouseMove = useCallback((e) => {
		if (!isDraggingReturn) return;
		const newX = e.clientX - returnDragOffset.x;
		const newY = e.clientY - returnDragOffset.y;
		const buttonSize = 56;
		const maxX = window.innerWidth - buttonSize;
		const maxY = window.innerHeight - buttonSize;
		setReturnButtonPosition({
			x: Math.max(0, Math.min(newX, maxX)),
			y: Math.max(0, Math.min(newY, maxY))
		});
	}, [isDraggingReturn, returnDragOffset]);

	const handleMouseUp = useCallback(() => {
		setIsDraggingReturn(false);
	}, []);

	// Effect for global mouse events for dragging
	useEffect(() => {
		if (isDraggingReturn) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		} else {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDraggingReturn, handleMouseMove, handleMouseUp]);

	// Admin/staff functionality
	const handleReturnToSelf = () => {
		window.location.reload(); // Reload to return to original admin session
	};

	// Drag handlers
	const handleReturnDrag = (e) => {
		setIsDraggingReturn(true);
		const rect = e.currentTarget.getBoundingClientRect();
		setReturnDragOffset({
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		});
	};

	const handleTouchStart = (e) => {
		const touch = e.touches[0];
		setIsDraggingReturn(true);
		const rect = e.currentTarget.getBoundingClientRect();
		setReturnDragOffset({
			x: touch.clientX - rect.left,
			y: touch.clientY - rect.top
		});
		e.preventDefault();
	};

	const handleTouchMove = (e) => {
		if (!isDraggingReturn) return;
		const touch = e.touches[0];
		const newX = touch.clientX - returnDragOffset.x;
		const newY = touch.clientY - returnDragOffset.y;
		const buttonSize = 56;
		const maxX = window.innerWidth - buttonSize;
		const maxY = window.innerHeight - buttonSize;
		setReturnButtonPosition({
			x: Math.max(0, Math.min(newX, maxX)),
			y: Math.max(0, Math.min(newY, maxY))
		});
		e.preventDefault();
	};

	const handleTouchEnd = () => {
		setIsDraggingReturn(false);
	};

	// Removed Firebase login handler - admin password bypass only

	const onLogin = () => {
		openLoginModal();
	};

	// Handle successful anonymous admin authentication
	const handleAnonymousAdminSuccess = async () => {
		// Re-check admin bypass status after anonymous admin login
		setIsCheckingAdminBypass(true);
		try {
			const canBypass = await canBypassMaintenance(currentUser);
			setCanAdminBypass(canBypass);
		} catch (error) {
			setCanAdminBypass(false);
		} finally{
			setIsCheckingAdminBypass(false);
		}
	};

	// Handle loading state - wait for both user auth AND settings to load
	// Only show loading if settings haven't failed (to avoid infinite spinner when API is down)
	if (isLoading || (settingsLoading && !settingsLoadFailed)) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<LudoraLoadingSpinner
					message="טוען את המערכת..."
					size="lg"
					theme="educational"
					showLogo={true}
				/>
			</div>
		);
	}

	// Show maintenance page if enabled OR if settings loading failed (but allow admins to bypass)
	// IMPORTANT: Check maintenance/error state BEFORE loading state to prevent infinite spinner
	const isMaintenanceMode = getSetting(settings, SYSTEM_KEYS.MAINTENANCE_MODE, false);
	if ((isMaintenanceMode || settingsLoadFailed) && !canAdminBypass) {
		const isTemporaryIssue = settingsLoadFailed && !isMaintenanceMode;

		// Show loading while checking admin bypass
		if (isCheckingAdminBypass) {
			return (
				<div className="flex items-center justify-center min-h-screen">
					<LudoraLoadingSpinner
						message="בודק הרשאות..."
						size="lg"
						theme="educational"
						showLogo={true}
					/>
				</div>
			);
		}

		return (
			<>
				<MaintenancePage
					showReturnButton={showReturnButton}
					isDraggingReturn={isDraggingReturn}
					returnButtonPosition={returnButtonPosition}
					handleReturnDrag={handleReturnDrag}
					handleTouchStart={handleTouchStart}
					handleTouchMove={handleTouchMove}
					handleTouchEnd={handleTouchEnd}
					handleReturnToSelf={handleReturnToSelf}
					onAnonymousAdminSuccess={handleAnonymousAdminSuccess}
					isTemporaryIssue={isTemporaryIssue}
				/>

				{/* Student Login Modal */}
				{showLoginModal && (
					<StudentLoginModal
						onClose={closeLoginModal}
						onLoginSuccess={executeCallback}
						message={modalMessage}
					/>
				)}
			</>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			{/* Header */}
			<StudentsNav teacherInfo={teacherInfo} />

			{/* Main Content Area - fills remaining space between header and footer */}
			<main className="flex-1 flex flex-col">
				<Routes>
					{/* Student Home */}
					<Route
						path='/'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.StudentHome />
							</AuthAwareSuspense>
						}
					/>

					{/* Teacher Catalog */}
					<Route
						path='/portal/:userCode'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.TeacherCatalog />
							</AuthAwareSuspense>
						}
					/>

					{/* Game Lobby Join */}
					<Route
						path='/lobby/:code'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.LobbyJoin />
							</AuthAwareSuspense>
						}
					/>

					{/* Game Play Session */}
					<Route
						path='/play/:code'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.GamePlay />
							</AuthAwareSuspense>
						}
					/>

					{/* Allowed public pages */}
					<Route
						path='/privacy'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.PrivacyPolicy />
							</AuthAwareSuspense>
						}
					/>
					<Route
						path='/terms'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.TermsOfService />
							</AuthAwareSuspense>
						}
					/>
					<Route
						path='/accessibility'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.Accessibility />
							</AuthAwareSuspense>
						}
					/>
					<Route
						path='/contact'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.Contact />
							</AuthAwareSuspense>
						}
					/>

					{/* Student 404 Page */}
					<Route
						path='*'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.StudentNotFound />
							</AuthAwareSuspense>
						}
					/>
				</Routes>
			</main>

			{/* Footer */}
			<Footer />

			{/* Student Login Modal for Navigation */}
			{showLoginModal && (
				<StudentLoginModal
					onClose={closeLoginModal}
					onLoginSuccess={executeCallback}
					message={modalMessage}
				/>
			)}
		</div>
	);
}

function App() {
	const { currentUser, isLoading } = useUser();
	const location = useLocation();

	// Teacher portal logic - Handle subscription payment result query parameters
	// Must be called before any conditional returns to avoid React Hooks rules violation
	useEffect(() => {
		const params = new URLSearchParams(location.search);

		if (params.get('subscription_success') === 'true') {
			showSuccess(
				"תשלום המנוי הושלם בהצלחה!",
				"המנוי שלך מתעדכן במערכת. ייתכן שיידרש רענון הדף לראות את השינויים."
			);
			// Clean up URL parameter
			const newUrl = window.location.pathname;
			window.history.replaceState({}, '', newUrl);
		}

		if (params.get('subscription_failed') === 'true') {
			showError(
				"תשלום המנוי נכשל",
				"התשלום לא הושלם בהצלחה. אנא נסה שוב או פנה לתמיכה."
			);
			// Clean up URL parameter
			const newUrl = window.location.pathname;
			window.history.replaceState({}, '', newUrl);
		}
	}, [location.search]);

	// Check if we're on the student portal
	const isOnStudentPortal = isStudentPortal();

	// If on student portal, render student app without main layout/navigation
	if (isOnStudentPortal) {
		return (
			<AudioCacheProvider>
				<ConfirmationProvider>
					<AuthErrorProvider>
						<StudentPortal />
						<EnhancedToaster />
					</AuthErrorProvider>
				</ConfirmationProvider>
			</AudioCacheProvider>
		);
	}

	// Teacher portal rendering
	return (
		<AudioCacheProvider>
			<ConfirmationProvider>
				<AuthErrorProvider>
					<Layout>
					<Routes>
					<Route
						path='/'
						element={
							!isLoading && currentUser ? (
								<Navigate
									to='/dashboard'
									replace
								/>
							) : (
								<Home />
							)
						}
					/>
					<Route
						path='/registration'
						element={<Registration />}
					/>
					<Route
						path='/privacy'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.PrivacyPolicy />
							</AuthAwareSuspense>
						}
					/>
					<Route
						path='/terms'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.TermsOfService />
							</AuthAwareSuspense>
						}
					/>
					<Route
						path='/accessibility'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.Accessibility />
							</AuthAwareSuspense>
						}
					/>
					<Route
						path='/contact'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.Contact />
							</AuthAwareSuspense>
						}
					/>
					<Route
						path='/api-test'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.ApiTest />
							</AuthAwareSuspense>
						}
					/>
					<Route
						path='/parent-consent'
						element={
							<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
								<LazyPages.ParentConsent />
							</AuthAwareSuspense>
						}
					/>

					{/* Protected routes - require authentication */}
					<Route
						path='/dashboard'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Dashboard />
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/onboarding'
						element={
							<ProtectedRoute>
								<OnboardingWizard />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/account'
						element={
							<ConditionalRoute visibilityField='nav_account_visibility'>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
										<LazyPages.MyAccount />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/payment-result'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
										<LazyPages.PaymentResult />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/video'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
										<LazyPages.VideoViewer />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/lesson-plan-presentation'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
										<LazyPages.LessonPlanPresentation />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/checkout'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
										<LazyPages.Checkout />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/course'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
										<LazyPages.CourseViewer />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/product-details'
						element={
							<OnboardingRedirect>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
									<LazyPages.ProductDetails />
								</AuthAwareSuspense>
							</OnboardingRedirect>
						}
					/>
					<Route
						path='/purchases'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
										<LazyPages.Purchases />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/curriculum'
						element={
							<ConditionalRoute visibilityField='nav_curriculum_visibility'>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
										<LazyPages.Curriculum />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					{/* Public Games Catalog */}
					<Route
						path='/games'
						element={
							<ConditionalRoute visibilityField='nav_games_visibility'>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
									<LazyPages.ProductCatalog productType='game' />
								</AuthAwareSuspense>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/creator-signup'
						element={
							<ConditionalRoute visibilityField='nav_content_creators_visibility'>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
									<LazyPages.ContentCreatorSignup />
								</AuthAwareSuspense>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/creator-portal'
						element={
							<ConditionalRoute visibilityField='nav_content_creators_visibility'>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
									<LazyPages.ContentCreatorPortal />
								</AuthAwareSuspense>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/tools'
						element={
							<ConditionalRoute visibilityField='nav_tools_visibility'>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
										<LazyPages.ProductCatalog productType='tool' />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path={PRODUCT_TYPES.file.url}
						element={
							<ConditionalRoute visibilityField='nav_files_visibility'>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
										<LazyPages.ProductCatalog productType='file' />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path={PRODUCT_TYPES.lesson_plan.url}
						element={
							<ConditionalRoute visibilityField='nav_lesson_plans_visibility'>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
										<LazyPages.ProductCatalog productType='lesson_plan' />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/workshops'
						element={
							<ConditionalRoute visibilityField='nav_workshops_visibility'>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
										<LazyPages.ProductCatalog productType='workshop' />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/courses'
						element={
							<ConditionalRoute visibilityField='nav_courses_visibility'>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
										<LazyPages.ProductCatalog productType='course' />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/classrooms'
						element={
							<ConditionalRoute visibilityField='nav_classrooms_visibility'>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
										<LazyPages.MyClassrooms />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/classroom/:classId/curriculum'
						element={
							<ConditionalRoute visibilityField='nav_classrooms_visibility'>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ENHANCED}>
										<LazyPages.ClassCurriculum />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>

					{/* Game Lobbies - Multiplayer game management */}
					<Route
						path='/game-lobbies'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
										<LazyPages.GameLobbies />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/game-lobbies/:gameId'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
										<LazyPages.GameLobbies />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/game-lobbies/:gameId/:sessionId'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
										<LazyPages.GameLobbies />
									</AuthAwareSuspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/student-invitations'
						element={
							<ProtectedRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.PROTECTED}>
									<LazyPages.StudentInvitations />
								</AuthAwareSuspense>
							</ProtectedRoute>
						}
					/>

					{/* Admin-only routes */}
					<Route
						path='/products'
						element={
							<ProtectedRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.Products />
								</AuthAwareSuspense>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/products/create'
						element={
							<ProtectedRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.ProductPage />
								</AuthAwareSuspense>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/products/edit/:productId'
						element={
							<ProtectedRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.ProductPage />
								</AuthAwareSuspense>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/game-settings/:gameId'
						element={
							<ProtectedRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.GameSettings />
								</AuthAwareSuspense>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/participants'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.Participants />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/emails'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.Emails />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/support'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.SupportMessages />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/automations'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.EmailAutomations />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/system-users'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.AdminSystemUsers />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/users'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.Users />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/features'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.FeatureControl />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/brand'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.BrandSettings />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/product-settings'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.ProductSettings />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/portals-settings'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.PortalsSettings />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/categories'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.CategoryManagement />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/content-topics'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.ContentTopicsManagement />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/audio'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.AudioManagement />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/subscriptions'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.SubscriptionSettings />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/schools'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.SchoolManagement />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/admin/help'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.AdminHelp />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/documentation'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.Documentation />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/template-manager'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.TemplateManager />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/template-manager/create'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.TemplateEditor />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/template-manager/edit/:templateId'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.TemplateEditor />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>

					{/* Coupon Admin Routes */}
					<Route
						path='/coupons'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.CouponDashboard />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/manage'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.CouponManagement />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/create'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.CouponForm />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/edit/:id'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.CouponForm />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/analytics'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.CouponAnalytics />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/bulk-generate'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.BulkCouponGenerator />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>

					{/* Demo page */}
					<Route
						path='/demo'
						element={
							<AdminRoute>
								<AuthAwareSuspense fallback={<SuspenseLoader />} {...AuthAwareSuspenseConfig.ADMIN}>
									<LazyPages.Demo />
								</AuthAwareSuspense>
							</AdminRoute>
						}
					/>

					<Route
						path='*'
						element={<NotFound />}
					/>
				</Routes>
					<EnhancedToaster />
					</Layout>
				</AuthErrorProvider>
			</ConfirmationProvider>
		</AudioCacheProvider>
	);
}

export default App;