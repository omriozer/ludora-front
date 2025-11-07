import './App.css';
import './styles/tutorial.css';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense } from 'react';
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
import TutorialOverlay from '@/components/TutorialOverlay';
import { ConfirmationProvider } from '@/components/ui/ConfirmationProvider';
import { AuthErrorProvider } from '@/components/providers/AuthErrorProvider';
import { AudioCacheProvider } from '@/contexts/AudioCacheContext';
import { PRODUCT_TYPES } from './config/productTypes';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { toast } from '@/components/ui/use-toast';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

// Suspense fallback component
const SuspenseLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LudoraLoadingSpinner size="lg" />
  </div>
);

function App() {
	const { currentUser, isLoading } = useUser();
	const location = useLocation();

	// Handle subscription payment result query parameters
	useEffect(() => {
		const params = new URLSearchParams(location.search);

		if (params.get('subscription_success') === 'true') {
			console.log('🎉 Subscription payment success detected via URL parameter');
			toast({
				variant: "default",
				title: "תשלום המנוי הושלם בהצלחה!",
				description: "המנוי שלך מתעדכן במערכת. ייתכן שיידרש רענון הדף לראות את השינויים."
			});
			// Clean up URL parameter
			const newUrl = window.location.pathname;
			window.history.replaceState({}, '', newUrl);
		}

		if (params.get('subscription_failed') === 'true') {
			console.log('❌ Subscription payment failure detected via URL parameter');
			toast({
				variant: "destructive",
				title: "תשלום המנוי נכשל",
				description: "התשלום לא הושלם בהצלחה. אנא נסה שוב או פנה לתמיכה."
			});
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
						path='/payment-success'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.PaymentSuccess />
									</Suspense>
								</OnboardingRedirect>
							</ProtectedRoute>
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
						path='/payment-result-iframe'
						element={
							<Suspense fallback={<SuspenseLoader />}>
								<LazyPages.PaymentResultIframe />
							</Suspense>
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
						path='/chat'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Suspense fallback={<SuspenseLoader />}>
										<LazyPages.AiChat />
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
						path='/admin'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.AdminPanel />
								</Suspense>
							</AdminRoute>
						}
					/>
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
						path='/dev-tools'
						element={
							<AdminRoute>
								<Suspense fallback={<SuspenseLoader />}>
									<LazyPages.DevelopmentTools />
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
					<TutorialOverlay />
					</Layout>
				</AuthErrorProvider>
			</ConfirmationProvider>
		</AudioCacheProvider>
	);
}

export default App;