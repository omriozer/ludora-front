import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import LogoDisplay from '@/components/ui/LogoDisplay';
import {
  getContactEmail,
  getContactPhone,
  getWhatsAppUrl,
  getEmailUrl
} from '@/config/contactDefaults';
import { isStudentPortal } from '@/utils/domainUtils';

// WhatsApp Icon Component
const WhatsAppIcon = ({ className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
  </svg>
);

export default function Footer({ isMaintenanceMode = false }) {
  const { settings } = useUser();
  const isStudent = isStudentPortal();

  // Static footer texts - converted from dynamic getText
  const footerTexts = {
    description: `בית ללמידה אחרת`,
    importantLinks: "קישורים חשובים",
    contactUs: "יצירת קשר",
    contactDescription: "לשאלות, תמיכה או כל דבר אחר.",
    sendMessage: "לשליחת פנייה",
    whatsappMessage: "שליחה בוואצאפ",
    emailMessage: "שליחת מייל",
    copyright: "© 2024 לודורה. כל הזכויות שמורות.",
    privacy: "מדיניות פרטיות",
    terms: "תנאי שימוש",
    accessibility: "הצהרת נגישות"
  };

  // Student portal footer - compact design
  if (isStudent) {
    return (
      <footer className="bg-gray-900 text-white py-4" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo and description - compact */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <LogoDisplay size="small" className="h-8 object-contain" />
              </Link>
              <span className="text-sm font-medium hidden md:block">
                {settings?.site_description || 'בית ללמידה אחרת'}
              </span>
            </div>

            {/* Links - compact */}
            <div className="flex items-center gap-3 text-sm">
              <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">
                {footerTexts.privacy}
              </Link>
              <span className="text-gray-600">•</span>
              <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">
                {footerTexts.terms}
              </Link>
              <span className="text-gray-600">•</span>
              <Link to="/accessibility" className="text-gray-400 hover:text-white transition-colors">
                {footerTexts.accessibility}
              </Link>
            </div>

            {/* Contact section - compact */}
            <div className="text-center md:text-right">
              <p className="text-xs text-gray-400 mb-2">{footerTexts.contactDescription}</p>
              <div className="flex gap-2 justify-center md:justify-end">
                <a
                  href={getWhatsAppUrl(getContactPhone(settings), 'שלום, יש לי שאלה על לודורה')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 px-3 py-1 text-xs">
                    <WhatsAppIcon className="w-3 h-3 mr-1" />
                    {footerTexts.whatsappMessage}
                  </Button>
                </a>
                <a
                  href={getEmailUrl(getContactEmail(settings), 'שאלה על לודורה', '')}
                >
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-3 py-1 text-xs">
                    <Mail className="w-3 h-3 mr-1" />
                    {footerTexts.emailMessage}
                  </Button>
                </a>
                {!isMaintenanceMode && (
                  <Link to="/contact">
                    <Button size="sm" variant="outline" className="bg-transparent border-gray-400 text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-1 text-xs">
                      {footerTexts.sendMessage}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Copyright - compact */}
          <div className="border-t border-gray-800 mt-3 pt-3 text-center">
            <p className="text-xs text-gray-400">{footerTexts.copyright}</p>
          </div>
        </div>
      </footer>
    );
  }

  // Teacher portal footer - matching student portal compact design
  return (
    <footer className="bg-gray-900 text-white py-4" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo and description - compact */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <LogoDisplay size="small" className="h-8 object-contain" />
            </Link>
            <span className="text-sm font-medium hidden md:block">
              {settings?.site_description || 'בית ללמידה אחרת'}
            </span>
          </div>

          {/* Links - compact */}
          <div className="flex items-center gap-3 text-sm">
            <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">
              {footerTexts.privacy}
            </Link>
            <span className="text-gray-600">•</span>
            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">
              {footerTexts.terms}
            </Link>
            <span className="text-gray-600">•</span>
            <Link to="/accessibility" className="text-gray-400 hover:text-white transition-colors">
              {footerTexts.accessibility}
            </Link>
          </div>

          {/* Contact section - compact */}
          <div className="text-center md:text-right">
            <p className="text-xs text-gray-400 mb-2">{footerTexts.contactDescription}</p>
            <div className="flex gap-2 justify-center md:justify-end">
              <a
                href={getWhatsAppUrl(getContactPhone(settings), 'שלום, יש לי שאלה על לודורה')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 px-3 py-1 text-xs">
                  <WhatsAppIcon className="w-3 h-3 mr-1" />
                  {footerTexts.whatsappMessage}
                </Button>
              </a>
              <a
                href={getEmailUrl(getContactEmail(settings), 'שאלה על לודורה', '')}
              >
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-3 py-1 text-xs">
                  <Mail className="w-3 h-3 mr-1" />
                  {footerTexts.emailMessage}
                </Button>
              </a>
              {!isMaintenanceMode && (
                <Link to="/contact">
                  <Button size="sm" variant="outline" className="bg-transparent border-gray-400 text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-1 text-xs">
                    {footerTexts.sendMessage}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Copyright - compact */}
        <div className="border-t border-gray-800 mt-3 pt-3 text-center">
          <p className="text-xs text-gray-400">{footerTexts.copyright}</p>
        </div>
      </div>
    </footer>
  );
}