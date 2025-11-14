import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, Loader2, AlertCircle } from "lucide-react";
import { cerror } from "@/lib/utils";

export default function LoginModal({ onClose, onLogin, message }) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setError('');

    try {
      await onLogin(rememberMe);
      // Don't call onClose() here - let the parent component handle modal closing
    } catch (err) {
      cerror('Google sign-in error:', err);

      let errorMessage = 'שגיאה בכניסה. נסו שוב.';
      
      if (err.message) {
        if (err.message.includes('popup-closed-by-user')) {
          errorMessage = 'ההתחברות בוטלה על ידי המשתמש.';
        } else if (err.message.includes('Firebase not initialized')) {
          errorMessage = 'שירות ההתחברות אינו זמין כעת.';
        } else if (err.message.includes('auth/invalid-api-key')) {
          errorMessage = 'בעיה בהגדרות הזיהוי. צרו קשר עם התמיכה.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto bg-white shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            התחברות ללודורה
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600 mb-6">
            {message || "השתמשו בחשבון הגוגל שלכם כדי להתחבר"}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-right">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm flex items-center justify-center gap-3"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                מתחבר...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                המשיכו עם Google
              </>
            )}
          </Button>

          {/* Remember Me Checkbox */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Checkbox
              id="remember-me"
              className="me-2"
              checked={rememberMe}
              onCheckedChange={setRememberMe}
            />
            <Label 
              htmlFor="remember-me" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              זכור אותי במחשב זה
            </Label>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-4">
            על ידי התחברות, אתם מסכימים ל
            <Link
              to="/terms"
              className="text-blue-600 hover:text-blue-800 underline mx-1"
              onClick={onClose}
            >
              תנאי השימוש
            </Link>
            ול
            <Link
              to="/privacy"
              className="text-blue-600 hover:text-blue-800 underline mx-1"
              onClick={onClose}
            >
              מדיניות הפרטיות
            </Link>
            שלנו
          </div>
        </CardContent>
      </Card>
    </div>
  );
}