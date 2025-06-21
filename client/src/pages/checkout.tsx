import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowLeft, Loader2, Crown } from "lucide-react";
import DeeperLogo from "@/components/deeper-logo";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CheckoutFormProps {
  tier: string;
  onSuccess: () => void;
  hasDiscount: boolean;
  currentPlan: any;
  isImmediateCharge: boolean;
}

const CheckoutForm = ({ tier, onSuccess, hasDiscount, currentPlan, isImmediateCharge }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      let result;
      
      if (isImmediateCharge) {
        // For immediate charge (50% discount users), use confirmPayment
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard`,
          },
        });
      } else {
        // For trial setup, use confirmSetup
        result = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard`,
          },
        });
      }

      if (result.error) {
        toast({
          title: "Unable to process payment",
          description: "Please check your payment details and try again",
        });
      } else {
        toast({
          title: "Subscription Activated",
          description: isImmediateCharge ? 
            "Payment successful! You've been charged $4.95 with 50% discount. Redirecting to dashboard..." :
            "Welcome to your new plan! Redirecting to dashboard...",
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Payment issue",
        description: "Please try again in a moment or contact support if this continues",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <PaymentElement />
      </div>
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-to-r from-ocean to-teal text-white hover:from-ocean/90 hover:to-teal/90 py-3 text-lg font-semibold"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          hasDiscount && tier === 'advanced' ? 'Upgrade to Advanced' : `Upgrade to ${currentPlan.name}`
        )}
      </Button>
      
      {!isImmediateCharge && (
        <p className="text-xs text-center text-white">
          Your trial starts immediately. You won't be charged until day 8.
          Cancel anytime during your trial period.
        </p>
      )}
      
      {isImmediateCharge && (
        <p className="text-xs text-center text-white">
          You'll be charged $4.95 immediately with your 50% discount.
          This is cheaper than having coffee once a month with your Deeper partner!
        </p>
      )}
    </form>
  );
};

