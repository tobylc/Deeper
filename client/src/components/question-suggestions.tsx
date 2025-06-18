import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Shuffle, Sparkles, ArrowRight, MessageCircle, Wand2, Clock, Plus } from "lucide-react";
import DeeperLogo from "@/components/deeper-logo";
import QuotesIcon from "@/components/quotes-icon";
import { UserDisplayName } from "@/hooks/useUserDisplayName";
import { getQuestionsByCategory } from "@/lib/questions";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface QuestionSuggestionsProps {
  relationshipType: string;
  onQuestionSelect: (question: string) => void;
  isMyTurn: boolean;
  otherParticipant: string;
  onNewQuestion: () => void;
}

export default function QuestionSuggestions({ relationshipType, onQuestionSelect, isMyTurn, otherParticipant, onNewQuestion }: QuestionSuggestionsProps) {
  const [currentSet, setCurrentSet] = useState(0);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAI, setShowAI] = useState(false);
  
  const questions = getQuestionsByCategory(relationshipType);
  const questionsPerSet = 3;
  const currentQuestions = questions.slice(currentSet * questionsPerSet, (currentSet + 1) * questionsPerSet);
  
  const shuffleQuestions = () => {
    setCurrentSet((prev) => (prev + 1) % Math.ceil(questions.length / questionsPerSet));
  };

  const generateAIQuestions = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationshipType, count: 3 })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiQuestions(data.questions || []);
        setShowAI(true);
      }
    } catch (error) {
      console.error('Failed to generate AI questions:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Show waiting state when it's not the user's turn */}
      {!isMyTurn ? (
        <Card className="card-elevated border-amber/30 bg-amber/5 h-fit">
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5 text-amber" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground font-inter mb-2 text-sm">
                  Waiting for Response
                </h3>
                <p className="text-xs text-slate-700 font-inter leading-relaxed">
                  <UserDisplayName email={otherParticipant} /> is preparing their response. 
                  You'll receive an email notification when it's your turn.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* New Question Button */}
          <Button 
            onClick={onNewQuestion}
            className="w-full bg-gradient-to-r from-ocean to-teal text-white hover:from-ocean/90 hover:to-teal/90 transition-all duration-200 shadow-lg hover:shadow-xl mb-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Question
          </Button>

          {/* Header Card */}
          <Card className="bg-white border border-slate-200/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-gradient-to-br from-ocean to-amber p-2 rounded-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-800">
                      Question Inspiration
                    </CardTitle>
                    <p className="text-xs text-slate-600">
                      Thoughtfully curated for deeper connection
                    </p>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={shuffleQuestions}
                  className="h-8 px-2 hover:bg-ocean/10 text-xs"
                >
                  <Shuffle className="w-3 h-3 mr-1" />
                  More
                </Button>
              </div>
              
              <Badge 
                variant="secondary" 
                className="w-fit bg-amber/10 text-amber-800 border-amber/30 text-xs"
              >
                <QuotesIcon size="xs" className="mr-1" />
                {relationshipType}
              </Badge>
            </CardHeader>
          </Card>

          {/* Toggle Buttons */}
          <div className="flex space-x-2">
            <Button
              variant={!showAI ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAI(false)}
              className={cn(
                "flex-1 text-xs h-8",
                !showAI 
                  ? "bg-ocean text-white hover:bg-ocean/90" 
                  : "border-ocean/30 text-ocean hover:bg-ocean/10"
              )}
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Curated
            </Button>
            <Button
              variant={showAI ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!showAI && aiQuestions.length === 0) {
                  generateAIQuestions();
                } else {
                  setShowAI(true);
                }
              }}
              disabled={isGeneratingAI}
              className={cn(
                "flex-1 text-xs h-8",
                showAI 
                  ? "bg-amber text-white hover:bg-amber/90" 
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              )}
            >
              {isGeneratingAI ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <Wand2 className="w-3 h-3 mr-1" />
              )}
              AI Generated
            </Button>
          </div>

          {/* Questions List */}
          <div className="space-y-2">
            {(showAI ? aiQuestions : currentQuestions).map((question, index) => (
              <div
                key={index}
                onClick={() => onQuestionSelect(question)}
                className={cn(
                  "group cursor-pointer transition-all duration-200 p-3 rounded-xl border",
                  "hover:shadow-md hover:scale-[1.01]",
                  showAI 
                    ? "bg-gradient-to-br from-amber/5 to-amber/10 border-amber/20 hover:border-amber/40 hover:bg-amber/15"
                    : "bg-gradient-to-br from-ocean/5 to-ocean/10 border-ocean/20 hover:border-ocean/40 hover:bg-ocean/15"
                )}
              >
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <MessageCircle className={cn(
                      "w-3 h-3",
                      showAI ? "text-amber-600" : "text-ocean"
                    )} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm leading-relaxed text-slate-700 group-hover:text-slate-900">
                      "{question}"
                    </div>
                    
                    <div className="flex items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className={cn(
                        "text-xs font-medium mr-1",
                        showAI ? "text-amber-600" : "text-ocean"
                      )}>
                        Click to use
                      </span>
                      <ArrowRight className={cn(
                        "w-2 h-2",
                        showAI ? "text-amber-600" : "text-ocean"
                      )} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center pt-2">
            <div className="text-xs text-slate-600">
              {showAI ? (
                aiQuestions.length > 0 ? `${aiQuestions.length} AI-generated questions` : 'Generate personalized questions'
              ) : (
                `${questions.length} curated questions • Set ${currentSet + 1} of ${Math.ceil(questions.length / questionsPerSet)}`
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
