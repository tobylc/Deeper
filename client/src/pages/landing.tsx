import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Lock, MessageCircle, Lightbulb, History, Mail, Users, Star, Globe, Shield, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <Heart className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-crimson font-bold text-darkslate">Deeper</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-600 hover:text-primary transition-colors font-source">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors font-source">How it Works</a>
              <Link href="/auth">
                <Button className="bg-primary text-white hover:bg-primary/90">
                  Start Connecting
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 to-secondary/5 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-crimson font-bold text-darkslate leading-tight">
                  Build Deeper Connections Through
                  <span className="text-primary"> Meaningful Conversations</span>
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Create exclusive, private spaces for thoughtful dialogue. Connect with someone special through structured conversations that deepen relationships over time.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth">
                  <Button size="lg" className="bg-primary text-white hover:bg-primary/90 shadow-lg">
                    <Mail className="w-4 h-4 mr-2" />
                    Send First Invitation
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                  Learn More
                </Button>
              </div>

              <div className="flex items-center space-x-8 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">2,847</div>
                  <div className="text-sm text-gray-500">Active Connections</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">15,239</div>
                  <div className="text-sm text-gray-500">Conversations Started</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Two people having a meaningful conversation" 
                className="rounded-2xl shadow-2xl w-full h-auto" 
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Active conversation</span>
                </div>
              </div>
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
