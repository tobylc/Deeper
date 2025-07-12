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
        const paymentSuccess = localStorage.getItem('paymentSuccess');
        
        if (fromCheckout || paymentSuccess) {
          console.log('[PAYMENT_SUCCESS] Checking for successful payment upgrade');
          
          // Clean up markers
          localStorage.removeItem('paymentSuccess');
          if (fromCheckout) {
            window.history.replaceState({}, '', window.location.pathname);
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