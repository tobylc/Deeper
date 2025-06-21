import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Crown, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface TrialStatusData {
  isExpired: boolean;
  daysRemaining: number;
  subscriptionTier: string;
  subscriptionStatus: string;
}

export function TrialStatus() {
  const { data: trialStatus, isLoading } = useQuery<TrialStatusData>({
    queryKey: ['/api/trial-status'],
    refetchInterval: 60000, // Check every minute
  });

  if (isLoading || !trialStatus) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-300">Loading trial status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show for paid subscriptions
  if (trialStatus.subscriptionTier !== 'trial') {
    return null;
  }

  if (trialStatus.isExpired) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="w-5 h-5" />
            <span>Trial Expired</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            Your 7-day free trial has ended. Choose a subscription plan to continue using Deeper and keep all your conversations.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/pricing">
              <Button className="btn-ocean w-full sm:w-auto">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span className="text-amber-700 dark:text-amber-300">Free Trial</span>
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'} left
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
          {trialStatus.daysRemaining <= 2 
            ? `Your trial expires in ${trialStatus.daysRemaining} ${trialStatus.daysRemaining === 1 ? 'day' : 'days'}. Upgrade now to keep your conversations and unlock more features.`
            : `You have ${trialStatus.daysRemaining} days remaining in your free trial. Upgrade anytime to unlock more connections.`
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/pricing">
            <Button className="btn-ocean w-full sm:w-auto">
              <Crown className="w-4 h-4 mr-2" />
              View Plans
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}