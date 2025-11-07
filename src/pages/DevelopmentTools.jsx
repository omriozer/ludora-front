
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/contexts/UserContext";
import { cerror } from "@/lib/utils";
import { testPayplusConnection } from "@/services/functions";
import {
  Wrench,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Loader,
  Clock,
  TestTube,
  Loader2, // New import
  Shield, // New import
  Globe, // New import
  CheckCircle2 // New import
} from "lucide-react";

export default function DevelopmentTools() {
  const navigate = useNavigate();
  const { currentUser, isLoading: userLoading } = useUser();

  const [testResults, setTestResults] = useState({
    test: null,
    production: null
  });
  const [testing, setTesting] = useState({
    test: false,
    production: false
  });
  // New state variables for PayPlus specific test
  const [isTestingPayplus, setIsTestingPayplus] = useState(false); // Can be 'test', 'production', or false
  const [payplusTestResults, setPayplusTestResults] = useState(null);
  const [message, setMessage] = useState(null); // For general success/error messages

  useEffect(() => {
    if (!userLoading && currentUser) {
      // Check if user is admin
      if (currentUser.role !== 'admin') {
        navigate('/');
      }
    }
  }, [userLoading, currentUser, navigate]);

  const testPaymentConnection = async (environment) => {
    setTesting(prev => ({ ...prev, [environment]: true }));
    setTestResults(prev => ({ ...prev, [environment]: null }));
    setMessage(null); // Clear general message

    try {
      const { data } = await testPayplusConnection({ environment });
      setTestResults(prev => ({ ...prev, [environment]: data }));
      if (data?.success) {
        setMessage({ type: 'success', text: `בדיקת חיבור כללי (${environment}) הצליחה.` });
      } else {
        setMessage({ type: 'error', text: `בדיקת חיבור כללי (${environment}) נכשלה.` });
      }
    } catch (error) {
      cerror(`Error testing ${environment}:`, error);
      setTestResults(prev => ({
        ...prev,
        [environment]: {
          success: false,
          error: 'שגיאה בביצוע הבדיקה',
          details: error.message
        }
      }));
      setMessage({ type: 'error', text: `שגיאה בביצוע בדיקת חיבור כללי (${environment}): ${error.message}` });
    }

    setTesting(prev => ({ ...prev, [environment]: false }));
  };

  // New function for specific PayPlus connection testing
  const handleTestPayplusConnection = async (environment) => {
    setIsTestingPayplus(environment); // Set to environment ('test' or 'production') to show specific loader
    setPayplusTestResults(null);
    setMessage(null); // Clear previous messages

    try {
      // Use the already imported testPayplusConnection function
      const result = await testPayplusConnection({ environment });
      setPayplusTestResults(result.data || result); // Assuming the function returns { data: { ... } } or { ... } directly

      if (result.data?.success || result.success) { // Check both result.data.success and result.success
        setMessage({ type: 'success', text: `בדיקת PayPlus (${environment}) הצליחה!` });
      } else {
        setMessage({ type: 'error', text: `בדיקת PayPlus (${environment}) נכשלה: ${result.data?.error || result.error || 'שגיאה לא ידועה'}` });
      }

    } catch (error) {
      cerror('Error testing PayPlus:', error);
      setPayplusTestResults({
        success: false,
        error: 'שגיאה בקריאה לפונקציה',
        details: error.message
      });
      setMessage({ type: 'error', text: `שגיאה בבדיקת PayPlus: ${error.message}` });
    } finally {
      setIsTestingPayplus(false); // Reset to false when done
    }
  };

  const getResultIcon = (result) => {
    if (!result) return null;
    return result.success ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <AlertTriangle className="w-5 h-5 text-red-600" />
    );
  };

  const getResultBadge = (result) => {
    if (!result) return null;
    return (
      <Badge variant={result.success ? "default" : "destructive"} className="mr-2">
        {result.success ? "תקין" : "שגיאה"}
      </Badge>
    );
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען כלי פיתוח...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">כלי פיתוח</h1>
              <p className="text-gray-600">כלים לבדיקה ופיתוח המערכת</p>
            </div>
          </div>
        </div>

        {/* Message display */}
        {message && (
          <Alert variant={message.type === 'success' ? 'default' : 'destructive'} className="mb-4">
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* PayPlus Connection Test Section */}
        <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden mb-6">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              בדיקת חיבור PayPlus
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                בדוק את החיבור ל-PayPlus ואת תקינות המפתחות
              </p>

              <div className="flex gap-4">
                <Button
                  onClick={() => handleTestPayplusConnection('test')}
                  disabled={isTestingPayplus !== false} // Disable if any testing is in progress
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isTestingPayplus === 'test' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Shield className="w-4 h-4 mr-2" />
                  בדיקה - סביבת טסט
                </Button>

                <Button
                  onClick={() => handleTestPayplusConnection('production')}
                  disabled={isTestingPayplus !== false} // Disable if any testing is in progress
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {isTestingPayplus === 'production' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Globe className="w-4 h-4 mr-2" />
                  בדיקה - סביבת ייצור
                </Button>
              </div>

              {/* Test Results */}
              {payplusTestResults && (
                <div className="mt-4 p-4 rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    {payplusTestResults.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    תוצאות בדיקה
                  </h4>

                  <div className="space-y-2 text-sm">
                    <div><strong>סטטוס:</strong> {payplusTestResults.success ? '✅ תקין' : '❌ שגיאה'}</div>
                    <div><strong>הודעה:</strong> {payplusTestResults.message}</div>
                    {payplusTestResults.responseTime && (
                      <div><strong>זמן תגובה:</strong> {payplusTestResults.responseTime}</div>
                    )}
                    {payplusTestResults.details && (
                      <div className="mt-2">
                        <strong>פרטים נוספים:</strong>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto max-h-32">
                          {payplusTestResults.details}
                        </pre>
                      </div>
                    )}
                    {payplusTestResults.payplus_response && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-medium">תגובת PayPlus מלאה</summary>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto max-h-40">
                          {JSON.stringify(payplusTestResults.payplus_response, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Connection Tests (Existing Section) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-500" />
              בדיקות סליקה כלליות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Test Environment */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <TestTube className="w-5 h-5 text-orange-500" />
                  <div>
                    <h3 className="font-semibold text-gray-900">סביבת טסטים</h3>
                    <p className="text-sm text-gray-600">בדיקת חיבור PayPlus - סביבת פיתוח</p>
                  </div>
                </div>
                <Button
                  onClick={() => testPaymentConnection('test')}
                  disabled={testing.test || isTestingPayplus !== false} // Disable if current test or PayPlus test is running
                  variant="outline"
                  className="min-w-32"
                >
                  {testing.test ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin ml-2" />
                      בודק...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 ml-2" />
                      בדוק חיבור
                    </>
                  )}
                </Button>
              </div>

              {testResults.test && (
                <Alert variant={testResults.test.success ? "default" : "destructive"}>
                  <div className="flex items-start gap-2">
                    {getResultIcon(testResults.test)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getResultBadge(testResults.test)}
                        <span className="font-medium">{testResults.test.message}</span>
                        {testResults.test.responseTime && (
                          <Badge variant="outline" className="mr-auto">
                            <Clock className="w-3 h-3 ml-1" />
                            {testResults.test.responseTime}
                          </Badge>
                        )}
                      </div>
                      {testResults.test.details && (
                        <p className="text-sm text-gray-600 mt-1">{testResults.test.details}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}
            </div>

            {/* Production Environment */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-green-500" />
                  <div>
                    <h3 className="font-semibold text-gray-900">סביבת ייצור</h3>
                    <p className="text-sm text-gray-600">בדיקת חיבור PayPlus - סביבה חיה</p>
                  </div>
                </div>
                <Button
                  onClick={() => testPaymentConnection('production')}
                  disabled={testing.production || isTestingPayplus !== false} // Disable if current test or PayPlus test is running
                  variant="outline"
                  className="min-w-32"
                >
                  {testing.production ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin ml-2" />
                      בודק...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 ml-2" />
                      בדוק חיבור
                    </>
                  )}
                </Button>
              </div>

              {testResults.production && (
                <Alert variant={testResults.production.success ? "default" : "destructive"}>
                  <div className="flex items-start gap-2">
                    {getResultIcon(testResults.production)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getResultBadge(testResults.production)}
                        <span className="font-medium">{testResults.production.message}</span>
                        {testResults.production.responseTime && (
                          <Badge variant="outline" className="mr-auto">
                            <Clock className="w-3 h-3 ml-1" />
                            {testResults.production.responseTime}
                          </Badge>
                        )}
                      </div>
                      {testResults.production.details && (
                        <p className="text-sm text-gray-600 mt-1">{testResults.production.details}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Note */}
        <Alert>
          <TestTube className="h-4 w-4" />
          <AlertDescription>
            <strong>הערה:</strong> כלי פיתוח אלה מיועדים למנהלי המערכת לבדיקת תקינות שירותים חיצוניים ופתרון תקלות.
            השתמשו בהם במידה ויש בעיות בתשלומים או בחיבור למערכות חיצוניות.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
