import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Auth() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLogin = () => {
    window.location.href = `/api/auth/login`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5 text-white/80" />
              <span className="text-2xl font-inter font-bold text-white">Deeper</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Background Effects - matching landing page design */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-secondary/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Auth Card - using design system classes */}
          <Card className="card-elevated rounded-3xl backdrop-blur-xl border-border/50 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-inter font-bold text-foreground">
                Welcome to Deeper
              </CardTitle>
              <CardDescription className="text-muted-foreground font-inter">
                Sign in to start building deeper relationships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Production Authentication */}
              <Button
                onClick={handleLogin}
                variant="default"
                size="lg"
                className="w-full btn-ocean font-inter font-medium py-3 rounded-3xl transition-all duration-200 hover:shadow-md"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                </svg>
                Sign in with Replit
              </Button>

              <p className="text-center text-xs text-muted-foreground font-inter">
                Secure authentication powered by Replit
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}