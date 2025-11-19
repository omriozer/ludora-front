import { lazy } from 'react';

// Core pages (loaded immediately for better UX)
export { default as Home } from './Home';
export { default as Dashboard } from './Dashboard';
export { default as Registration } from './Registration';
export { default as NotFound } from './NotFound';

// Public pages (lazy loaded)
export const PrivacyPolicy = lazy(() => import('./PrivacyPolicy'));
export const TermsOfService = lazy(() => import('./TermsOfService'));
export const Accessibility = lazy(() => import('./Accessibility'));
export const Contact = lazy(() => import('./Contact'));
export const ApiTest = lazy(() => import('./ApiTest'));
export const ParentConsent = lazy(() => import('./ParentConsent'));

// User account and profile pages
export const MyAccount = lazy(() => import('./MyAccount'));
export const PaymentSuccess = lazy(() => import('./PaymentSuccess'));
export const PaymentResult = lazy(() => import('./PaymentResult'));
export const PaymentResultIframe = lazy(() => import('./PaymentResultIframe'));
export const Purchases = lazy(() => import('./Purchases'));
export const StudentInvitations = lazy(() => import('./StudentInvitations'));

// Student portal pages
export const StudentHome = lazy(() => import('./students/StudentHome'));
export const StudentNotFound = lazy(() => import('./students/StudentNotFound'));
export const TeacherCatalog = lazy(() => import('./students/TeacherCatalog'));
export const LobbyJoin = lazy(() => import('./students/LobbyJoin'));
export const GamePlay = lazy(() => import('./students/GamePlay'));

// Product and content pages
export const ProductDetails = lazy(() => import('./ProductDetails'));
export const ProductCatalog = lazy(() => import('../components/catalog/ProductCatalog'));
export const Checkout = lazy(() => import('./Checkout'));

// Educational content
export const VideoViewer = lazy(() => import('./VideoViewer'));
export const LessonPlanPresentation = lazy(() => import('./LessonPlanPresentation'));
export const CourseViewer = lazy(() => import('./CourseViewer'));

// Classroom management
export const MyClassrooms = lazy(() => import('./MyClassrooms'));
export const Curriculum = lazy(() => import('./Curriculum'));
export const ClassCurriculum = lazy(() => import('./ClassCurriculum'));

// Game multiplayer management
export const GameLobbies = lazy(() => import('./GameLobbies'));

// Content creation
export const ContentCreatorSignup = lazy(() => import('./ContentCreatorSignup'));
export const ContentCreatorPortal = lazy(() => import('./ContentCreatorPortal'));

// Product management (admin/creator)
export const Products = lazy(() => import('./Products'));
export const ProductPage = lazy(() => import('./ProductPage'));
export const GameSettings = lazy(() => import('./GameSettings'));

// Admin-only pages (heavily lazy loaded to reduce bundle size)
export const Participants = lazy(() => import('./Participants'));
export const Emails = lazy(() => import('./Emails'));
export const SupportMessages = lazy(() => import('./SupportMessages'));
export const EmailAutomations = lazy(() => import('./EmailAutomations'));
export const AdminSystemUsers = lazy(() => import('./AdminSystemUsers'));
export const Users = lazy(() => import('./Users'));
export const FeatureControl = lazy(() => import('./FeatureControl'));
export const BrandSettings = lazy(() => import('./BrandSettings'));
export const ProductSettings = lazy(() => import('./ProductSettings'));
export const CategoryManagement = lazy(() => import('./CategoryManagement'));
export const ContentTopicsManagement = lazy(() => import('./ContentTopicsManagement'));
export const AudioManagement = lazy(() => import('./AudioManagement'));
export const SubscriptionSettings = lazy(() => import('./SubscriptionSettings'));
export const SchoolManagement = lazy(() => import('./SchoolManagement'));
export const AdminHelp = lazy(() => import('./AdminHelp'));
export const Documentation = lazy(() => import('./Documentation'));
export const TemplateManager = lazy(() => import('./TemplateManager'));
export const TemplateEditor = lazy(() => import('./TemplateEditor'));

// Coupon management (admin-only)
export const CouponDashboard = lazy(() => import('./CouponDashboard'));
export const CouponManagement = lazy(() => import('./CouponManagement'));
export const CouponForm = lazy(() => import('./CouponForm'));
export const CouponAnalytics = lazy(() => import('./CouponAnalytics'));
export const BulkCouponGenerator = lazy(() => import('./BulkCouponGenerator'));

// Demo page
export const Demo = lazy(() => import('./Demo'));

// Create Games component using ProductCatalog (lazy loaded)
export const Games = lazy(() => import('../components/catalog/ProductCatalog').then(module => ({
  default: () => module.default({ productType: "game" })
})));