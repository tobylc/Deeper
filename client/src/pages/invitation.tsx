import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Shield, MessageCircle, Users, Sparkles, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function InvitationLanding() {
  const [, setLocation] = useLocation();
  const [inviterEmail, setInviterEmail] = useState<string>("");
  const [relationshipType, setRelationshipType] = useState<string>("");
  const [connectionId, setConnectionId] = useState<string>("");

  useEffect(() => {
    // Extract invitation details from URL parameters (both query and path formats)
    let inviter = '';
    let relationship = '';
    let id = '';

    // First try query parameters (standard format)
    const urlParams = new URLSearchParams(window.location.search);
    inviter = urlParams.get('inviter') || '';
    relationship = urlParams.get('relationship') || '';
    id = urlParams.get('id') || '';

    // If no query params, try path format (for email client compatibility)
    if (!inviter && window.location.pathname.includes('/invitation/')) {
      const pathPart = window.location.pathname.split('/invitation/')[1];
      if (pathPart) {
        // Parse path format: inviter=email&relationship=type&id=123
        const pathParams = new URLSearchParams(pathPart.replace(/^inviter=/, ''));
        inviter = decodeURIComponent(pathPart.split('&')[0].replace('inviter=', ''));
        relationship = pathParams.get('relationship') || '';
        id = pathParams.get('id') || '';
      }
    }
    
    setInviterEmail(inviter);
    setRelationshipType(relationship);
    setConnectionId(id);
  }, []);

  const getInviterName = () => {
    return inviterEmail ? inviterEmail.split('@')[0] : 'someone special';
  };

  const getRelationshipDescription = () => {
    switch (relationshipType.toLowerCase()) {
      case 'parent-child':
        return 'parent-child';
      case 'romantic partners':
        return 'romantic';
      case 'friends':
        return 'friendship';
      case 'siblings':
        return 'sibling';
      case 'colleagues':
        return 'professional';
      default:
        return 'meaningful';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-secondary/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <Heart className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl lg:text-6xl font-inter font-bold text-foreground mb-4 leading-tight">
              You've been personally
              <br />
              <span className="text-ocean-blue">invited to connect</span>
            </h1>
            <p className="text-xl text-muted-foreground font-inter max-w-2xl mx-auto leading-relaxed">
              {getInviterName()} has chosen you for something truly special - a private, intimate space designed exclusively for the two of you.
            </p>
          </div>

          {/* Invitation Details Card */}
          <Card className="card-elevated rounded-3xl backdrop-blur-xl border-border/50 shadow-2xl mb-12">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary mr-3" />
                <h2 className="text-2xl font-inter font-bold text-foreground">
                  This invitation is just for you
                </h2>
              </div>
              <p className="text-lg text-muted-foreground mb-6 font-inter leading-relaxed">
                {getInviterName()} has invited you to begin a {getRelationshipDescription()} journey together on Deeper. 
                This isn't a group chat or social network - it's a sacred space created exclusively for meaningful 
                one-on-one conversations between you and {getInviterName()}.
              </p>
              <div className="flex justify-center">
                <Link href="/auth">
                  <Button size="lg" className="btn-ocean px-12 py-4 text-lg font-medium">
                    Accept Your Personal Invitation
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* What Makes This Special */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="bg-card/80 backdrop-blur-sm p-8 text-left border-2 border-gray-600/30 rounded-3xl">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-4">
                  Completely Private & Secure
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your conversation space is encrypted and completely private. Only you and {getInviterName()} 
                  will ever have access. No algorithms, no ads, no interruptions.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm p-8 text-left border-2 border-gray-600/30 rounded-3xl">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-4">
                  Thoughtfully Guided Conversations
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our expertly curated questions help you explore deeper topics naturally, 
                  creating meaningful dialogue that strengthens your connection over time.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* What Happens Next */}
          <Card className="bg-card/60 backdrop-blur-sm border-2 border-gray-600/30 rounded-3xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-inter font-bold text-foreground mb-8 text-center">
                What happens when you accept?
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-inter font-semibold text-foreground mb-2">1. Quick Registration</h4>
                  <p className="text-sm text-muted-foreground">
                    Sign up with your preferred method - Google, Facebook, Apple, or email
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-inter font-semibold text-foreground mb-2">2. Private Space Created</h4>
                  <p className="text-sm text-muted-foreground">
                    Your exclusive conversation space with {getInviterName()} becomes available immediately
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-inter font-semibold text-foreground mb-2">3. Begin Your Journey</h4>
                  <p className="text-sm text-muted-foreground">
                    Start exchanging thoughtful questions and responses, deepening your connection
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-6 font-inter">
              {getInviterName()} is waiting to begin this special journey with you.
            </p>
            <Link href="/auth">
              <Button size="lg" className="btn-amber px-12 py-4 text-lg font-medium mr-4">
                Accept & Join Now
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4 font-inter">
              Free to start • Private & secure • Designed for meaningful connections
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}