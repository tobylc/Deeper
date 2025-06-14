import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/App";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", name: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && !formData.name.trim()) {
      toast({
        title: "Validation Error", 
        description: "Name is required for registration",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const response = await apiRequest("POST", "/api/auth/login", {
          email: formData.email.trim(),
        });
        const user = await response.json();
        setUser(user);
        toast({
          title: "Welcome back!",
          description: "Successfully signed in",
        });
        setLocation("/dashboard");
      } else {
        const response = await apiRequest("POST", "/api/auth/register", {
          email: formData.email.trim(),
          name: formData.name.trim(),
        });
        const user = await response.json();
        setUser(user);
        toast({
          title: "Account created!",
          description: "Welcome to Deeper",
        });
        setLocation("/dashboard");
      }
    } catch (error: any) {
      const errorMessage = error.message || (isLogin ? "Login failed" : "Registration failed");
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Heart className="text-white w-5 h-5" />
            </div>
            <span className="text-2xl font-space font-bold text-darkslate">Deeper</span>
          </div>
          <CardTitle className="text-2xl font-space">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline text-sm"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
