import './App.css';
import './styles/tutorial.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import * as Pages from '@/pages/index.jsx';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/pages/Layout';
import { useUser } from '@/contexts/UserContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';
import TutorialOverlay from '@/components/TutorialOverlay';

function App() {
	const { currentUser, isLoading } = useUser();

	return (
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
							<Pages.Dashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/account'
					element={
						<ProtectedRoute>
							<Pages.MyAccount />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/payment-success'
					element={
						<ProtectedRoute>
							<Pages.PaymentSuccess />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/payment-result'
					element={
						<ProtectedRoute>
							<Pages.PaymentResult />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/payment-simulator'
					element={
						<ProtectedRoute>
							<Pages.PaymentSimulator />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/video'
					element={
						<ProtectedRoute>
							<Pages.VideoViewer />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/purchase'
					element={
						<ProtectedRoute>
							<Pages.ProductPurchase />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/course'
					element={
						<ProtectedRoute>
							<Pages.CourseViewer />
						</ProtectedRoute>
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
					path='/product-details'
					element={
						<ProtectedRoute>
							<Pages.ProductDetails />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/purchases'
					element={
						<ProtectedRoute>
							<Pages.Purchases />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/chat'
					element={
						<ProtectedRoute>
							<Pages.AiChat />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/games'
					element={
						<AdminRoute>
							<Pages.Games />
						</AdminRoute>
					}
				/>
				<Route
					path='/games/create'
					element={
						<AdminRoute>
							<Pages.GameBuilder />
						</AdminRoute>
					}
				/>
				<Route
					path='/games/edit/:id'
					element={
						<AdminRoute>
							<Pages.GameBuilder />
						</AdminRoute>
					}
				/>
				<Route
					path='/catalog'
					element={<Pages.GamesCatalog />}
				/>
				<Route
					path='/launcher'
					element={<Pages.GameLauncher />}
				/>
				<Route
					path='/creator-signup'
					element={
						<ProtectedRoute>
							<Pages.ContentCreatorSignup />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/creator-portal'
					element={
						<ProtectedRoute>
							<Pages.ContentCreatorPortal />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/workshops'
					element={<Pages.Workshops />}
				/>
				<Route
					path='/courses'
					element={<Pages.Courses />}
				/>
				<Route
					path='/classrooms'
					element={
						<ProtectedRoute>
							<Pages.MyClassrooms />
						</ProtectedRoute>
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
					path='/texts'
					element={
						<AdminRoute>
							<Pages.SiteTexts />
						</AdminRoute>
					}
				/>
				<Route
					path='/tools'
					element={
						<AdminRoute>
							<Pages.Tools />
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
					path='/files'
					element={
						<AdminRoute>
							<Pages.Files />
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
					path='/game-content'
					element={
						<AdminRoute>
							<Pages.GameContentManagement />
						</AdminRoute>
					}
				/>
				<Route
					path='/content-system'
					element={
						<AdminRoute>
							<Pages.GameContentSystem />
						</AdminRoute>
					}
				/>
				<Route
					path='/content-system/:gameId'
					element={
						<AdminRoute>
							<Pages.GameContentSystem />
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
				<Route
					path='/admin/help/game-creation-tutorial'
					element={
						<AdminRoute>
							<Pages.GameCreationTutorial />
						</AdminRoute>
					}
				/>

				<Route
					path='*'
					element={<Pages.NotFound />}
				/>
			</Routes>
			<Toaster />
			<TutorialOverlay />
		</Layout>
	);
}

export default App;
