// Import all pages
import Home from './Home';
import Dashboard from './Dashboard';
import Registration from './Registration';
import AdminPanel from './AdminPanel';
import MyAccount from './MyAccount';
import Participants from './Participants';
import Emails from './Emails';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import Accessibility from './Accessibility';
import Contact from './Contact';
import SupportMessages from './SupportMessages';
import PaymentSuccess from './PaymentSuccess';
import PaymentResult from './PaymentResult';
import PaymentResultIframe from './PaymentResultIframe';
import VideoViewer from './VideoViewer';
import Checkout from './Checkout';
import CourseViewer from './CourseViewer';
import Products from './Products';
import ProductDetails from './ProductDetails';
import EmailAutomations from './EmailAutomations';
import Purchases from './Purchases';
import AiChat from './AiChat';
import AdminSystemUsers from './AdminSystemUsers';
import Users from './Users';
import ApiTest from './ApiTest';
import ContentCreatorSignup from './ContentCreatorSignup';
import ContentCreatorPortal from './ContentCreatorPortal';
import FeatureControl from './FeatureControl';
import BrandSettings from './BrandSettings';
import ProductSettings from './ProductSettings';
import DevelopmentTools from './DevelopmentTools';
import CategoryManagement from './CategoryManagement';
import AudioManagement from './AudioManagement';
import SubscriptionSettings from './SubscriptionSettings';
import NotFound from './NotFound';
import MyClassrooms from './MyClassrooms';
import SchoolManagement from './SchoolManagement';
import ParentConsent from './ParentConsent';
import StudentInvitations from './StudentInvitations';
import CouponDashboard from './CouponDashboard';
import CouponManagement from './CouponManagement';
import CouponForm from './CouponForm';
import CouponAnalytics from './CouponAnalytics';
import BulkCouponGenerator from './BulkCouponGenerator';
import AdminHelp from './AdminHelp';
import Documentation from './Documentation';
import ProductCatalog from '../components/catalog/ProductCatalog';

// Create Games component using ProductCatalog
const Games = () => <ProductCatalog productType="game" />;

// Export all pages
export {
  Home,
  Dashboard,
  Registration,
  AdminPanel,
  MyAccount,
  Participants,
  Emails,
  PrivacyPolicy,
  TermsOfService,
  Accessibility,
  Contact,
  SupportMessages,
  PaymentSuccess,
  PaymentResult,
  PaymentResultIframe,
  VideoViewer,
  Checkout,
  CourseViewer,
  Products,
  ProductDetails,
  EmailAutomations,
  Purchases,
  AiChat,
  AdminSystemUsers,
  Users,
  ApiTest,
  ContentCreatorSignup,
  ContentCreatorPortal,
  FeatureControl,
  BrandSettings,
  ProductSettings,
  DevelopmentTools,
  CategoryManagement,
  AudioManagement,
  SubscriptionSettings,
  NotFound,
  MyClassrooms,
  SchoolManagement,
  ParentConsent,
  StudentInvitations,
  AdminHelp,
  Documentation,
  CouponDashboard,
  CouponManagement,
  CouponForm,
  CouponAnalytics,
  BulkCouponGenerator,
  ProductCatalog,
  Games
};