import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";
import { FaGoogle, FaFacebook, FaApple } from "react-icons/fa";
import { Link } from "wouter";

export default function Auth() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: ""
  });
  const { toast } = useToast();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      loginMutation.mutate({
        email: formData.email,
        password: formData.password
      });
    } else {
      registerMutation.mutate({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      });
    }
  };

  const handleSocialLogin = () => {
    window.location.href = `/api/login`;
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

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md smooth-enter">
          {/* Logo Section - consistent with landing page */}
          <div className="text-center mb-8">
            <span className="text-3xl font-inter font-bold text-foreground mb-2 block">Deeper</span>
            <p className="text-muted-foreground text-sm font-inter">
              Cultivate meaningful connections
            </p>
          </div>

          {/* Auth Card - using design system classes */}
          <Card className="card-elevated rounded-3xl backdrop-blur-xl border-border/50 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-inter font-bold text-foreground">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-muted-foreground font-inter">
                {isLogin ? "Sign in to continue your deeper conversations" : "Start building deeper relationships today"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Social Login Options - matching design system */}
              <div className="space-y-3">
                <Button
                  onClick={handleSocialLogin}
                  variant="outline"
                  size="lg"
                  className="w-full bg-card hover:bg-accent text-foreground border-border font-inter font-medium py-3 rounded-3xl transition-all duration-200 hover:shadow-md"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Replit Auth
                </Button>
              </div>

              <div className="relative">
                <Separator className="bg-border" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card px-3 text-muted-foreground text-sm font-inter">or continue with email</span>
                </div>
              </div>

              {/* Email Form - using design system styling */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-foreground font-inter font-medium">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground rounded-2xl focus-blue font-inter"
                        placeholder="First name"
                        required={!isLogin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-foreground font-inter font-medium">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground rounded-2xl focus-blue font-inter"
                        placeholder="Last name"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-inter font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground rounded-2xl focus-blue font-inter"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-inter font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground rounded-2xl focus-blue font-inter"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLogin ? loginMutation.isPending : registerMutation.isPending}
                  className="w-full btn-ocean font-inter font-medium py-3 rounded-3xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {(isLogin ? loginMutation.isPending : registerMutation.isPending) ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  ) : null}
                  {isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:text-primary/80 text-sm transition-colors font-inter font-medium"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}