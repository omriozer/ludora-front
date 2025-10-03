import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getApiBase } from '@/utils/api';
import { apiRequest } from '@/services/apiClient';
import { clog, cerror } from '@/lib/utils';
import { getProductTypeName } from '@/config/productTypes';

/**
 * Unified Get Access Button Component
 * Handles both free and paid product access
 * - Free products: Auto-creates purchase and redirects to product details
 * - Paid products: Redirects to purchase page
 * - Shows access status if product is already purchased
 *
 * @param {object} product - The product object (includes purchase if exists)
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size variant
 * @param {boolean} fullWidth - Whether button should be full width
 * @param {function} onSuccess - Callback after successful free purchase
 */
export default function GetAccessButton({
  product,
  className = '',
  size = 'lg',
  fullWidth = false,
  onSuccess
}) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user already has access
  const hasAccess = product?.purchase && product.purchase.payment_status === 'completed';

  const handleGetAccess = async () => {
    if (!product) {
      cerror('No product provided to GetAccessButton');
      return;
    }

    // Check if user is authenticated
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      toast({
        title: "נדרשת התחברות",
        description: "יש להתחבר כדי לקבל גישה למוצר",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }


    if (isFree()) {
      // Auto-purchase free product
      await handleFreePurchase();
    } else {
      // Redirect to purchase page for paid products
      const productType = product.product_type || 'file';
      navigate(`/purchase?type=${productType}&id=${product.id}`);
    }
  };

  const isFree = () => { 
    return !product.price || product.price == 0;
  }

  const getAccessText = () => {
    if (!isFree()) {
      const productName = getProductTypeName(product?.product_type, 'singular');
      return "לרכישת ה" + productName;
    } else {
      switch (product?.product_type) {
        case 'file':
          return 'להורדת ה' + productName;
        case 'course':
          return 'כניסה ל' + productName;
        case 'workshop':
          return 'לצפיה ב';
        case 'tool':
          return 'לשימוש ב' + productName;
        case 'game':
          return 'ל' + productName;
        default:
          return 'למוצר';
      }
    }
  }

  const handleFreePurchase = async () => {
    setIsProcessing(true);

    try {
      const authToken = localStorage.getItem('authToken');

      // Decode JWT to get user ID
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      const userId = payload.uid;

      const productType = product.product_type || 'file';

      clog('Creating free purchase for product:', product.id, 'user:', userId);

      const purchase = await apiRequest('/entities/purchase', {
        method: 'POST',
        body: JSON.stringify({
          buyer_user_id: userId,
          purchasable_id: product.entity_id || product.id,
          purchasable_type: productType,
          payment_method: 'free',
          payment_status: 'completed',
          payment_amount: 0,
          original_price: product.price || 0,
          discount_amount: 0
        })
      });
      clog('Free purchase created successfully:', purchase);

      toast({
        title: "המוצר התקבל בהצלחה!",
        description: "המוצר החינמי נוסף לחשבונך",
      });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(purchase);
      }

      // Redirect based on product type
      if (productType === 'file') {
        // For files, redirect to product details page
        navigate(`/product-details/${productType}/${product.id}`);
      } else {
        // For other types, just reload the page to show access
        window.location.reload();
      }

    } catch (error) {
      cerror('Error creating free purchase:', error);

      // Extract error message properly
      let errorMessage = "אירעה שגיאה בעת הוספת המוצר לחשבונך";
      if (error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({
        title: "שגיאה בקבלת המוצר",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // If user already has access, show different button
  if (hasAccess) {
    const productType = product.product_type || 'file';
    return (
      <Button
        onClick={() => navigate(`/product-details/${productType}/${product.id}`)}
        className={`group relative overflow-hidden bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-green-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
        size={size}
      >
        <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>יש לך גישה</span>
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
      </Button>
    );
  }

  return (
    <Button
      onClick={handleGetAccess}
      disabled={isProcessing}
      className={`group relative overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-blue-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
      size={size}
    >
      <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            <span>מעבד...</span>
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-300" />
            <span>{getAccessText()}</span>
          </>
        )}
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
    </Button>
  );
}
