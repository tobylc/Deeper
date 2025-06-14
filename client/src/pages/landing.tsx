import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Lock, MessageCircle, Lightbulb, History, Mail, Users, Star, Globe, Shield, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-space font-bold text-darkslate">Deeper</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-700 hover:text-primary transition-colors font-inter font-medium">
                Home
              </Link>
              <Link href="/features" className="text-gray-700 hover:text-primary transition-colors font-inter font-medium">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-700 hover:text-primary transition-colors font-inter font-medium">
                Pricing
              </Link>
              <Link href="/auth">
                <Button className="bg-primary text-white hover:bg-primary/90 rounded-full px-6">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200"></div>
        
        {/* Content */}
        <div className="relative z-10 text-center px-6 lg:px-8 max-w-4xl mx-auto">
          <h1 className="text-5xl lg:text-7xl font-space font-bold text-gray-900 mb-6 leading-tight">
            Cultivate meaningful
            <br />
            <span className="text-primary">connections.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 font-inter max-w-2xl mx-auto leading-relaxed">
            Create exclusive, private spaces for thoughtful dialogue that deepens relationships over time.
          </p>
          
          <div className="mb-16">
            <Link href="/auth">
              <Button size="lg" className="bg-primary text-white hover:bg-primary/90 rounded-full px-8 py-4 text-lg font-inter font-medium">
                Start free trial
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-6xl px-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/20">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-space font-semibold text-gray-900 mb-3">Structured conversations.</h3>
              <p className="text-gray-600 font-inter text-sm leading-relaxed">
                Turn-based dialogue system that ensures balanced, thoughtful exchanges between two people.
              </p>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/20">
              <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-space font-semibold text-gray-900 mb-3">Curated question pools</h3>
              <p className="text-gray-600 font-inter text-sm leading-relaxed">
                Thoughtfully crafted questions designed for different relationship types and conversation depths.
              </p>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/20">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-space font-semibold text-gray-900 mb-3">Private communication spaces.</h3>
              <p className="text-gray-600 font-inter text-sm leading-relaxed">
                Exclusive two-person spaces that create intimate environments for meaningful connection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-crimson font-bold text-darkslate">
              Designed for Meaningful Connection
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Every feature is crafted to encourage deeper, more thoughtful communication between two people.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6">
                  <Lock className="text-white w-6 h-6" />
                </div>
                <h3 className="text-xl font-crimson font-semibold mb-4">Exclusive Two-Person Spaces</h3>
                <p className="text-gray-600 leading-relaxed">
                  Create private, intimate conversation spaces that only you and one other person can access. No groups, no distractions.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/5 border-secondary/10">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-6">
                  <MessageCircle className="text-white w-6 h-6" />
                </div>
                <h3 className="text-xl font-crimson font-semibold mb-4">Turn-Based Conversations</h3>
                <p className="text-gray-600 leading-relaxed">
                  One person asks, the other responds. This structure ensures balanced dialogue and gives time for thoughtful responses.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-accent/5 border-accent/10">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-6">
                  <Lightbulb className="text-white w-6 h-6" />
                </div>
                <h3 className="text-xl font-crimson font-semibold mb-4">Curated Question Pool</h3>
                <p className="text-gray-600 leading-relaxed">
                  Choose from thoughtfully crafted questions designed for different relationship types and conversation depths.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-success/5 border-success/10">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-success rounded-xl flex items-center justify-center mb-6">
                  <History className="text-white w-6 h-6" />
                </div>
                <h3 className="text-xl font-crimson font-semibold mb-4">Conversation Timeline</h3>
                <p className="text-gray-600 leading-relaxed">
                  Preserve your entire dialogue history in a beautiful timeline that you can revisit and reflect upon.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6">
                  <Mail className="text-white w-6 h-6" />
                </div>
                <h3 className="text-xl font-crimson font-semibold mb-4">Email-Based Invitations</h3>
                <p className="text-gray-600 leading-relaxed">
                  Connect through mutual email agreement. Both people must consent before the conversation space is created.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/5 border-secondary/10">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-6">
                  <Heart className="text-white w-6 h-6" />
                </div>
                <h3 className="text-xl font-crimson font-semibold mb-4">Relationship-Focused</h3>
                <p className="text-gray-600 leading-relaxed">
                  Whether it's parent-child, siblings, friends, or couples - tools designed for different relationship dynamics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Question Pool Demo */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-crimson font-bold text-darkslate">
              Questions That Matter
            </h2>
            <p className="text-lg text-gray-600">
              Curated questions designed to spark meaningful dialogue for every relationship type
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Question categories */}
            {[
              { 
                title: "Parent-Child", 
                icon: Heart, 
                color: "primary",
                questions: [
                  "What's one family tradition you hope to continue?",
                  "When did you feel most proud of me recently?",
                  "What was your biggest worry as a teenager?"
                ]
              },
              { 
                title: "Romantic Partners", 
                icon: Heart, 
                color: "secondary",
                questions: [
                  "What's one dream we haven't talked about yet?",
                  "When do you feel most connected to me?",
                  "What's something small I do that makes you smile?"
                ]
              },
              { 
                title: "Friends", 
                icon: Users, 
                color: "accent",
                questions: [
                  "What's one thing you've learned about yourself this year?",
                  "If you could time travel, what period would you visit?",
                  "What's the best advice someone has given you lately?"
                ]
              },
              { 
                title: "Siblings", 
                icon: Users, 
                color: "success",
                questions: [
                  "What's your favorite childhood memory of us together?",
                  "How has our relationship changed as we've grown up?",
                  "What do you think I'm really good at?"
                ]
              },
              { 
                title: "Grandparents", 
                icon: Star, 
                color: "primary",
                questions: [
                  "What was the world like when you were my age?",
                  "What's the most important lesson life has taught you?",
                  "What's something you want me to always remember?"
                ]
              },
              { 
                title: "Long-distance", 
                icon: Globe, 
                color: "accent",
                questions: [
                  "What's something beautiful you saw today?",
                  "If I were there right now, what would we do?",
                  "What's one thing that reminded you of me this week?"
                ]
              }
            ].map((category, index) => (
              <Card key={index} className={`bg-${category.color}/5 border-${category.color}/20`}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-8 h-8 bg-${category.color} rounded-lg flex items-center justify-center`}>
                      <category.icon className="text-white w-4 h-4" />
                    </div>
                    <h3 className="font-crimson font-semibold text-lg text-darkslate">{category.title}</h3>
                  </div>
                  <div className="space-y-3">
                    {category.questions.map((question, qIndex) => (
                      <div key={qIndex} className="bg-white p-3 rounded-lg shadow-sm text-sm text-gray-700">
                        "{question}"
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-crimson font-bold text-white">
                Ready to Deepen Your Connections?
              </h2>
              <p className="text-lg text-white/90 max-w-2xl mx-auto">
                Start your first meaningful conversation today. Choose someone special and begin building a deeper relationship through thoughtful dialogue.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Your First Invitation
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                Learn More
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-8 pt-8 text-white/80 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>100% Private</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Secure</span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4" />
                <span>Meaningful</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-darkslate text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                  <Heart className="text-white w-4 h-4" />
                </div>
                <span className="text-xl font-crimson font-bold">Deeper</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Building meaningful connections through thoughtful conversation, one question at a time.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Features</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">How it Works</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Pricing</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Question Library</a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Help Center</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Privacy Policy</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Terms of Service</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Contact Us</a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Blog</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Success Stories</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Newsletter</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors block">Updates</a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2024 Deeper. All rights reserved.</p>
            <p className="text-gray-400 text-sm mt-2 sm:mt-0">Made with ❤️ for meaningful connections</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
