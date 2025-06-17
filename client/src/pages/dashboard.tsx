import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, MessageCircle, Clock, Users, Mail } from "lucide-react";
import InvitationForm from "@/components/invitation-form";
import AccountLinking from "@/components/account-linking";
import ProfileImageUpload from "@/components/profile-image-upload";
import type { Connection, Conversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserDisplayName } from "@/hooks/useUserDisplayName";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for account linking success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const linkedProvider = urlParams.get('linked');
    
    if (linkedProvider === 'google') {
      toast({
        title: "Account Linked Successfully!",
        description: "Your Google account has been linked. You can now sign in using either method.",
        duration: 5000,
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-radial from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const { data: connections = [], refetch: refetchConnections } = useQuery<Connection[]>({
    queryKey: [`/api/connections/${user.email}`],
    enabled: !!user.email,
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: [`/api/conversations/${user.email}`],
    enabled: !!user.email,
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

  // Logout is handled by redirecting to /api/logout endpoint

  if (!user) return null;

  // Separate connections by type for better subscription clarity
  const pendingInvitations = connections.filter(c => c.status === 'pending' && c.inviteeEmail === user.email);
  const sentInvitations = connections.filter(c => c.status === 'pending' && c.inviterEmail === user.email);
  const acceptedConnections = connections.filter(c => c.status === 'accepted');
  const initiatedConnections = acceptedConnections.filter(c => c.inviterEmail === user.email);
  const receivedConnections = acceptedConnections.filter(c => c.inviteeEmail === user.email);
  const activeConversations = conversations.filter(c => c.status === 'active');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass-nav">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-inter font-bold text-white">Deeper</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-white/80">
                Welcome, {user.firstName || user.email?.split('@')[0] || 'there'}
              </span>
              <Button 
                className="btn-ocean px-6 py-2"
                onClick={async () => {
                  try {
                    await apiRequest("POST", "/api/auth/logout", {});
                    window.location.href = '/';
                  } catch (error) {
                    console.error("Logout failed:", error);
                    // Force redirect even if logout fails
                    window.location.href = '/';
                  }
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscription Status */}
        <Card className="mb-8 card-elevated border-amber/30">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Heart className="w-5 h-5 mr-2 text-amber" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {(user as any)?.subscriptionTier || 'Free'}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Connections Initiated</p>
                <p className="text-2xl font-bold text-amber">
                  {sentInvitations.length + initiatedConnections.length} / {(user as any)?.maxConnections || 1}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Connections</p>
                <p className="text-2xl font-bold text-primary">
                  {acceptedConnections.length}
                </p>
              </div>
            </div>
            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Paid members can invite others without charge. Invitees inherit your subscription benefits.
              </p>
              {((user as any)?.subscriptionTier === 'free' || !(user as any)?.subscriptionTier) && (
                <Button 
                  onClick={() => setLocation('/pricing')}
                  className="btn-amber px-6 py-2"
                >
                  Upgrade Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Welcome Section */}
        <div className="mb-8 smooth-enter">
          <h1 className="text-3xl font-inter font-bold text-foreground mb-2">
            Your Connection Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your meaningful conversations and connections
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="card-elevated smooth-enter">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Active Conversations</h3>
                  <p className="text-2xl font-bold text-primary">{activeConversations.length}</p>
                </div>
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Pending Invites</h3>
                  <p className="text-2xl font-bold text-secondary-foreground">{pendingInvitations.length}</p>
                </div>
                <Mail className="w-8 h-8 text-secondary-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-6">
              <Button 
                onClick={() => setShowInviteForm(true)}
                className="w-full h-full min-h-[80px] btn-ocean"
              >
                <Plus className="w-6 h-6 mr-2" />
                Send New Invitation
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Card className="mb-8 card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Mail className="w-5 h-5 mr-2 text-primary" />
                Pending Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingInvitations.map((connection) => (
                  <div key={connection.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">
                        <UserDisplayName email={connection.inviterEmail} />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Wants to connect as: {connection.relationshipType}
                      </p>
                      {connection.personalMessage && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
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

        {/* Sent Invitations */}
        {sentInvitations.length > 0 && (
          <Card className="mb-8 card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                Sent Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sentInvitations.map((connection) => (
                  <div key={connection.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{connection.inviteeEmail}</p>
                      <p className="text-sm text-muted-foreground">
                        Relationship: {connection.relationshipType}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">Pending</Badge>
                        <Badge variant="secondary">{connection.inviterSubscriptionTier || 'free'} tier</Badge>
                      </div>
                      {connection.personalMessage && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          "{connection.personalMessage}"
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Sent {new Date(connection.createdAt!).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        They'll inherit your {connection.inviterSubscriptionTier || 'free'} benefits
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Conversations */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <MessageCircle className="w-5 h-5 mr-2 text-primary" />
              Active Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeConversations.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No active conversations</h3>
                <p className="text-muted-foreground mb-4">
                  Send an invitation to start your first meaningful conversation
                </p>
                <Button onClick={() => setShowInviteForm(true)} className="btn-ocean">
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
                    <div key={conversation.id} className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {otherParticipant.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              <UserDisplayName email={otherParticipant} />
                            </p>
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
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(conversation.createdAt!).toLocaleDateString()}
                        </span>
                        <Button 
                          onClick={() => setLocation(`/conversation/${conversation.id}`)}
                          className="ml-4 btn-ocean"
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

        {/* Profile Management Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Profile Image Upload */}
          <ProfileImageUpload 
            currentImageUrl={user?.profileImageUrl}
            onImageUpdate={() => {
              // Refresh user data
              queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
            }}
          />
          
          {/* Account Security */}
          <AccountLinking />
        </div>
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
