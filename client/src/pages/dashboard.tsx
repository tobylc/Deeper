import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/App";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Heart, Plus, MessageCircle, Clock, Users, Mail } from "lucide-react";
import InvitationForm from "@/components/invitation-form";
import type { Connection, Conversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  const { data: connections = [], refetch: refetchConnections } = useQuery<Connection[]>({
    queryKey: [`/api/connections/${user?.email}`],
    enabled: !!user?.email,
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: [`/api/conversations/${user?.email}`],
    enabled: !!user?.email,
  });

  const handleAcceptConnection = async (connectionId: number) => {
    if (!user) return;
    
    try {
      await apiRequest("PATCH", `/api/connections/${connectionId}/accept`, {
        accepterEmail: user.email,
      });
      toast({
        title: "Connection accepted!",
        description: "Your conversation space is ready.",
      });
      refetchConnections();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept connection",
        variant: "destructive",
      });
    }
  };

  const handleDeclineConnection = async (connectionId: number) => {
    if (!user) return;
    
    try {
      await apiRequest("PATCH", `/api/connections/${connectionId}/decline`, {
        declinerEmail: user.email,
      });
      toast({
        title: "Connection declined",
        description: "The invitation has been declined.",
      });
      refetchConnections();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to decline connection",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLocation("/");
  };

  if (!user) return null;

  const pendingConnections = connections.filter(c => c.status === 'pending' && c.inviteeEmail === user.email);
  const activeConversations = conversations.filter(c => c.status === 'active');

  return (
    <div className="min-h-screen gradient-warm">
      {/* Header */}
      <div className="glass-nav">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 gradient-sage rounded-xl flex items-center justify-center">
                <Heart className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-inter font-bold text-deep-forest">Deeper</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user.name}</span>
              <Button variant="outline" onClick={handleLogout} className="border-primary/20 text-foreground hover:bg-primary hover:text-white">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 smooth-enter">
          <h1 className="text-3xl font-inter font-bold text-deep-forest mb-2">
            Your Connection Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your meaningful conversations and connections
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="card-warm smooth-enter">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-deep-forest">Active Conversations</h3>
                  <p className="text-2xl font-bold text-warm-sage">{activeConversations.length}</p>
                </div>
                <MessageCircle className="w-8 h-8 icon-sage" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-darkslate">Pending Invites</h3>
                  <p className="text-2xl font-bold text-secondary">{pendingConnections.length}</p>
                </div>
                <Mail className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-6">
              <Button 
                onClick={() => setShowInviteForm(true)}
                className="w-full h-full min-h-[80px] bg-accent hover:bg-accent/90"
              >
                <Plus className="w-6 h-6 mr-2" />
                Send New Invitation
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pending Invitations */}
        {pendingConnections.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Pending Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingConnections.map((connection) => (
                  <div key={connection.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{connection.inviterEmail}</p>
                      <p className="text-sm text-gray-600">
                        Wants to connect as: {connection.relationshipType}
                      </p>
                      {connection.personalMessage && (
                        <p className="text-sm text-gray-600 mt-1 italic">
                          "{connection.personalMessage}"
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAcceptConnection(connection.id)}
                        className="bg-success hover:bg-success/90"
                      >
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDeclineConnection(connection.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Active Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeConversations.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No active conversations</h3>
                <p className="text-gray-600 mb-4">
                  Send an invitation to start your first meaningful conversation
                </p>
                <Button onClick={() => setShowInviteForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeConversations.map((conversation) => {
                  const otherParticipant = conversation.participant1Email === user.email 
                    ? conversation.participant2Email 
                    : conversation.participant1Email;
                  const isMyTurn = conversation.currentTurn === user.email;
                  
                  return (
                    <div key={conversation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {otherParticipant.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{otherParticipant}</p>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">{conversation.relationshipType}</Badge>
                              <Badge variant={isMyTurn ? "default" : "outline"}>
                                {isMyTurn ? "Your turn" : "Their turn"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(conversation.createdAt!).toLocaleDateString()}
                        </span>
                        <Button 
                          onClick={() => setLocation(`/conversation/${conversation.id}`)}
                          className="ml-4"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invitation Form Modal */}
      {showInviteForm && (
        <InvitationForm 
          onClose={() => setShowInviteForm(false)}
          onSuccess={() => {
            setShowInviteForm(false);
            refetchConnections();
          }}
        />
      )}
    </div>
  );
}
