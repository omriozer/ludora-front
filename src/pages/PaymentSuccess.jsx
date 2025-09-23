import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get('order');
    const type = urlParams.get('type');

    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to My Account page
          navigate('/account');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          התשלום בוצע בהצלחה!
        </h1>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          תודה על התשלום. המנוי שלך מתעדכן ברקע ויהיה זמין בקרוב בחשבון שלך.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>מעבר לחשבון שלי בעוד {countdown} שניות...</span>
        </div>
        
        <button 
          onClick={() => navigate('/account')}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors"
        >
          עבור לחשבון שלי עכשיו
        </button>
      </div>
    </div>
  );
}