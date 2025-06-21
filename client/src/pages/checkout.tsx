import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
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
}

const CheckoutForm = ({ tier, onSuccess }: CheckoutFormProps) => {
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
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription Activated",
          description: "Welcome to your new plan! Redirecting to dashboard...",
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
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
          'Start 7-Day Trial'
        )}
      </Button>
      
      <p className="text-xs text-center text-slate-600">
        Your trial starts immediately. You won't be charged until day 8.
        Cancel anytime during your trial period.
      </p>
    </form>
  );
};

export default function Checkout() {
  const [, params] = useRoute('/checkout/:tier');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const tier = params?.tier;

  // Plan details
  const planDetails = {
    basic: {
      name: 'Basic',
      price: '$4.95',
      connections: 1,
      description: 'Perfect for exploring deeper conversations'
    },
    advanced: {
      name: 'Advanced',
      price: '$9.95',
      connections: 3,
      description: 'For meaningful relationships'
    },
    unlimited: {
      name: 'Unlimited',
      price: '$19.95',
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

    if (!user) {
      setLocation('/auth');
      return;
    }

    // Create subscription
    const createSubscription = async () => {
      try {
        const response = await apiRequest("POST", "/api/subscription/upgrade", { tier });
        const data = await response.json();
        
        if (data.success && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error(data.message || 'Failed to create subscription');
        }
      } catch (error: any) {
        console.error('Subscription creation error:', error);
        toast({
          title: "Setup Error",
          description: error.message || "Failed to set up subscription",
          variant: "destructive",
        });
        setLocation('/pricing');
      } finally {
        setIsLoading(false);
      }
    };

    createSubscription();
  }, [tier, user, currentPlan, setLocation, toast]);

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
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" />
          <p className="text-white">Setting up your subscription...</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white">Unable to set up payment. Please try again.</p>
          <Button onClick={() => setLocation('/pricing')} variant="outline">
            Back to Pricing
          </Button>
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
            <h1 className="text-3xl font-bold text-white mb-4">
              Complete Your Subscription
            </h1>
            <p className="text-white/80">
              Start your 7-day free trial and begin deeper conversations today
            </p>
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
                    {currentPlan.price}
                    <span className="text-lg font-normal text-white/70">/month</span>
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
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm tier={tier} onSuccess={handleSuccess} />
                </Elements>
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