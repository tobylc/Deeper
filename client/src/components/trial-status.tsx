import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Crown, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import TrialExpirationPopup from "./trial-expiration-popup";
import { useState } from "react";

interface TrialStatusData {
  isExpired: boolean;
  daysRemaining: number;
  subscriptionTier: string;
  subscriptionStatus: string;
}

export function TrialStatus() {
  const { user } = useAuth();
  const [showTrialExpiredPopup, setShowTrialExpiredPopup] = useState(false);
  
  const { data: trialStatus, isLoading } = useQuery<TrialStatusData>({
    queryKey: ['/api/trial-status'],
    refetchInterval: 60000, // Check every minute
    enabled: !!user
  });

  if (isLoading || !trialStatus || !user) {
    return (
      <div className="mt-4">
        <div className="flex items-center space-x-2 text-slate-600">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Loading subscription status...</span>
        </div>
      </div>
    );
  }

  // Calculate days remaining for trialing users
  const isDuringTrial = user.subscriptionStatus === 'trialing';
  const isExpiredTrial = user.subscriptionTier === 'free' && !isDuringTrial;
  const isPaidSubscription = user.subscriptionTier && ['basic', 'advanced', 'unlimited'].includes(user.subscriptionTier);

  if (isPaidSubscription) {
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Current Plan</span>
          </div>
          <Badge className="bg-ocean text-white capitalize">
            {user.subscriptionTier}
          </Badge>
        </div>
        {user.subscriptionStatus === 'trialing' && trialStatus.daysRemaining > 0 && (
          <div className="mt-2 text-xs text-slate-500">
            Trial ends in {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'}
          </div>
        )}
      </div>
    );
  }

  if (isExpiredTrial || trialStatus.isExpired) {
    return (
      <>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Current Plan</span>
            </div>
            <Badge variant="secondary" className="bg-slate-200 text-slate-700">
              free
            </Badge>
          </div>
          <div className="mt-2 flex items-center space-x-2 text-xs text-red-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Trial expired</span>
          </div>
          <Button 
            size="sm" 
            className="mt-3 w-full bg-gradient-to-r from-ocean to-teal text-white hover:from-ocean/90 hover:to-teal/90"
            onClick={() => setShowTrialExpiredPopup(true)}
          >
            <Crown className="w-3 h-3 mr-1" />
            Upgrade Now
          </Button>
        </div>
        
        <TrialExpirationPopup 
          isOpen={showTrialExpiredPopup} 
          onClose={() => setShowTrialExpiredPopup(false)} 
        />
      </>
    );
  }

  // Free user during trial
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-600">Current Plan</span>
        </div>
        <Badge variant="secondary" className="bg-slate-200 text-slate-700">
          free
        </Badge>
      </div>
      {isDuringTrial && trialStatus.daysRemaining > 0 && (
        <div className="mt-2 flex items-center space-x-2 text-xs text-amber-600">
          <Clock className="w-3 h-3" />
          <span>{trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'} left in trial</span>
        </div>
      )}
      <Link href="/pricing">
        <Button 
          size="sm" 
          variant="outline"
          className="mt-3 w-full border-ocean text-ocean hover:bg-ocean hover:text-white"
        >
          <Crown className="w-3 h-3 mr-1" />
          View Plans
        </Button>
      </Link>
    </div>
  );
}