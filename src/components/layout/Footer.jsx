import React, { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadSettingsWithRetry } from '@/lib/appUser';
import { Settings } from '@/services/entities';
import logo from '../../assets/images/logo.png';
import { getProductTypeName } from '@/config/productTypes';

export default function Footer() {
  // Static footer texts - converted from dynamic getText
  const footerTexts = {
    description: `פלטפורמה מתקדמת ל${getProductTypeName('game', 'plural')} חינוכיים ו${getProductTypeName('tool', 'plural')} דיגיטליים`, // This specific text is no longer used for the main description, but kept for consistency if other parts might reference it.
    importantLinks: "קישורים חשובים",
    contactUs: "צרי קשר",
    contactDescription: "לשאלות, תמיכה או כל דבר אחר.",
    sendMessage: "לשליחת פנייה",
    copyright: "© 2024 לודורה. כל הזכויות שמורות.",
    privacy: "מדיניות פרטיות",
    terms: "תנאי שימוש",
    accessibility: "הצהרת נגישות"
  };

  const [settings, setSettings] = React.useState(null);

  // Add retry logic for settings loading
  // Use shared loadSettingsWithRetry from lib/appUser

  const loadSettings = useCallback(async () => {
    try {
      const settingsData = await loadSettingsWithRetry(Settings);
      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData[0]);
      }
    } catch (error) {
      console.error('Error loading settings in footer:', error);
      // Use fallback settings if needed
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <footer className="bg-gray-900 text-white py-8" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {logo || settings?.logo_url ? (
                <img
                  src={logo || settings?.logo_url}
                  alt={settings?.site_name || "לודורה"}
                  className="h-12 md:h-16 object-contain -mb-4" // smaller and negative margin to reduce gap
                  style={{marginBottom: '-1.5rem'}} // extra negative margin for fine-tuning
                />
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {settings?.site_name || "לודורה"}
                  </h3>
                </>
              )}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {settings?.site_description || `פלטפורמה מתקדמת ל${getProductTypeName('game', 'plural')} חינוכיים ו${getProductTypeName('tool', 'plural')} דיגיטליים שהופכים את הלמידה למהנה ואפקטיבית`}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{footerTexts.importantLinks}</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">{footerTexts.privacy}</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">{footerTexts.terms}</Link></li>
              <li><Link to="/accessibility" className="text-gray-400 hover:text-white transition-colors">{footerTexts.accessibility}</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{footerTexts.contactUs}</h4>
            <p className="text-gray-400 mb-4">{footerTexts.contactDescription}</p>
            <Link to="/contact">
                <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-gray-900">
                    {footerTexts.sendMessage}
                </Button>
            </Link>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-500">{footerTexts.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
