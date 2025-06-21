import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Crown, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import TrialExpirationPopup from "./trial-expiration-popup";
import type { Connection } from "@shared/schema";

export function InviteeUpgradeBanner() {
  const { user } = useAuth();
  const [showTrialExpiredPopup, setShowTrialExpiredPopup] = useState(false);

  // Check if user was invited by someone else (is an invitee)
  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: [`/api/connections/${user?.email}`],
    enabled: !!user?.email,
  });

  const isInviteeUser = connections.some(c => c.inviteeEmail === user?.email);
  
  // Only show banner for invitee users
  if (!isInviteeUser || !user) {
    return null;
  }

  return (
    <>
      <div className="mb-6 p-4 bg-gradient-to-r from-ocean to-teal rounded-2xl text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5" />
              <span className="font-semibold">Upgrade Now</span>
            </div>
            <p className="text-white/90 text-sm">
              To begin sending invites to other people you desire to go Deeper with
            </p>
          </div>
          <Button
            onClick={() => setShowTrialExpiredPopup(true)}
            className="bg-white text-ocean hover:bg-white/90 font-semibold px-6 py-2 ml-4"
          >
            <Users className="w-4 h-4 mr-2" />
            Upgrade Now
          </Button>
        </div>
      </div>

      <TrialExpirationPopup 
        isOpen={showTrialExpiredPopup} 
        onClose={() => setShowTrialExpiredPopup(false)} 
      />
    </>
  );
}