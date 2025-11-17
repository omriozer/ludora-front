import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import logo from '../../assets/images/logo.png';
import { getProductTypeName } from '@/config/productTypes';
import {
  getContactEmail,
  getContactPhone,
  getWhatsAppUrl,
  getEmailUrl
} from '@/config/contactDefaults';

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

export default function Footer({ isMaintenanceMode = false, theme = 'teacher' }) {
  const { settings } = useUser();

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

  // Student Footer - Same Layout as Teacher but Smaller
  if (theme === 'student') {
    return (
      <footer className="student-footer" role="contentinfo">
        <div className="student-footer-content">
          <div>
            {/* Row 1: Logo and Headings */}
            <div className="grid md:grid-cols-3 gap-2 items-end" style={{gridTemplateColumns: "1fr 2fr 2fr"}}>
              <div className="flex items-center gap-2">
                {logo || settings?.logo_url ? (
                  <img
                    src={logo || settings?.logo_url}
                    alt={settings?.site_name || "לודורה"}
                    className="h-12 md:h-16 object-contain"
                  />
                ) : (
                  <>
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-purple-700">
                      {settings?.site_name || "לודורה"}
                    </h3>
                  </>
                )}
              </div>
              <div>
                <h4 className="student-footer-heading text-right mb-0 leading-none">{footerTexts.importantLinks}</h4>
              </div>
              <div>
                <h4 className="student-footer-heading text-right mb-0 leading-none">{footerTexts.contactUs}</h4>
              </div>
            </div>

            {/* Row 2: Content */}
            <div className="grid md:grid-cols-3 gap-2 items-start" style={{gridTemplateColumns: "1fr 2fr 2fr"}}>
              <div className="student-footer-description">
                {settings?.site_description || 'בית ללמידה אחרת'}
              </div>
              <div className="flex gap-4 justify-start">
                <Link to="/privacy" className="student-footer-link">{footerTexts.privacy}</Link>
                <Link to="/terms" className="student-footer-link">{footerTexts.terms}</Link>
                <Link to="/accessibility" className="student-footer-link">{footerTexts.accessibility}</Link>
              </div>
              <div className="flex items-center justify-start gap-3">
                <span className="student-footer-contact-desc">{footerTexts.contactDescription}</span>
                <div className="student-footer-buttons">
                {/* WhatsApp Button */}
                <a
                  href={getWhatsAppUrl(getContactPhone(settings), 'שלום, יש לי שאלה על לודורה')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="student-footer-button student-footer-button-whatsapp">
                    <WhatsAppIcon className="w-4 h-4" />
                  </button>
                </a>

                {/* Email Button */}
                <a
                  href={getEmailUrl(getContactEmail(settings), 'שאלה על לודורה', '')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="student-footer-button student-footer-button-email">
                    <Mail className="w-4 h-4" />
                  </button>
                </a>

                {/* Contact Form Button */}
                <Link to="/contact">
                  <button className="student-footer-button student-footer-button-contact">
                    {footerTexts.sendMessage}
                  </button>
                </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="student-footer-copyright">
            <p className="student-footer-copyright-text">{footerTexts.copyright}</p>
          </div>
        </div>
      </footer>
    );
  }

  // Teacher Footer - Full Layout (ORIGINAL STYLING RESTORED)
  return (
    <footer className="bg-gray-900 text-white py-4" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-2">
          {/* Row 1: Logo and Headings */}
          <div className="grid md:grid-cols-3 gap-4 items-end" style={{gridTemplateColumns: "1fr 2fr 2fr"}}>
            <div className="flex items-center gap-2">
              {logo || settings?.logo_url ? (
                <img
                  src={logo || settings?.logo_url}
                  alt={settings?.site_name || "לודורה"}
                  className="h-16 md:h-20 object-contain"
                />
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {settings?.site_name || "לודורה"}
                  </h3>
                </>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-white text-right mb-0 leading-none">{footerTexts.importantLinks}</h4>
            </div>
            <div>
              <h4 className="font-semibold text-white text-right mb-0 leading-none">{footerTexts.contactUs}</h4>
            </div>
          </div>

          {/* Row 2: Content */}
          <div className="grid md:grid-cols-3 gap-4 items-start mt-1" style={{gridTemplateColumns: "1fr 2fr 2fr"}}>
            <div className="font-semibold text-sm text-white">
              {settings?.site_description || 'בית ללמידה אחרת'}
            </div>
            <div className="flex gap-4 justify-start">
              <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">{footerTexts.privacy}</Link>
              <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">{footerTexts.terms}</Link>
              <Link to="/accessibility" className="text-gray-400 hover:text-white transition-colors">{footerTexts.accessibility}</Link>
            </div>
            <div className="flex items-center justify-start gap-3">
              <span className="text-gray-400">{footerTexts.contactDescription}</span>
              <div className="flex gap-1">
              {/* WhatsApp Button */}
              <a
                href={getWhatsAppUrl(getContactPhone(settings), 'שלום, יש לי שאלה על לודורה')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-green-600 hover:bg-green-700 text-white border-0 transition-colors whitespace-nowrap">
                  <WhatsAppIcon className="w-4 h-4" />
                </Button>
              </a>

              {/* Email Button */}
              <a
                href={getEmailUrl(getContactEmail(settings), 'שאלה על לודורא', '')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 transition-colors whitespace-nowrap">
                  <Mail className="w-4 h-4" />
                </Button>
              </a>

              {/* Contact Us Button - Hidden in maintenance mode */}
              {!isMaintenanceMode && (
                <Link to="/contact">
                  <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-gray-900 whitespace-nowrap">
                    {footerTexts.sendMessage}
                  </Button>
                </Link>
              )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-1 pt-1 text-center">
          <p className="font-semibold">{footerTexts.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
