import React, { useState, useEffect } from "react";
import { Purchase } from "@/services/entities";
import { clog, cerror } from '@/lib/utils';

/**
 * Iframe-friendly payment result page for PayPlus integration
 * This page is designed to be embedded in PayPlus iframe without X-Frame-Options issues
 */
export default function PaymentResultIframe() {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    processPaymentResult();
  }, []);

  const processPaymentResult = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);

      // Check for PayPlus parameters
      const transactionUid = urlParams.get('transaction_uid');
      const pageRequestUid = urlParams.get('page_request_uid');
      const resultStatus = urlParams.get('status');

      clog('PayPlus iframe callback:', { transactionUid, pageRequestUid, resultStatus });

      let finalStatus = 'unknown';
      let finalMessage = 'מעבד תשלום...';

      // Handle PayPlus redirect parameters
      if (pageRequestUid) {
        try {
          // Find purchase by PayPlus page_request_uid in metadata
          const purchases = await Purchase.filter({
            metadata: {
              payplus_page_request_uid: pageRequestUid
            }
          });

          if (purchases && purchases.length > 0) {
            const purchaseData = purchases[0];
            clog('Found purchase via PayPlus UID:', purchaseData.id);

            // Determine status from transaction presence and purchase status
            if (transactionUid && purchaseData.payment_status === 'pending') {
              // Payment completed successfully
              finalStatus = 'success';
              finalMessage = 'התשלום הושלם בהצלחה!';

              // Try to update purchase status as webhook fallback
              try {
                await Purchase.update(purchaseData.id, {
                  payment_status: 'completed',
                  metadata: {
                    ...purchaseData.metadata,
                    transaction_uid: transactionUid,
                    payment_completed_via_iframe_fallback: true,
                    payment_completed_at: new Date().toISOString()
                  }
                });
                clog('Purchase status updated via iframe fallback');
              } catch (updateError) {
                cerror('Could not update purchase status via iframe fallback:', updateError);
              }
            } else if (transactionUid) {
              // Have transaction but purchase already processed
              finalStatus = 'success';
              finalMessage = 'התשלום הושלם בהצלחה!';
            } else if (resultStatus === 'failure') {
              finalStatus = 'failure';
              finalMessage = 'התשלום נכשל. אנא נסה שוב.';
            } else if (resultStatus === 'cancel') {
              finalStatus = 'cancel';
              finalMessage = 'התשלום בוטל.';
            } else {
              // Unknown status
              finalStatus = 'unknown';
              finalMessage = 'מצב התשלום לא ברור. אנא פנה לתמיכה.';
            }

            // Communicate result to parent window if possible
            try {
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                  type: 'PAYMENT_RESULT',
                  status: finalStatus,
                  transactionUid,
                  pageRequestUid,
                  purchaseId: purchaseData.id,
                  orderNumber: purchaseData.order_number
                }, '*');
                clog('Sent payment result to parent window');
              }
            } catch (e) {
              clog('Could not communicate with parent window:', e);
            }

          } else {
            cerror('No purchase found for PayPlus page_request_uid:', pageRequestUid);
            finalStatus = transactionUid ? 'success' : 'unknown';
            finalMessage = transactionUid ? 'התשלום הושלם בהצלחה!' : 'לא נמצאה רכישה מתאימה.';
          }
        } catch (searchError) {
          cerror('Error searching for purchase by PayPlus UID:', searchError);
          finalStatus = transactionUid ? 'success' : 'error';
          finalMessage = transactionUid ? 'התשלום הושלם בהצלחה!' : 'שגיאה בעיבוד התשלום.';
        }
      } else {
        // Fallback for direct status parameter
        if (resultStatus === 'success') {
          finalStatus = 'success';
          finalMessage = 'התשלום הושלם בהצלחה!';
        } else if (resultStatus === 'failure') {
          finalStatus = 'failure';
          finalMessage = 'התשלום נכשל. אנא נסה שוב.';
        } else if (resultStatus === 'cancel') {
          finalStatus = 'cancel';
          finalMessage = 'התשלום בוטל.';
        }
      }

      setStatus(finalStatus);
      setMessage(finalMessage);

    } catch (error) {
      cerror('Error processing payment result in iframe:', error);
      setStatus('error');
      setMessage('שגיאה בעיבוד תוצאות התשלום.');
    }

    setIsLoading(false);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failure':
        return '❌';
      case 'cancel':
        return '⚠️';
      case 'error':
        return '🚫';
      default:
        return '❓';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return '#10b981'; // green
      case 'failure':
      case 'error':
        return '#ef4444'; // red
      case 'cancel':
        return '#f59e0b'; // yellow
      default:
        return '#6b7280'; // gray
    }
  };

  if (isLoading) {
    return (
      <div style={{
        direction: 'rtl',
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f9fafb',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: '24px',
          marginBottom: '10px'
        }}>
          ⏳
        </div>
        <div style={{
          fontSize: '16px',
          color: '#6b7280'
        }}>
          מעבד תוצאות תשלום...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      direction: 'rtl',
      padding: '20px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9fafb',
      minHeight: '200px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '48px',
        marginBottom: '15px'
      }}>
        {getStatusIcon()}
      </div>

      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: getStatusColor(),
        marginBottom: '10px'
      }}>
        {message}
      </div>

      {status === 'success' && (
        <div style={{
          fontSize: '14px',
          color: '#6b7280',
          marginTop: '10px'
        }}>
          ניתן לסגור חלון זה ולחזור לאתר
        </div>
      )}

      {(status === 'failure' || status === 'error') && (
        <div style={{
          fontSize: '14px',
          color: '#6b7280',
          marginTop: '10px'
        }}>
          אנא נסה שוב או פנה לתמיכה
        </div>
      )}
    </div>
  );
}