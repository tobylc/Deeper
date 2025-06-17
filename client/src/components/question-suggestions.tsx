import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Shuffle, Sparkles, ArrowRight, MessageCircle } from "lucide-react";
import DeeperLogo from "@/components/deeper-logo";
import { getQuestionsByCategory } from "@/lib/questions";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface QuestionSuggestionsProps {
  relationshipType: string;
  onQuestionSelect: (question: string) => void;
}

export default function QuestionSuggestions({ relationshipType, onQuestionSelect }: QuestionSuggestionsProps) {
  const [currentSet, setCurrentSet] = useState(0);
  const questions = getQuestionsByCategory(relationshipType);
  const questionsPerSet = 3;
  const currentQuestions = questions.slice(currentSet * questionsPerSet, (currentSet + 1) * questionsPerSet);
  
  const shuffleQuestions = () => {
    setCurrentSet((prev) => (prev + 1) % Math.ceil(questions.length / questionsPerSet));
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-ocean/5 to-amber/5 backdrop-blur-sm">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-ocean/10 to-amber/10 opacity-50"></div>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-ocean to-amber rounded-lg blur-sm opacity-60"></div>
                  <div className="relative bg-gradient-to-br from-ocean to-amber p-2 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">
                    Question Inspiration
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Thoughtfully curated for deeper connection
                  </p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={shuffleQuestions}
                className="hover:bg-ocean/10 transition-all duration-200"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                More
              </Button>
            </div>
            
            <Badge 
              variant="secondary" 
              className="w-fit bg-gradient-to-r from-amber/20 to-amber/10 text-amber-800 border-amber/30 shadow-sm"
            >
              <DeeperLogo size="sm" className="mr-1" />
              {relationshipType}
            </Badge>
          </CardHeader>
        </div>
      </Card>

      {/* Questions Grid */}
      <div className="space-y-3">
        {currentQuestions.map((question, index) => (
          <Card 
            key={index}
            className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-slate-200/60 hover:border-ocean/30 bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-sm"
            onClick={() => onQuestionSelect(question)}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean/10 to-amber/10 flex items-center justify-center group-hover:from-ocean/20 group-hover:to-amber/20 transition-all duration-300">
                    <MessageCircle className="w-4 h-4 text-ocean group-hover:text-ocean/80" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="text-sm leading-relaxed text-slate-700 group-hover:text-slate-900 transition-colors duration-300">
                    "{question}"
                  </div>
                  
                  <div className="flex items-center mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-xs text-ocean font-medium mr-2">
                      Click to use this question
                    </span>
                    <ArrowRight className="w-3 h-3 text-ocean" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Guidance */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-2 text-sm text-slate-500 bg-slate-50/80 px-4 py-2 rounded-full border border-slate-200/60">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Questions spark meaningful conversations</span>
        </div>
        
        <div className="mt-3 text-xs text-slate-400">
          {questions.length} total questions available • Set {currentSet + 1} of {Math.ceil(questions.length / questionsPerSet)}
        </div>
      </div>
    </div>
  );
}
