import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Heart, Star, Zap, Crown, Gift } from "lucide-react";
import { Link } from "wouter";

export default function Pricing() {
  return (
    <div className="min-h-screen gradient-warm">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <span className="text-2xl font-inter font-bold text-soft-white">Deeper</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-foreground/80 hover:text-primary transition-colors font-inter font-medium">
                Home
              </Link>
              <Link href="/features" className="text-foreground/80 hover:text-primary transition-colors font-inter font-medium">
                Features
              </Link>
              <Link href="/pricing" className="text-primary font-inter font-medium">
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
      <section className="pt-24 pb-16 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Gift className="w-4 h-4 mr-2" />
              7-Day Free Trial
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-space font-bold text-gray-900 mb-6 leading-tight">
              Start meaningful conversations <span className="text-primary">today</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Begin with our free trial and discover how structured dialogue can transform your relationships. 
              No commitment required - upgrade only when you're ready.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Free Trial */}
            <Card className="border-2 border-primary/20 bg-primary/5 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-white px-4 py-1">Most Popular</Badge>
              </div>
              <CardHeader className="text-center pt-8">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-space">Free Trial</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-600 ml-2">for 7 days</span>
                </div>
                <p className="text-gray-600 mt-2">Perfect for getting started</p>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>3 conversation spaces</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>50+ curated questions</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Email invitations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Basic conversation timeline</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>All relationship types</span>
                  </li>
                </ul>
                <Link href="/auth">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-3">
                    Start Free Trial
                  </Button>
                </Link>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  No credit card required • Cancel anytime
                </p>
              </CardContent>
            </Card>

            {/* Personal Plan */}
            <Card className="border border-gray-200">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-space">Personal</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">$9</span>
                  <span className="text-gray-600 ml-2">per month</span>
                </div>
                <p className="text-gray-600 mt-2">For meaningful relationships</p>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                    <span>Unlimited conversation spaces</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                    <span>200+ premium questions</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                    <span>Advanced conversation timeline</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                    <span>Question personalization</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                    <span>Conversation insights</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Link href="/auth">
                  <Button variant="outline" className="w-full border-secondary text-secondary hover:bg-secondary hover:text-white rounded-full py-3">
                    Choose Personal
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="border border-gray-200">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-space">Premium</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">$19</span>
                  <span className="text-gray-600 ml-2">per month</span>
                </div>
                <p className="text-gray-600 mt-2">For relationship experts</p>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>Everything in Personal</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>500+ expert-level questions</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>AI-powered question suggestions</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>Relationship health metrics</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>Export conversation history</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Link href="/auth">
                  <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-white rounded-full py-3">
                    Choose Premium
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trial Incentive */}
      <section className="py-16 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-primary/20">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-space font-bold text-gray-900 mb-4">
              Limited Time: Upgrade within 7 days
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Start your free trial today and get <strong>50% off</strong> your first month when you upgrade within 7 days. 
              That's premium relationship tools for just $4.50!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-8">
                  Start Free Trial Now
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Offer expires 7 days after trial signup • No commitment • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-space font-bold text-gray-900 text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-space font-semibold text-gray-900 mb-2">
                What happens after my free trial ends?
              </h3>
              <p className="text-gray-600">
                Your account automatically becomes read-only. You can still view your conversation history, 
                but you'll need to upgrade to continue creating new conversations.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-space font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes, absolutely. Cancel anytime with no penalties. Your conversations remain accessible 
                until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-space font-semibold text-gray-900 mb-2">
                Do both people need to have a subscription?
              </h3>
              <p className="text-gray-600">
                No, only one person needs a subscription to create and maintain conversation spaces. 
                The other person can participate for free.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-space font-semibold text-gray-900 mb-2">
                Is my conversation data private?
              </h3>
              <p className="text-gray-600">
                Completely private. We never share, sell, or analyze your conversation content. 
                Your data is encrypted and belongs to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-br from-primary to-secondary">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-space font-bold text-white mb-6">
            Ready to build deeper connections?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of people having more meaningful conversations
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full px-8">
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