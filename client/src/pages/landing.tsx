import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Lightbulb, Users } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-inter font-bold text-white">Deeper</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-white/80 hover:text-white transition-colors font-inter font-medium">
                Home
              </Link>
              <Link href="/features" className="text-white/80 hover:text-white transition-colors font-inter font-medium">
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
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <div className="mb-16">
            <h1 className="text-5xl lg:text-7xl font-inter font-bold text-foreground mb-8 leading-tight">
              Cultivate meaningful
              <br />
              <span className="text-ocean-blue">connections.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12 font-inter max-w-2xl mx-auto leading-relaxed">
              Create exclusive, private spaces for thoughtful dialogue that deepens relationships over time.
            </p>
            <Link href="/auth">
              <Button size="lg" className="btn-ocean px-8 py-3 text-lg font-medium">
                Start free trial
              </Button>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            {/* Structured Conversations */}
            <Card className="card-elevated p-8 text-left smooth-enter">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                  <Lock className="w-6 h-6 icon-ocean" />
                </div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-4">
                  Structured conversations
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Turn-based dialogue system that ensures balanced, thoughtful exchanges between two people.
                </p>
              </CardContent>
            </Card>

            {/* Curated Question Pools */}
            <Card className="card-elevated p-8 text-left smooth-enter">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-6">
                  <Lightbulb className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-4">
                  Curated question pools
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Thoughtfully crafted questions designed for different relationship types and conversation depths.
                </p>
              </CardContent>
            </Card>

            {/* Private Communication Spaces */}
            <Card className="card-elevated p-8 text-left smooth-enter">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-inter font-semibold text-foreground mb-4">
                  Private communication spaces
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Exclusive two-person spaces that create intimate environments for meaningful connection.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-card/50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-inter font-bold text-foreground mb-16">
            Simple steps to deeper connection
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="smooth-enter">
              <div className="w-16 h-16 rounded-full gradient-ocean flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-deep-charcoal">1</span>
              </div>
              <h3 className="text-xl font-inter font-semibold text-foreground mb-4">Invite someone special</h3>
              <p className="text-muted-foreground leading-relaxed">
                Send a private invitation to someone you want to connect with more deeply
              </p>
            </div>
            
            <div className="smooth-enter">
              <div className="w-16 h-16 rounded-full gradient-amber flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-deep-charcoal">2</span>
              </div>
              <h3 className="text-xl font-inter font-semibold text-foreground mb-4">Choose your journey</h3>
              <p className="text-muted-foreground leading-relaxed">
                Select relationship type and let our curated questions guide meaningful dialogue
              </p>
            </div>
            
            <div className="smooth-enter">
              <div className="w-16 h-16 rounded-full bg-accent/80 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-deep-charcoal">3</span>
              </div>
              <h3 className="text-xl font-inter font-semibold text-foreground mb-4">Build deeper bonds</h3>
              <p className="text-muted-foreground leading-relaxed">
                Take turns asking and answering, creating a beautiful timeline of your connection
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-ocean">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-inter font-bold text-deep-charcoal mb-6">
            Ready to cultivate meaningful connections?
          </h2>
          <p className="text-xl text-deep-charcoal/80 mb-8 max-w-2xl mx-auto">
            Join thousands discovering the power of structured, intentional dialogue
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 btn-ocean px-8 py-3">
                Start your free trial
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary btn-ocean px-8 py-3">
                Learn more
              </Button>
            </Link>
          </div>
          <p className="text-deep-charcoal/70 mt-6 text-sm">
            No credit card required • 7 days free • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}