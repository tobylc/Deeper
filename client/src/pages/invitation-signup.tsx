import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export default function InvitationSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Get invitation ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const invitationId = urlParams.get('id');

  // Fetch invitation details
  const { data: invitation, isLoading: invitationLoading, error: invitationError } = useQuery({
    queryKey: ['/api/invitation', invitationId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/invitation/${invitationId}`);
      return response.json();
    },
    enabled: !!invitationId,
  });

  const getInviterName = () => {
    return invitation?.inviterEmail ? invitation.inviterEmail.split('@')[0] : 'someone special';
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Full Name Required",
        description: "Please enter your first and last name.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create account with invitation acceptance
      const response = await apiRequest("POST", "/api/invitation/accept", {
        connectionId: invitation?.id,
        inviteeEmail: invitation?.inviteeEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      });

      if (response.ok) {
        toast({
          title: "Welcome to Deeper!",
          description: `Connection established with ${getInviterName()}. Redirecting to your dashboard...`,
        });
        
        // Redirect to dashboard after brief delay
        setTimeout(() => {
          setLocation("/dashboard");
        }, 2000);
      } else {
        const error = await response.json();
        toast({
          title: "Signup Failed",
          description: error.message || "Failed to create account. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while fetching invitation
  if (invitationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Card className="w-full max-w-md mx-4 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-center text-slate-300">Loading invitation details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if invitation not found or invalid
  if (invitationError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Card className="w-full max-w-md mx-4 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-center text-slate-300">Invalid invitation link. Please check your email for the correct link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Card className="w-full max-w-md mx-4 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Complete Your Connection
          </CardTitle>
          <CardDescription className="text-slate-300">
            {getInviterName()} invited you to connect on Deeper
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400"
                  placeholder="Your first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400"
                  placeholder="Your last name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="inviteeEmail" className="text-slate-300">Your Email Address</Label>
              <Input
                id="inviteeEmail"
                type="email"
                value={invitation.inviteeEmail || ''}
                readOnly
                className="bg-slate-700/50 border-slate-600 text-white cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">
                This email was used for your invitation and cannot be changed
              </p>
            </div>

            <div>
              <Label htmlFor="relationshipType" className="text-slate-300">Relationship Type</Label>
              <Input
                id="relationshipType"
                value={invitation.relationshipType || ''}
                readOnly
                className="bg-slate-700/50 border-slate-600 text-white cursor-not-allowed"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-300">Create Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-400"
                placeholder="Confirm your password"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-200"
            >
              {isLoading ? "Creating Connection..." : "Begin Deeper Connection"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <h4 className="text-sm font-medium text-white mb-2">What happens next?</h4>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Your account will be created with your invitation email</li>
              <li>• A connection will be established with {getInviterName()}</li>
              <li>• You'll be taken to your dashboard to start conversations</li>
              <li>• {getInviterName()} will be notified of your acceptance</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}