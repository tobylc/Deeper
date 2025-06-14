import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Heart, LogIn, Sparkles } from "lucide-react";

export default function Auth() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md card-elevated">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted opacity-90"></div>
      
      <Card className="relative w-full max-w-md card-elevated backdrop-blur-sm border-border/20">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Heart className="text-white w-6 h-6" />
            </div>
            <span className="text-3xl font-inter font-bold text-foreground">Deeper</span>
          </div>
          <CardTitle className="text-2xl font-inter text-foreground mb-3">
            Welcome to Deeper
          </CardTitle>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-muted-foreground text-sm">
              Where meaningful connections begin
            </p>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create intimate conversation spaces with the people who matter most. 
              Start deeper dialogues that strengthen your relationships.
            </p>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full btn-ocean h-12 text-base font-medium flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Replit
          </Button>
          
          <div className="text-center text-xs text-muted-foreground pt-2">
            <p>By signing in, you agree to our terms of service and privacy policy</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}