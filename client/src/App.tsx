import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createContext, useContext, useState, useEffect } from "react";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Conversation from "@/pages/conversation";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";
import type { User } from "@shared/schema";

const AuthContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
}>({
  user: null,
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/conversation/:id" component={Conversation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const updateUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, setUser: updateUser }}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
