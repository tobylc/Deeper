import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Crown, Sparkles } from 'lucide-react';

export function PaymentSuccessNotification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasCheckedPayment, setHasCheckedPayment] = useState(false);

  useEffect(() => {
    // Only check once per session
    if (!user || hasCheckedPayment) return;

    const checkPaymentSuccess = async () => {
      try {
        // Check if user just upgraded from URL parameters or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const fromCheckout = urlParams.get('from') === 'checkout';
        const hasDiscountPayment = urlParams.get('payment_success') === 'true' && urlParams.get('discount') === 'true';
        const paymentSuccess = localStorage.getItem('paymentSuccess');
        
        if (fromCheckout || paymentSuccess || hasDiscountPayment) {
          console.log('[PAYMENT_SUCCESS] Checking for successful payment upgrade');
          console.log('[PAYMENT_SUCCESS] From checkout:', fromCheckout);
          console.log('[PAYMENT_SUCCESS] Has discount payment:', hasDiscountPayment);
          
          // Clean up markers
          localStorage.removeItem('paymentSuccess');
          if (fromCheckout || hasDiscountPayment) {
            window.history.replaceState({}, '', window.location.pathname);
          }
          
          // For discount payments, more aggressive checking
          const maxAttempts = hasDiscountPayment ? 5 : 2;
          let upgraded = false;
          
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`[PAYMENT_SUCCESS] Attempt ${attempt}/${maxAttempts} - Triggering payment status check`);
            
            try {
              const checkResponse = await fetch('/api/subscription/check-payment-status', {
                method: 'POST',
                credentials: 'include'
              });
              
              if (checkResponse.ok) {
                const checkResult = await checkResponse.json();
                console.log(`[PAYMENT_SUCCESS] Check result:`, checkResult);
                console.log(`[PAYMENT_SUCCESS] Check result upgraded:`, checkResult.upgraded);
                console.log(`[PAYMENT_SUCCESS] Check result tier:`, checkResult.tier);
                console.log(`[PAYMENT_SUCCESS] Check result message:`, checkResult.message);
                
                if (checkResult.upgraded) {
                  upgraded = true;
                  console.log(`[PAYMENT_SUCCESS] ✅ Upgrade detected on attempt ${attempt}`);
                  break;
                }
              } else {
                console.error(`[PAYMENT_SUCCESS] Check response not ok:`, checkResponse.status, checkResponse.statusText);
                const errorText = await checkResponse.text();
                console.error(`[PAYMENT_SUCCESS] Error response:`, errorText);
              }
            } catch (error) {
              console.error(`[PAYMENT_SUCCESS] Check attempt ${attempt} failed:`, error);
            }
            
            // Wait before next attempt (longer for later attempts)
            if (attempt < maxAttempts && !upgraded) {
              await new Promise(resolve => setTimeout(resolve, attempt * 1500));
            }
          }
          
          // Check if user has Advanced plan
          const response = await fetch('/api/trial-status', {
            method: 'GET',
            credentials: 'include'
          });
          
          if (response.ok) {
            const trialStatus = await response.json();
            
            if (trialStatus.subscriptionTier === 'advanced') {
              // Show success notification
              toast({
                title: "🎉 Welcome to Advanced!",
                description: "Your payment was successful. You now have access to 3 connections and all premium features!",
                className: "bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-800",
                duration: 8000
              });
              
              // Also show a celebratory overlay briefly
              setTimeout(() => {
                toast({
                  title: "✨ Advanced Plan Activated",
                  description: "Start inviting up to 3 people for deeper conversations!",
                  className: "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-800",
                  duration: 6000
                });
              }, 2000);
            }
          }
        }
      } catch (error) {
        console.error('Payment success check failed:', error);
      } finally {
        setHasCheckedPayment(true);
      }
    };

    // Check after a short delay to allow page to load
    const timer = setTimeout(checkPaymentSuccess, 1000);
    return () => clearTimeout(timer);
  }, [user, hasCheckedPayment, toast]);

  return null; // This component doesn't render anything visible
}