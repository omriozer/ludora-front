import './App.css';
import './styles/tutorial.css';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import * as Pages from '@/pages/index.jsx';
import { EnhancedToaster } from '@/components/ui/enhanced-toast';
import Layout from '@/pages/Layout';
import { useUser } from '@/contexts/UserContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';
import ConditionalRoute from '@/components/auth/ConditionalRoute';
import OnboardingRedirect from '@/components/auth/OnboardingRedirect';
import TutorialOverlay from '@/components/TutorialOverlay';
import { ConfirmationProvider } from '@/components/ui/ConfirmationProvider';
import { PRODUCT_TYPES } from './config/productTypes';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { toast } from '@/components/ui/use-toast';

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
		<ConfirmationProvider>
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
								<Pages.Home />
							)
						}
					/>
					<Route
						path='/registration'
						element={<Pages.Registration />}
					/>
					<Route
						path='/privacy'
						element={<Pages.PrivacyPolicy />}
					/>
					<Route
						path='/terms'
						element={<Pages.TermsOfService />}
					/>
					<Route
						path='/accessibility'
						element={<Pages.Accessibility />}
					/>
					<Route
						path='/contact'
						element={<Pages.Contact />}
					/>
					<Route
						path='/api-test'
						element={<Pages.ApiTest />}
					/>
					<Route
						path='/parent-consent'
						element={<Pages.ParentConsent />}
					/>

					{/* Protected routes - require authentication */}
					<Route
						path='/dashboard'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Pages.Dashboard />
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
									<Pages.MyAccount />
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/payment-success'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Pages.PaymentSuccess />
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/payment-result'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Pages.PaymentResult />
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/payment-result-iframe'
						element={<Pages.PaymentResultIframe />}
					/>
					<Route
						path='/video'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Pages.VideoViewer />
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/checkout'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Pages.Checkout />
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/course'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Pages.CourseViewer />
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/product-details'
						element={
							<OnboardingRedirect>
								<Pages.ProductDetails />
							</OnboardingRedirect>
						}
					/>
					<Route
						path='/purchases'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Pages.Purchases />
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/chat'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Pages.AiChat />
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>
					<Route
						path='/curriculum'
						element={
							<ConditionalRoute visibilityField='nav_curriculum_visibility'>
								<OnboardingRedirect>
									<Pages.Curriculum />
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					{/* Public Games Catalog */}
					<Route
						path='/games'
						element={
							<ConditionalRoute visibilityField='nav_games_visibility'>
								<Pages.ProductCatalog productType='game' />
							</ConditionalRoute>
						}
					/>
					<Route
						path='/creator-signup'
						element={
							<ConditionalRoute visibilityField='nav_content_creators_visibility'>
								<Pages.ContentCreatorSignup />
							</ConditionalRoute>
						}
					/>
					<Route
						path='/creator-portal'
						element={
							<ConditionalRoute visibilityField='nav_content_creators_visibility'>
								<Pages.ContentCreatorPortal />
							</ConditionalRoute>
						}
					/>
					<Route
						path='/tools'
						element={
							<ConditionalRoute visibilityField='nav_tools_visibility'>
								<OnboardingRedirect>
									<Pages.ProductCatalog productType='tool' />
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path={PRODUCT_TYPES.file.url}
						element={
							<ConditionalRoute visibilityField='nav_files_visibility'>
								<OnboardingRedirect>
									<Pages.ProductCatalog productType='file' />
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path={PRODUCT_TYPES.lesson_plan.url}
						element={
							<ConditionalRoute visibilityField='nav_lesson_plans_visibility'>
								<OnboardingRedirect>
									<Pages.ProductCatalog productType='lesson_plan' />
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/workshops'
						element={
							<ConditionalRoute visibilityField='nav_workshops_visibility'>
								<OnboardingRedirect>
									<Pages.ProductCatalog productType='workshop' />
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/courses'
						element={
							<ConditionalRoute visibilityField='nav_courses_visibility'>
								<OnboardingRedirect>
									<Pages.ProductCatalog productType='course' />
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/classrooms'
						element={
							<ConditionalRoute visibilityField='nav_classrooms_visibility'>
								<OnboardingRedirect>
									<Pages.MyClassrooms />
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/classroom/:classId/curriculum'
						element={
							<ConditionalRoute visibilityField='nav_classrooms_visibility'>
								<OnboardingRedirect>
									<Pages.ClassCurriculum />
								</OnboardingRedirect>
							</ConditionalRoute>
						}
					/>
					<Route
						path='/student-invitations'
						element={
							<ProtectedRoute>
								<Pages.StudentInvitations />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/games-management'
						element={
							<ProtectedRoute>
								<OnboardingRedirect>
									<Pages.GamesManagement />
								</OnboardingRedirect>
							</ProtectedRoute>
						}
					/>

					{/* Admin-only routes */}
					<Route
						path='/admin'
						element={
							<AdminRoute>
								<Pages.AdminPanel />
							</AdminRoute>
						}
					/>
					<Route
						path='/products'
						element={
							<ProtectedRoute>
								<Pages.Products />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/products/create'
						element={
							<ProtectedRoute>
								<Pages.ProductPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/products/edit/:productId'
						element={
							<ProtectedRoute>
								<Pages.ProductPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/game-settings/:gameId'
						element={
							<ProtectedRoute>
								<Pages.GameSettings />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/participants'
						element={
							<AdminRoute>
								<Pages.Participants />
							</AdminRoute>
						}
					/>
					<Route
						path='/emails'
						element={
							<AdminRoute>
								<Pages.Emails />
							</AdminRoute>
						}
					/>
					<Route
						path='/support'
						element={
							<AdminRoute>
								<Pages.SupportMessages />
							</AdminRoute>
						}
					/>
					<Route
						path='/automations'
						element={
							<AdminRoute>
								<Pages.EmailAutomations />
							</AdminRoute>
						}
					/>
					<Route
						path='/system-users'
						element={
							<AdminRoute>
								<Pages.AdminSystemUsers />
							</AdminRoute>
						}
					/>
					<Route
						path='/users'
						element={
							<AdminRoute>
								<Pages.Users />
							</AdminRoute>
						}
					/>
					<Route
						path='/features'
						element={
							<AdminRoute>
								<Pages.FeatureControl />
							</AdminRoute>
						}
					/>
					<Route
						path='/brand'
						element={
							<AdminRoute>
								<Pages.BrandSettings />
							</AdminRoute>
						}
					/>
					<Route
						path='/product-settings'
						element={
							<AdminRoute>
								<Pages.ProductSettings />
							</AdminRoute>
						}
					/>
					<Route
						path='/dev-tools'
						element={
							<AdminRoute>
								<Pages.DevelopmentTools />
							</AdminRoute>
						}
					/>
					<Route
						path='/categories'
						element={
							<AdminRoute>
								<Pages.CategoryManagement />
							</AdminRoute>
						}
					/>
					<Route
						path='/audio'
						element={
							<AdminRoute>
								<Pages.AudioManagement />
							</AdminRoute>
						}
					/>
					<Route
						path='/subscriptions'
						element={
							<AdminRoute>
								<Pages.SubscriptionSettings />
							</AdminRoute>
						}
					/>
					<Route
						path='/schools'
						element={
							<AdminRoute>
								<Pages.SchoolManagement />
							</AdminRoute>
						}
					/>
					<Route
						path='/admin/help'
						element={
							<AdminRoute>
								<Pages.AdminHelp />
							</AdminRoute>
						}
					/>
					<Route
						path='/documentation'
						element={
							<AdminRoute>
								<Pages.Documentation />
							</AdminRoute>
						}
					/>

					{/* Coupon Admin Routes */}
					<Route
						path='/coupons'
						element={
							<AdminRoute>
								<Pages.CouponDashboard />
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/manage'
						element={
							<AdminRoute>
								<Pages.CouponManagement />
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/create'
						element={
							<AdminRoute>
								<Pages.CouponForm />
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/edit/:id'
						element={
							<AdminRoute>
								<Pages.CouponForm />
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/analytics'
						element={
							<AdminRoute>
								<Pages.CouponAnalytics />
							</AdminRoute>
						}
					/>
					<Route
						path='/coupons/bulk-generate'
						element={
							<AdminRoute>
								<Pages.BulkCouponGenerator />
							</AdminRoute>
						}
					/>

					<Route
						path='*'
						element={<Pages.NotFound />}
					/>
				</Routes>
				<EnhancedToaster />
				<TutorialOverlay />
			</Layout>
		</ConfirmationProvider>
	);
}

export default App;
