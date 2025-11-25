import './App.css';
import './styles/studentsGlobalStyles.css';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense, useState, useCallback } from 'react';
// Core pages - loaded immediately for better UX
import { Home, Dashboard, Registration, NotFound } from '@/pages/lazy.jsx';
// Lazy-loaded pages
import * as LazyPages from '@/pages/lazy.jsx';
import { EnhancedToaster } from '@/components/ui/enhanced-toast';
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
	const { currentUser, settings, settingsLoadFailed, login } = useUser();
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
					console.error('Failed to fetch teacher info:', error);
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
					console.warn('Error checking admin bypass:', error);
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
			console.warn('Error re-checking admin bypass after anonymous login:', error);
			setCanAdminBypass(false);
		} finally {
			setIsCheckingAdminBypass(false);
		}
	};

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
		<>
			<StudentsNav teacherInfo={teacherInfo} />
			<Routes>
				{/* Student Home */}
				<Route
					path='/'
					element={
						<Suspense fallback={<SuspenseLoader />}>
							<LazyPages.StudentHome />
						</Suspense>
					}
				/>

				{/* Teacher Catalog */}
				<Route
					path='/portal/:userCode'
					element={
						<Suspense fallback={<SuspenseLoader />}>
							<LazyPages.TeacherCatalog />
						</Suspense>
					}
				/>

				{/* Game Lobby Join */}
				<Route
					path='/lobby/:code'
					element={
						<Suspense fallback={<SuspenseLoader />}>
							<LazyPages.LobbyJoin />
						</Suspense>
					}
				/>

				{/* Game Play Session */}
				<Route
					path='/play/:code'
					element={
						<Suspense fallback={<SuspenseLoader />}>
							<LazyPages.GamePlay />
						</Suspense>
					}
				/>

				{/* Allowed public pages */}
				<Route
					path='/privacy'
					element={
						<Suspense fallback={<SuspenseLoader />}>
							<LazyPages.PrivacyPolicy />
						</Suspense>
					}
				/>
				<Route
					path='/terms'
					element={
						<Suspense fallback={<SuspenseLoader />}>
							<LazyPages.TermsOfService />
						</Suspense>
					}
				/>
				<Route
					path='/accessibility'
					element={
						<Suspense fallback={<SuspenseLoader />}>
							<LazyPages.Accessibility />
						</Suspense>
					}
				/>
				<Route
					path='/contact'
					element={
						<Suspense fallback={<SuspenseLoader />}>
							<LazyPages.Contact />
						</Suspense>
					}
				/>

				{/* Student 404 Page */}
				<Route
					path='*'
					element={
						<Suspense fallback={<SuspenseLoader />}>
							<LazyPages.StudentNotFound />
						</Suspense>
					}
				/>
			</Routes>
			<Footer />

			{/* Student Login Modal for Navigation */}
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

