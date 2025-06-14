import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Lock, MessageCircle, Lightbulb, History, Mail, Users, Star, Globe, Shield, CheckCircle, Clock, Target, Zap, Eye } from "lucide-react";
import { Link } from "wouter";

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <span className="text-2xl font-inter font-bold text-white">Deeper</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-white/80 hover:text-white transition-colors font-inter font-medium">
                Home
              </Link>
              <Link href="/features" className="text-white font-inter font-medium">
                Features
              </Link>
              <Link href="/pricing" className="text-white/80 hover:text-white transition-colors font-inter font-medium">
                Pricing
              </Link>
              <Link href="/auth">
                <Button className="btn-ocean px-6 py-2">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-2 bg-background">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <div className="mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">What Makes Us Different</Badge>
            <h1 className="text-4xl lg:text-6xl font-inter font-bold text-foreground mb-6 leading-tight">
              Built for <span className="text-primary">meaningful connection</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Unlike social media or group chats, Deeper creates intimate spaces for two people to build deeper understanding through structured, thoughtful dialogue.
            </p>
          </div>
        </div>
      </section>

      {/* Core Differentiators */}
      <section className="py-16 bg-card">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Exclusive Two-Person Focus */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-inter font-bold text-foreground mb-4">Exclusively Two People</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  No groups, no audiences, no distractions. Just you and one other person in a private space designed for intimate conversation.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>Private invitation-only spaces</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>No public profiles or feeds</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>Complete privacy and intimacy</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Turn-Based Structure */}
            <Card className="border-2 border-secondary/20 bg-secondary/5">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-secondary-foreground" />
                </div>
                <h3 className="text-2xl font-inter font-bold text-foreground mb-4">Turn-Based Dialogue</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  One person asks, the other responds. This structure ensures balanced conversation and gives time for thoughtful responses.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-secondary-foreground" />
                    <span>Prevents conversation dominance</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-secondary-foreground" />
                    <span>Encourages thoughtful responses</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-secondary-foreground" />
                    <span>Creates anticipation and engagement</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Curated Questions */}
            <Card className="border-2 border-accent/20 bg-accent/5">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-accent rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Lightbulb className="w-8 h-8 text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-inter font-bold text-foreground mb-4">Expertly Curated Questions</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Thoughtfully crafted questions designed by relationship experts for different relationship types and conversation depths.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-accent-foreground" />
                    <span>Relationship-specific question pools</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-accent-foreground" />
                    <span>Progressive depth levels</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-accent-foreground" />
                    <span>Scientifically-backed prompts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Detailed Features */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-inter font-bold text-foreground mb-4">
              Complete feature overview
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Email-Based Connection */}
            <div className="flex items-start space-x-4 p-6 bg-card rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-2">Mutual Consent System</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Both people must agree before a conversation space is created. No unwanted connections or spam.
                </p>
              </div>
            </div>

            {/* Conversation Timeline */}
            <div className="flex items-start space-x-4 p-6 bg-card rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <History className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-2">Conversation Timeline</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your entire dialogue history preserved in a beautiful timeline that you can revisit and reflect upon.
                </p>
              </div>
            </div>

            {/* Relationship Categories */}
            <div className="flex items-start space-x-4 p-6 bg-card rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Heart className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-2">Relationship-Specific Design</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Whether parent-child, romantic partners, friends, or siblings - tools designed for different relationship dynamics.
                </p>
              </div>
            </div>

            {/* Privacy Focus */}
            <div className="flex items-start space-x-4 p-6 bg-card rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-2">Privacy by Design</h3>
                <p className="text-muted-foreground leading-relaxed">
                  No public profiles, no social feeds, no advertising. Your conversations remain completely private.
                </p>
              </div>
            </div>

            {/* Thoughtful Pacing */}
            <div className="flex items-start space-x-4 p-6 bg-card rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-2">Intentional Pacing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  No pressure for instant responses. Take time to reflect and give thoughtful answers that matter.
                </p>
              </div>
            </div>

            {/* Question Intelligence */}
            <div className="flex items-start space-x-4 p-6 bg-card rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-2">Smart Question Suggestions</h3>
                <p className="text-muted-foreground leading-relaxed">
                  AI-powered recommendations based on your relationship type, conversation history, and comfort level.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="py-16 bg-card">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-inter font-bold text-foreground mb-8">
            Why meaningful conversation matters
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">73%</div>
              <p className="text-muted-foreground">of people feel lonely despite being connected online</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">89%</div>
              <p className="text-muted-foreground">crave deeper, more meaningful relationships</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">2x</div>
              <p className="text-muted-foreground">stronger bonds form through structured dialogue</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            In a world of surface-level interactions and endless distractions, Deeper creates space for the conversations that actually matter. 
            Research shows that structured, intentional dialogue builds stronger emotional bonds than casual chat.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16" style={{ background: 'var(--nav-gray)' }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-inter font-bold text-white mb-6">
            Ready to experience deeper connection?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Start your first meaningful conversation today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="btn-ocean px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white bg-transparent text-white hover:bg-white hover:text-gray-900 px-8">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}