import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Phone, Mail, Smartphone, CheckCircle, XCircle, Construction } from "lucide-react";
import { formatPhoneNumber, extractDigitsForApi, isValidUSPhoneNumber } from "@/utils/phone-formatter";
import type { User } from "@shared/schema";
import DeeperLogo from "@/components/deeper-logo";

interface NotificationPreferencesProps {
  user: User;
}

export default function NotificationPreferences({ user }: NotificationPreferencesProps) {
  const [selectedPreference, setSelectedPreference] = useState<"email" | "sms" | "both">(
    (user.notificationPreference as "email" | "sms" | "both") || "email"
  );
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || "+1");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBetaPopup, setShowBetaPopup] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const needsPhoneSetup = (selectedPreference === "sms" || selectedPreference === "both") && !user.phoneVerified;

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Always use the formatter to handle the input
    const formatted = formatPhoneNumber(input);
    setPhoneNumber(formatted);
  };

  const sendVerificationMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const apiPhoneNumber = extractDigitsForApi(phoneNumber);
      return apiRequest("POST", "/api/users/send-verification", { phoneNumber: apiPhoneNumber });
    },
    onSuccess: () => {
      setCodeSent(true);
      setIsVerifying(true);
      toast({
        title: "Verification code sent",
        description: "Check your phone for a 6-digit verification code."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending code",
        description: error.message || "Failed to send verification code. Please try again.",
        variant: "destructive"
      });
    }
  });

  const verifyPhoneMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; code: string }) => {
      const apiPhoneNumber = extractDigitsForApi(data.phoneNumber);
      return apiRequest("POST", "/api/users/verify-phone", { 
        phoneNumber: apiPhoneNumber, 
        code: data.code 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/by-email/${user.email}`] });
      toast({
        title: "Phone verified successfully",
        description: "Your phone number has been verified and notifications enabled."
      });
      setIsVerifying(false);
      setCodeSent(false);
      setVerificationCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async (preference: "email" | "sms" | "both") => {
      return apiRequest("POST", "/api/users/update-notification-preference", { preference });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/by-email/${user.email}`] });
      toast({
        title: "Preference updated",
        description: `Notifications will be sent via ${selectedPreference === "both" ? "email and text" : selectedPreference}.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update notification preference.",
        variant: "destructive"
      });
    }
  });

  const handleSendVerificationCode = () => {
    if (!isValidUSPhoneNumber(phoneNumber)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit US phone number.",
        variant: "destructive"
      });
      return;
    }
    sendVerificationMutation.mutate(phoneNumber);
  };

  const handleVerifyPhone = () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive"
      });
      return;
    }
    verifyPhoneMutation.mutate({
      phoneNumber: phoneNumber.trim(),
      code: verificationCode.trim()
    });
  };

  const handleUpdatePreference = () => {
    if (needsPhoneSetup) {
      toast({
        title: "Phone verification required",
        description: "Please verify your phone number first to enable text notifications.",
        variant: "destructive"
      });
      return;
    }
    updatePreferenceMutation.mutate(selectedPreference);
  };

  return (
    <Card className="bg-[#1B2137]/90 border-[#4FACFE]/30 backdrop-blur-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Smartphone className="w-5 h-5 text-[#4FACFE]" />
          <span>Notification Preferences</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="space-y-3">
          <Label className="text-slate-200 font-medium">Current Settings</Label>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="border-[#4FACFE] text-[#4FACFE]">
              {user.notificationPreference || "email"}
            </Badge>
            {user.phoneVerified ? (
              <div className="flex items-center space-x-1 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Phone Verified</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-slate-400 text-sm">
                <XCircle className="w-4 h-4" />
                <span>Phone Not Verified</span>
              </div>
            )}
          </div>
        </div>

        {/* Preference Selection */}
        <div className="space-y-3">
          <Label className="text-slate-200 font-medium">How would you like to receive turn notifications?</Label>
          <div className="space-y-3">
            <button
              onClick={() => setSelectedPreference("email")}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedPreference === "email" 
                  ? "border-[#4FACFE] bg-[#4FACFE]/10" 
                  : "border-slate-600 hover:border-slate-500"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedPreference === "email" ? "bg-[#4FACFE]" : "bg-slate-700"
                }`}>
                  <Mail className={`w-5 h-5 ${
                    selectedPreference === "email" ? "text-white" : "text-slate-400"
                  }`} />
                </div>
                <div>
                  <div className="font-medium text-white">Email Only</div>
                  <div className="text-sm text-slate-400">Continue with email notifications</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowBetaPopup(true)}
              className="w-full p-4 rounded-xl border-2 transition-all duration-200 text-left border-slate-600 hover:border-slate-500"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-700">
                  <Phone className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white flex items-center space-x-2">
                    <span>Text Messages Only</span>
                    <Construction className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-sm text-slate-400">Coming soon in beta</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowBetaPopup(true)}
              className="w-full p-4 rounded-xl border-2 transition-all duration-200 text-left border-slate-600 hover:border-slate-500"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-700">
                  <div className="flex space-x-0.5">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white flex items-center space-x-2">
                    <span>Email + Text</span>
                    <Construction className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-sm text-slate-400">Coming soon in beta</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Phone Setup Section */}
        {needsPhoneSetup && (
          <div className="space-y-4 border-t border-slate-600 pt-4">
            <Label className="text-slate-200 font-medium">
              Phone Number Setup Required
            </Label>
            
            {!isVerifying ? (
              <div className="space-y-3">
                <Input
                  type="tel"
                  placeholder="+1(555)123-4567"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="bg-slate-800 border-slate-600 text-white font-mono"
                />
                <div className="text-xs text-slate-400">
                  Just type your 10-digit number (e.g., 5551234567)
                </div>
                <Button
                  onClick={handleSendVerificationCode}
                  disabled={sendVerificationMutation.isPending || !isValidUSPhoneNumber(phoneNumber)}
                  className="w-full bg-[#4FACFE] hover:bg-[#4FACFE]/90"
                >
                  {sendVerificationMutation.isPending ? "Sending..." : "Send Verification Code"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-slate-400">
                  Enter the 6-digit code sent to {phoneNumber}
                </div>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="bg-slate-800 border-slate-600 text-white text-center text-lg tracking-widest"
                  maxLength={6}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleVerifyPhone}
                    disabled={verifyPhoneMutation.isPending || verificationCode.length !== 6}
                    className="flex-1 bg-[#4FACFE] hover:bg-[#4FACFE]/90"
                  >
                    {verifyPhoneMutation.isPending ? "Verifying..." : "Verify & Continue"}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsVerifying(false);
                      setCodeSent(false);
                      setVerificationCode("");
                    }}
                    variant="outline"
                    disabled={verifyPhoneMutation.isPending}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        {!needsPhoneSetup && (
          <Button
            onClick={handleUpdatePreference}
            disabled={updatePreferenceMutation.isPending}
            className="w-full bg-[#4FACFE] hover:bg-[#4FACFE]/90"
          >
            {updatePreferenceMutation.isPending ? "Saving..." : "Save Notification Preference"}
          </Button>
        )}
      </CardContent>

      {/* Beta Notification Popup */}
      <Dialog open={showBetaPopup} onOpenChange={setShowBetaPopup}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 shadow-2xl rounded-3xl">
          <DialogHeader className="text-center space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 dark:from-amber-400 dark:via-amber-500 dark:to-amber-600 flex items-center justify-center shadow-lg">
                <DeeperLogo size="lg" className="text-white drop-shadow-sm" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  Text Alerts Coming Soon!
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-300">
                  We're working hard to bring you SMS notifications
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center space-x-2 text-amber-600 dark:text-amber-400">
              <Construction className="w-5 h-5" />
              <span className="font-medium">Currently in Beta Development</span>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p>
                Deeper is currently in <strong>BETA</strong> and we're working to roll out text message notifications very soon!
              </p>
              <p>
                For now, you'll receive all turn notifications via email. We'll notify you as soon as SMS alerts are available.
              </p>
            </div>
            
            <Button
              onClick={() => setShowBetaPopup(false)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium py-3 rounded-3xl transition-all duration-200"
            >
              Got it, thanks!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}