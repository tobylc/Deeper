import { Button } from "@/components/ui/button";
import { Lock, Lightbulb, Users } from "lucide-react";
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
              <a href="#features" className="text-gray-700 hover:text-primary transition-colors font-inter font-medium">Home</a>
              <a href="#features" className="text-gray-700 hover:text-primary transition-colors font-inter font-medium">Features</a>
              <a href="#pricing" className="text-gray-700 hover:text-primary transition-colors font-inter font-medium">Pricing</a>
              <a href="#about" className="text-gray-700 hover:text-primary transition-colors font-inter font-medium">About</a>
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

      {/* Simple Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <span className="text-xl font-space font-bold text-darkslate">Deeper</span>
              <span className="text-gray-400 text-sm">© 2025</span>
            </div>
            <div className="flex space-x-8 text-sm">
              <a href="#" className="text-gray-600 hover:text-primary transition-colors font-inter">Privacy</a>
              <a href="#" className="text-gray-600 hover:text-primary transition-colors font-inter">Terms</a>
              <a href="#" className="text-gray-600 hover:text-primary transition-colors font-inter">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}