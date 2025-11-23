import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  renderQRCode,
  downloadQRCode,
  LUDORA_OFFICIAL_PRESET
} from '@/utils/qrCodeUtils';
import {
  Download,
  RefreshCw,
  Crown
} from 'lucide-react';
import { urls } from '@/config/urls';

export default function Demo() {
  const [qrInstance, setQrInstance] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const qrRef = useRef(null);

  // Get marketing URL from centralized configuration
  const marketingUrl = urls.external.marketing.main();

  const generateLudoraQR = async () => {
    if (!qrRef.current) return;

    setIsGenerating(true);

    // Small delay to show loading
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const ludoraQR = renderQRCode(
        marketingUrl,
        qrRef.current,
        LUDORA_OFFICIAL_PRESET,
        { width: 300, height: 300 }
      );
      setQrInstance(ludoraQR);
    } catch (error) {
      console.error('Error generating Ludora QR:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = () => {
    if (qrInstance) {
      downloadQRCode(qrInstance, 'ludora-official-qr', 'png');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎨 Ludora QR Code Demo
          </h1>
          <p className="text-lg text-gray-600">
            דמו פשוט של QR code עם לוגו לודורא
          </p>
        </div>

        {/* QR Code Card */}
        <Card className="overflow-hidden shadow-xl">
          <CardHeader className="bg-gradient-to-r from-teal-400 to-yellow-400 text-white">
            <CardTitle className="flex items-center gap-3">
              <Crown className="w-6 h-6" />
              <div>
                <div className="text-lg font-bold">Ludora Official</div>
                <div className="text-sm opacity-90 font-normal">עם לוגו לודורא מוטמע</div>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8">
            {/* QR Code Container */}
            <div className="flex justify-center mb-6 p-6 bg-gray-50 rounded-lg relative">
              {isGenerating && (
                <div className="absolute inset-6 flex items-center justify-center bg-gray-200 rounded-lg z-10">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              )}

              <div
                ref={qrRef}
                className="qr-container border-2 border-dashed border-gray-300 relative"
                style={{
                  width: 300,
                  height: 300,
                  minHeight: 300,
                  visibility: isGenerating ? 'hidden' : 'visible'
                }}
              >
                {!isGenerating && !qrInstance && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm bg-white rounded">
                    לחץ כדי ליצור QR Code
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <Button
                onClick={generateLudoraQR}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-teal-500 to-yellow-500 hover:from-teal-600 hover:to-yellow-600 text-white py-3"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    יוצר QR Code...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 mr-2" />
                    צור QR Code עם לוגו לודורא
                  </>
                )}
              </Button>

              {qrInstance && (
                <Button
                  onClick={downloadQR}
                  variant="outline"
                  className="w-full border-2 border-teal-200 hover:bg-teal-50 text-teal-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  הורד PNG
                </Button>
              )}
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-sm text-blue-800">
                <strong>URL:</strong> {marketingUrl}
              </div>
              <div className="text-sm text-blue-700 mt-1">
                QR code זה מכיל את הלוגו של לודורא ומוביל לאתר הראשי
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Example */}
        <Card className="mt-8 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">
              איך להשתמש בקוד
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`import { renderQRCode, LUDORA_OFFICIAL_PRESET } from '@/utils/qrCodeUtils';
import { urls } from '@/config/urls';

// יצירת QR עם לוגו לודורא
const marketingUrl = urls.external.marketing.main();
renderQRCode(
  marketingUrl,
  containerElement,
  LUDORA_OFFICIAL_PRESET,
  { width: 300, height: 300 }
);`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}