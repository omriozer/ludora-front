import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

export default function PaymentSimulator() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const purchaseId = urlParams.get('purchaseId');
  const amount = urlParams.get('amount');
  const environment = urlParams.get('env');

  const handlePaymentAction = (success) => {
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      const status = success ? 'success' : 'failed';
      const resultUrl = `/payment-result?status=${status}&purchaseId=${purchaseId}&amount=${amount}`;
      window.location.href = resultUrl;
    }, 2000);
  };

  if (!purchaseId || !amount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Payment Link</h2>
            <p className="text-gray-600 mb-4">Missing required payment parameters</p>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CreditCard className="w-6 h-6" />
            Payment Simulator
          </CardTitle>
          <Badge variant="outline" className="mx-auto">
            {environment === 'test' ? 'Test Mode' : 'Development Mode'}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-2">Payment Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Purchase ID:</span>
                <span className="font-mono text-xs">{purchaseId.substring(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-bold">₪{amount}</span>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <span className="capitalize">{environment}</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Development Mode:</strong> This is a payment simulator for testing purposes.
              Choose success or failure to test different payment flows.
            </p>
          </div>

          {isProcessing ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Processing payment...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={() => handlePaymentAction(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Simulate Success
              </Button>

              <Button
                onClick={() => handlePaymentAction(false)}
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Simulate Failure
              </Button>

              <Button
                onClick={() => navigate(-1)}
                variant="ghost"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel Payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}