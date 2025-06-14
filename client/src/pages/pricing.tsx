import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Heart, Star, Zap, Crown, Gift } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Pricing() {
  const [selectedCard, setSelectedCard] = useState<string | null>('free');
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
              <Link href="/features" className="text-white/80 hover:text-white transition-colors font-inter font-medium">
                Features
              </Link>
              <Link href="/pricing" className="text-white font-inter font-medium">
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
      <section className="pt-24 pb-16 bg-background">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Gift className="w-4 h-4 mr-2" />
              7-Day Free Trial
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-inter font-bold text-foreground mb-6 leading-tight">
              Start meaningful conversations <span className="text-primary">today</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Begin with our free trial and discover how structured dialogue can transform your relationships. 
              No commitment required - upgrade only when you're ready.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-8 bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 max-h-[480px]">
            
            {/* Free Trial */}
            <Card 
              className={`pricing-card relative h-full ${selectedCard === 'free' ? 'selected' : ''}`}
              onClick={() => setSelectedCard('free')}
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-white px-3 py-1 text-xs">Most Popular</Badge>
              </div>
              <CardHeader className="text-center pt-5 pb-3">
                <div className="w-12 h-12 card-icon rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Gift className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-inter">Free Trial</CardTitle>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground ml-1 text-xs">for 7 days</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">Perfect for getting started</p>
              </CardHeader>
              <CardContent className="pt-1 pb-4">
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-foreground text-xs">3 conversation spaces</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-foreground text-xs">50+ curated questions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-foreground text-xs">Email invitations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-foreground text-xs">Basic conversation timeline</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-foreground text-xs">All relationship types</span>
                  </li>
                </ul>
                <Link href="/auth">
                  <Button className="w-full card-button py-2 text-xs">
                    Start Free Trial
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  No credit card required • Cancel anytime
                </p>
              </CardContent>
            </Card>

            {/* Personal Plan */}
            <Card 
              className={`pricing-card h-full ${selectedCard === 'personal' ? 'selected' : ''}`}
              onClick={() => setSelectedCard('personal')}
            >
              <CardHeader className="text-center pt-5 pb-3">
                <div className="w-12 h-12 card-icon rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Heart className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-inter">Personal</CardTitle>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-foreground">$9</span>
                  <span className="text-muted-foreground ml-1 text-xs">per month</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">For meaningful relationships</p>
              </CardHeader>
              <CardContent className="pt-1 pb-4">
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-secondary-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">Unlimited conversation spaces</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-secondary-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">200+ premium questions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-secondary-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">Advanced conversation timeline</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-secondary-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">Question personalization</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-secondary-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">Conversation insights</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-secondary-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">Email support</span>
                  </li>
                </ul>
                <Link href="/auth">
                  <Button className="w-full card-button py-2 text-xs">
                    Choose Personal
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card 
              className={`pricing-card h-full ${selectedCard === 'premium' ? 'selected' : ''}`}
              onClick={() => setSelectedCard('premium')}
            >
              <CardHeader className="text-center pt-5 pb-3">
                <div className="w-12 h-12 card-icon rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Crown className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-inter">Premium</CardTitle>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-foreground">$19</span>
                  <span className="text-muted-foreground ml-1 text-xs">per month</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">For relationship experts</p>
              </CardHeader>
              <CardContent className="pt-1 pb-4">
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-accent-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">Everything in Personal</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-accent-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">500+ expert-level questions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-accent-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">AI-powered question suggestions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-accent-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">Relationship health metrics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-accent-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">Export conversation history</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-accent-foreground flex-shrink-0" />
                    <span className="text-foreground text-xs">Priority support</span>
                  </li>
                </ul>
                <Link href="/auth">
                  <Button className="w-full card-button py-2 text-xs">
                    Choose Premium
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trial Incentive */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="bg-card rounded-lg p-8 shadow-lg border border-primary/20">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-inter font-bold text-foreground mb-4">
              Limited Time: Upgrade within 7 days
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Start your free trial today and get <strong>50% off</strong> your first month when you upgrade within 7 days. 
              That's premium relationship tools for just $4.50!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="btn-ocean px-8">
                  Start Free Trial Now
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Offer expires 7 days after trial signup • No commitment • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-card">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-inter font-bold text-foreground text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-inter font-semibold text-foreground mb-2">
                What happens after my free trial ends?
              </h3>
              <p className="text-muted-foreground">
                Your account automatically becomes read-only. You can still view your conversation history, 
                but you'll need to upgrade to continue creating new conversations.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-inter font-semibold text-foreground mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-muted-foreground">
                Yes, absolutely. Cancel anytime with no penalties. Your conversations remain accessible 
                until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-inter font-semibold text-foreground mb-2">
                Do both people need to have a subscription?
              </h3>
              <p className="text-muted-foreground">
                No, only one person needs a subscription to create and maintain conversation spaces. 
                The other person can participate for free.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-inter font-semibold text-foreground mb-2">
                Is my conversation data private?
              </h3>
              <p className="text-muted-foreground">
                Completely private. We never share, sell, or analyze your conversation content. 
                Your data is encrypted and belongs to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16" style={{ background: 'var(--nav-gray)' }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-inter font-bold text-white mb-6">
            Ready to build deeper connections?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of people having more meaningful conversations
          </p>
          <Link href="/auth">
            <Button size="lg" className="btn-ocean px-8">
              Start Your Free Trial
            </Button>
          </Link>
          <p className="text-white/80 mt-4">
            No credit card required • 7 days free • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}