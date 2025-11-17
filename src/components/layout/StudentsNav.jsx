import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Keyboard, QrCode, Camera, CameraOff } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import logo from '../../assets/images/logo.png';

/**
 * Top navigation header for the student portal
 * Simple header with logo on the right side and action buttons on the left
 */
const StudentsNav = () => {
  const { settings } = useUser();
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);

  // Check camera availability on component mount
  React.useEffect(() => {
    const checkCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setIsCameraAvailable(true);
          // Stop the stream immediately after checking
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (error) {
        setIsCameraAvailable(false);
      }
    };

    checkCamera();
  }, []);

  const [codeInput, setCodeInput] = useState('');

  const handleEnterCode = () => {
    if (codeInput.trim().length === 6) {
      // TODO: Implement code entry functionality
      console.log('Enter code with:', codeInput);
    } else {
      console.log('Code must be 6 characters');
    }
  };

  const handleQRScan = () => {
    // TODO: Implement QR scanning functionality
    console.log('QR scan button clicked');
  };

  const handleCodeInputChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setCodeInput(value);
    }
  };

  const handleCodeInputKeyDown = (e) => {
    if (e.key === 'Enter' && codeInput.length === 6) {
      handleEnterCode();
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200" role="navigation" aria-label="Student Navigation">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14" dir="rtl">
          {/* Logo on the right side (first element in RTL = right side) */}
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="לחזור לעמוד הבית"
          >
            {logo || settings?.logo_url ? (
              <img
                src={logo || settings?.logo_url}
                alt={settings?.site_name || "לודורה"}
                className="h-12 md:h-14 object-contain"
              />
            ) : (
              <>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">
                  {settings?.site_name || "לודורה"}
                </span>
              </>
            )}
          </Link>

          {/* Action Buttons on the left side (second element in RTL = left side) */}
          <div className="flex items-center gap-2">
            {/* Code Input and CTA Button */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={handleCodeInputChange}
                onKeyDown={handleCodeInputKeyDown}
                placeholder="ABC123"
                maxLength={6}
                className="w-16 h-8 text-center text-sm font-bold uppercase border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gradient-to-br from-white to-purple-50"
                title="מכניסים קוד כדי להתחבר למורה או למשחק"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnterCode}
                disabled={codeInput.length !== 6}
                className="h-8 px-2 border-purple-200 text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                title="הזן קוד"
              >
                <Keyboard className="w-3 h-3" />
              </Button>
            </div>

            {/* "או" separator */}
            <span className="text-xs text-gray-400 hidden sm:inline">או</span>

            {/* QR Scanner Button - only show if camera is available */}
            {isCameraAvailable ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleQRScan}
                className="h-8 px-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                title="שמצלמים את תמונת QR שקיבלתם"
              >
                <QrCode className="w-3 h-3" />
              </Button>
            ) : (
              <div className="text-xs text-gray-400 hidden sm:block" title="זמין במכשירי נייד">
                <CameraOff className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default StudentsNav;