function App() {
	const { currentUser, isLoading } = useUser();
	const location = useLocation();

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

	// Teacher portal logic (everything below is for teacher portal)
	// Handle subscription payment result query parameters
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
							<Suspense fallback={<SuspenseLoader />}>
								<LazyPages.PrivacyPolicy />
							</Suspense>
						}
					/>
					<Route
						path='/terms'
						element={
							<Suspense fallback={<SuspenseLoader />}>
								<LazyPages.TermsOfService />
							</Suspense>
						}
					/>
					<Route
						path='/accessibility'
						element={
							<Suspense fallback={<SuspenseLoader />}>
								<LazyPages.Accessibility />
							</Suspense>
						}
					/>
					<Route
						path='/contact'
						element={
							<Suspense fallback={<SuspenseLoader />}>
								<LazyPages.Contact />
							</Suspense>
						}
					/>
					<Route
						path='/api-test'
						element={
							<Suspense fallback={<SuspenseLoader />}>
								<LazyPages.ApiTest />
							</Suspense>
						}
					/>
					<Route
						path='/parent-consent'
						element={
							<Suspense fallback={<SuspenseLoader />}>
								<LazyPages.ParentConsent />
							</Suspense>
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
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.MyAccount />
									</Suspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/payment-result'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.PaymentResult />
									</Suspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/video'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.VideoViewer />
									</Suspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/lesson-plan-presentation'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.LessonPlanPresentation />
									</Suspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/checkout'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.Checkout />
									</Suspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/course'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.CourseViewer />
									</Suspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/product-details'
						element={
							<OnboardingRedirect>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.ProductDetails />
								</Suspense>
							</OnboardingRedirect>
						}
					/>
					<Route
						path='/purchases'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.Purchases />
									</Suspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/curriculum'
						element={
							<ConditionalRoute visibilityField='nav_curriculum_visibility'>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.Curriculum />
									</Suspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					{/* Public Games Catalog */}
					<Route
						path='/games'
						element={
							<ConditionalRoute visibilityField='nav_games_visibility'>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.ProductCatalog productType='game' />
								</Suspense>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/creator-signup'
						element={
							<ConditionalRoute visibilityField='nav_content_creators_visibility'>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.ContentCreatorSignup />
								</Suspense>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/creator-portal'
						element={
							<ConditionalRoute visibilityField='nav_content_creators_visibility'>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.ContentCreatorPortal />
								</Suspense>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/tools'
						element={
							<ConditionalRoute visibilityField='nav_tools_visibility'>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.ProductCatalog productType='tool' />
									</Suspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path={PRODUCT_TYPES.file.url}
						element={
							<ConditionalRoute visibilityField='nav_files_visibility'>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.ProductCatalog productType='file' />
									</Suspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path={PRODUCT_TYPES.lesson_plan.url}
						element={
							<ConditionalRoute visibilityField='nav_lesson_plans_visibility'>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.ProductCatalog productType='lesson_plan' />
									</Suspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/workshops'
						element={
							<ConditionalRoute visibilityField='nav_workshops_visibility'>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.ProductCatalog productType='workshop' />
									</Suspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/courses'
						element={
							<ConditionalRoute visibilityField='nav_courses_visibility'>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.ProductCatalog productType='course' />
									</Suspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/classrooms'
						element={
							<ConditionalRoute visibilityField='nav_classrooms_visibility'>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.MyClassrooms />
									</Suspense>
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/classroom/:classId/curriculum'
						element={
							<ConditionalRoute visibilityField='nav_classrooms_visibility'>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.ClassCurriculum />
									</Suspense>
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
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.GameLobbies />
									</Suspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/game-lobbies/:gameId'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.GameLobbies />
									</Suspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/game-lobbies/:gameId/:sessionId'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.GameLobbies />
									</Suspense>
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/student-invitations'
						element={
							<ProtectedRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.StudentInvitations />
								</Suspense>
							</ProtectedRoute>
						}
					/>

					{/* Admin-only routes */}
					<Route
						path='/products'
						element={
							<ProtectedRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.Products />
								</Suspense>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/products/create'
						element={
							<ProtectedRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.ProductPage />
								</Suspense>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/products/edit/:productId'
						element={
							<ProtectedRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.ProductPage />
								</Suspense>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/game-settings/:gameId'
						element={
							<ProtectedRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.GameSettings />
								</Suspense>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/participants'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.Participants />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/emails'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.Emails />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/support'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.SupportMessages />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/automations'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.EmailAutomations />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/system-users'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.AdminSystemUsers />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/users'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.Users />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/features'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.FeatureControl />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/brand'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.BrandSettings />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/product-settings'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.ProductSettings />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/categories'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.CategoryManagement />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/content-topics'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.ContentTopicsManagement />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/audio'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.AudioManagement />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/subscriptions'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.SubscriptionSettings />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/schools'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.SchoolManagement />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/admin/help'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.AdminHelp />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/documentation'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.Documentation />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/template-manager'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.TemplateManager />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/template-manager/create'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.TemplateEditor />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/template-manager/edit/:templateId'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.TemplateEditor />
								</Suspense>
							</AdminRoute>
						}
					/>

					{/* Coupon Admin Routes */}
					<Route
						path='/coupons'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.CouponDashboard />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/manage'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.CouponManagement />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/create'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.CouponForm />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/edit/:id'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.CouponForm />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/analytics'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.CouponAnalytics />
								</Suspense>
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/bulk-generate'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.BulkCouponGenerator />
								</Suspense>
							</AdminRoute>
						}
					/>

					{/* Demo page */}
					<Route
						path='/demo'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.Demo />
								</Suspense>
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