export default function Checkout() {
  const [, params] = useRoute('/checkout/:tier');
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImmediateCharge, setIsImmediateCharge] = useState(false);

  const tier = params?.tier;
  
  // Check for discount parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const discountPercent = parseInt(urlParams.get('discount') || '0');
  const hasDiscount = discountPercent > 0;

  // Plan details
  const planDetails = {
    basic: {
      name: 'Basic',
      price: '$4.95',
      originalPrice: '$4.95',
      connections: 1,
      description: 'Perfect for exploring deeper conversations'
    },
    advanced: {
      name: 'Advanced',
      price: hasDiscount && discountPercent === 50 ? '$4.50' : '$9.95',
      originalPrice: '$9.95',
      connections: 3,
      description: 'For meaningful relationships'
    },
    unlimited: {
      name: 'Unlimited',
      price: '$19.95',
      originalPrice: '$19.95',
      connections: 'Unlimited',
      description: 'For extensive connection networks'
    }
  };

  const currentPlan = planDetails[tier as keyof typeof planDetails];

  useEffect(() => {
    if (!tier || !currentPlan) {
      setLocation('/pricing');
      return;
    }

    // Wait for authentication to load before redirecting
    if (authLoading) {
      return;
    }

    if (!user) {
      console.log('User not authenticated, redirecting to auth page');
      setLocation('/auth?redirect=/checkout/' + tier + (hasDiscount ? '?discount=' + discountPercent : ''));
      return;
    }

    console.log('User authenticated:', user.email, 'proceeding with checkout');

    // Create subscription
    const createSubscription = async () => {
      try {
        // Ensure user is still authenticated before making subscription request
        if (!user) {
          throw new Error('Authentication required');
        }

        const requestBody: { tier: string; discountPercent?: number } = { tier };
        if (hasDiscount) {
          requestBody.discountPercent = discountPercent;
        }
        
        console.log('Creating subscription with:', requestBody);
        
        const response = await apiRequest("POST", "/api/subscription/upgrade?test_user=true", requestBody);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create subscription');
        }
        
        const data = await response.json();
        
        if (data.success && data.clientSecret) {
          setClientSecret(data.clientSecret);
          setIsImmediateCharge(data.immediateCharge || false);
        } else {
          throw new Error(data.message || 'Failed to create subscription');
        }
      } catch (error: any) {
        console.error('Subscription creation error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          response: error.response,
          tier,
          hasDiscount,
          discountPercent,
          user: user?.email
        });
        
        // Handle authentication errors specifically
        if (error.message && (error.message.includes('Authentication') || error.message.includes('401') || error.message.includes('Unauthorized'))) {
          console.log('Authentication error detected, redirecting to auth');
          toast({
            title: "Please log in to continue",
            description: "You'll need to sign in to set up your subscription",
          });
          setLocation('/auth?redirect=/checkout/' + tier + (hasDiscount ? '?discount=' + discountPercent : ''));
        } else {
          console.log('Non-auth error, redirecting to pricing');
          toast({
            title: "Unable to set up subscription",
            description: error.message || "Please try again in a moment or contact support if the issue persists",
          });
          setLocation('/pricing');
        }
      } finally {
        setIsLoading(false);
      }
    };

    createSubscription();
  }, [tier, user, currentPlan, setLocation, toast, hasDiscount, discountPercent, authLoading]);

  const handleSuccess = () => {
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  if (!tier || !currentPlan) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ocean/20 to-ocean/30 flex items-center justify-center mx-auto shadow-lg">
            <Loader2 className="w-8 h-8 animate-spin text-ocean" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Setting up your subscription...</h2>
            <p className="text-white/80">
              {hasDiscount && tier === 'advanced' ? 
                'Preparing your 50% discount offer' : 
                'Almost ready to start your 7-day trial'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber/20 to-amber/30 flex items-center justify-center mx-auto shadow-lg">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Setup Issue</h2>
            <p className="text-white/80">We couldn't set up your payment. Let's try again.</p>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={() => setLocation('/pricing')} 
              className="bg-gradient-to-r from-ocean to-teal text-white hover:from-ocean/90 hover:to-teal/90"
            >
              Back to Pricing
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <DeeperLogo size="header" />
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/pricing')}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pricing
          </Button>
        </div>
      </nav>

      <div className="px-6 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            {hasDiscount && tier === 'advanced' ? (
              <>
                <div className="inline-flex items-center px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-full mb-4">
                  🎉 EXCLUSIVE 50% OFF OFFER
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">
                  Complete Your Discounted Subscription
                </h1>
                <p className="text-white text-sm mt-2 italic font-medium">
                  Cheaper and more effective than having coffee once a month with your Deeper partner!
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-white mb-4">
                  Complete Your Subscription
                </h1>
                <p className="text-white/80">
                  Start your 7-day free trial and begin deeper conversations today
                </p>
              </>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Plan Summary */}
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center">
                  {currentPlan.name} Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {hasDiscount && tier === 'advanced' && (
                      <div className="text-lg text-white/60 line-through mb-1">
                        {currentPlan.originalPrice}/month
                      </div>
                    )}
                    {currentPlan.price}
                    <span className="text-lg font-normal text-white/70">/month</span>
                    {hasDiscount && tier === 'advanced' && (
                      <div className="text-sm text-amber-300 font-semibold mt-1">
                        50% OFF LIMITED TIME
                      </div>
                    )}
                  </div>
                  <p className="text-white/80 text-sm">{currentPlan.description}</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/20">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-white">
                      {currentPlan.connections} invitation{currentPlan.connections !== 1 && currentPlan.connections !== 'Unlimited' ? 's' : ''} allowed
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-white">Voice messaging included</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-white">AI question suggestions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-white">7-day free trial</span>
                  </div>
                </div>

                <Badge variant="secondary" className="w-full justify-center py-2 bg-green-100 text-green-800">
                  Free for 7 days, then {currentPlan.price}/month
                </Badge>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Card className="bg-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-slate-800">Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                {clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm tier={tier} onSuccess={handleSuccess} hasDiscount={hasDiscount} currentPlan={currentPlan} isImmediateCharge={isImmediateCharge} />
                  </Elements>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                    <span className="ml-2 text-slate-600">Setting up payment...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-white/60 text-sm">
              Secure payment processing by Stripe. Your information is encrypted and protected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}