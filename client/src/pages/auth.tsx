import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Heart, Sparkles, Mail } from "lucide-react";
import { FaGoogle, FaFacebook, FaApple } from "react-icons/fa";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
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

  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          {/* Left Column - Form */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-amber-500 rounded-3xl flex items-center justify-center shadow-lg">
                  <Heart className="text-white w-6 h-6" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-white">
                  <span className="bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
                    Deeper
                  </span>
                </h1>
              </div>
              <p className="text-slate-300 text-lg">
                Create meaningful connections through structured conversations
              </p>
            </div>

            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 shadow-2xl rounded-3xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">
                  {isLogin ? "Welcome Back" : "Create Account"}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {isLogin ? "Sign in to continue your deeper conversations" : "Start building deeper relationships today"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Social Login Options */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handleSocialLogin('google')}
                    variant="outline"
                    size="lg"
                    className="w-full bg-white hover:bg-gray-50 text-gray-900 border-gray-300 font-medium py-3 rounded-2xl transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </Button>
                  
                  <Button
                    onClick={() => handleSocialLogin('facebook')}
                    variant="outline"
                    size="lg" 
                    className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white border-[#1877F2] font-medium py-3 rounded-2xl transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Continue with Facebook
                  </Button>


                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full bg-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-800 px-2 text-slate-400">Or continue with email</span>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-slate-200">First Name</Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 rounded-xl"
                          placeholder="First name"
                          required={!isLogin}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-slate-200">Last Name</Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 rounded-xl"
                          placeholder="Last name"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 rounded-xl"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-200">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 rounded-xl"
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLogin ? loginMutation.isPending : registerMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {(isLogin ? loginMutation.isPending : registerMutation.isPending) ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ) : null}
                    {isLogin ? "Sign In" : "Create Account"}
                  </Button>
                </form>

                <div className="text-center">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Hero */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                Transform Your Relationships
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed">
                Deeper helps you build more meaningful connections with the people who matter most. 
                Through guided conversations and thoughtful questions, discover new depths in your relationships.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Guided Conversations", desc: "Structured dialogue prompts", icon: "💬" },
                { title: "Relationship Types", desc: "Tailored for different connections", icon: "👥" },
                { title: "Private & Secure", desc: "Your conversations stay safe", icon: "🔒" },
                { title: "Meaningful Questions", desc: "Curated conversation starters", icon: "💭" }
              ].map((feature, i) => (
                <div key={i} className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/30">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">{feature.icon}</span>
                    <h3 className="font-semibold text-white">{feature.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}