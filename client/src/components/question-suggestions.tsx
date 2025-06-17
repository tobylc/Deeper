import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Shuffle, Sparkles, ArrowRight, Heart, MessageCircle } from "lucide-react";
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Lightbulb className="w-5 h-5 mr-2" />
            Question Ideas
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={shuffleQuestions}>
            <Shuffle className="w-4 h-4" />
          </Button>
        </div>
        <Badge variant="secondary">{relationshipType}</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {currentQuestions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full h-auto p-3 text-left justify-start whitespace-normal"
              onClick={() => onQuestionSelect(question)}
            >
              <div className="text-sm leading-relaxed">
                "{question}"
              </div>
            </Button>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Click any question to use it, or shuffle for more ideas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
