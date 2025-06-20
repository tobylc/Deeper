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
import { getRoleSpecificQuestions, getGeneralRelationshipQuestions } from "@shared/role-specific-questions";
import { getRoleDisplayInfo } from "@shared/role-display-utils";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface QuestionSuggestionsProps {
  relationshipType: string;
  userRole: string;
  otherUserRole: string;
  onQuestionSelect: (question: string) => void;
  isMyTurn: boolean;
  otherParticipant: string;
  connectionId: number;
  onNewThreadCreated: (conversationId: number) => void;
}

export default function QuestionSuggestions({ relationshipType, userRole, otherUserRole, onQuestionSelect, isMyTurn, otherParticipant, connectionId, onNewThreadCreated }: QuestionSuggestionsProps) {
  const [currentSet, setCurrentSet] = useState(0);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showNewQuestionDialog, setShowNewQuestionDialog] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [shownQuestions, setShownQuestions] = useState<Set<string>>(new Set());
  const [availableQuestions, setAvailableQuestions] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customAiQuestions, setCustomAiQuestions] = useState<string[]>([]);
  const [isGeneratingCustomAI, setIsGeneratingCustomAI] = useState(false);
  
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Thread creation mutation
  const createThreadMutation = useMutation({
    mutationFn: async (question: string) => {
      // First create the conversation thread
      const conversationResponse = await fetch(`/api/connections/${connectionId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: question,
          participant1Email: user?.email || '',
          participant2Email: otherParticipant,
          relationshipType: relationshipType,
          isMainThread: false
        })
      });
      
      if (!conversationResponse.ok) {
        throw new Error('Failed to create conversation thread');
      }
      
      const conversation = await conversationResponse.json();
      
      // Then send the first message (the question) automatically
      const messageResponse = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: question,
          senderEmail: user?.email || '',
          type: 'question'
        })
      });
      
      if (!messageResponse.ok) {
        throw new Error('Failed to send initial message');
      }
      
      return conversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${connectionId}/conversations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.id}/messages`] });
      setShowNewQuestionDialog(false);
      setNewQuestionText("");
      onNewThreadCreated(data.id);
    }
  });

  const handleCreateNewThread = () => {
    if (!newQuestionText.trim() || !isMyTurn) return;
    createThreadMutation.mutate(newQuestionText.trim());
  };
  
  // Initialize available questions and track shown ones
  useEffect(() => {
    const roleSpecificQuestions = getRoleSpecificQuestions(relationshipType, userRole);
    const fallbackQuestions = getGeneralRelationshipQuestions(relationshipType);
    const allQuestions = roleSpecificQuestions.length > 0 ? roleSpecificQuestions : fallbackQuestions;
    
    // Shuffle questions for randomness
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    setAvailableQuestions(shuffled);
  }, [relationshipType, userRole]);

  // Get next set of questions that haven't been shown
  const getNextQuestions = (count: number = 5): string[] => {
    const unshownQuestions = availableQuestions.filter(q => !shownQuestions.has(q));
    
    // If we're running low on unshown questions, generate more via AI
    if (unshownQuestions.length < count * 2) {
      generateMoreCuratedQuestions();
    }
    
    const nextQuestions = unshownQuestions.slice(0, count);
    setShownQuestions(prev => new Set([...Array.from(prev), ...nextQuestions]));
    return nextQuestions;
  };

  const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
  
  // Load initial questions
  useEffect(() => {
    if (availableQuestions.length > 0 && currentQuestions.length === 0) {
      setCurrentQuestions(getNextQuestions(5));
    }
  }, [availableQuestions]);
  
  const shuffleQuestions = () => {
    const newQuestions = getNextQuestions(5);
    setCurrentQuestions(newQuestions);
  };

  // Generate more curated questions via AI when running low
  const generateMoreCuratedQuestions = async () => {
    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          relationshipType, 
          userRole,
          otherUserRole,
          count: 10,
          excludeQuestions: Array.from(shownQuestions)
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const newQuestions = data.questions || [];
        setAvailableQuestions(prev => [...prev, ...newQuestions]);
      }
    } catch (error) {
      console.error('Failed to generate more questions:', error);
    }
  };

  const generateAIQuestions = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          relationshipType, 
          userRole,
          otherUserRole,
          count: 5,
          excludeQuestions: Array.from(shownQuestions)
        })
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

  const generateCustomAIQuestions = async () => {
    if (!customPrompt.trim()) return;
    
    setIsGeneratingCustomAI(true);
    try {
      const response = await fetch('/api/ai/generate-custom-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          relationshipType, 
          userRole,
          otherUserRole,
          customPrompt: customPrompt.trim(),
          count: 5
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomAiQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Failed to generate custom AI questions:', error);
    } finally {
      setIsGeneratingCustomAI(false);
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
                  {userRole && otherUserRole ? (
                    ` Take this moment to reflect on your ${getRoleDisplayInfo(relationshipType, userRole, otherUserRole).conversationContext}.`
                  ) : (
                    ' You\'ll receive an email notification when it\'s your turn.'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* New Question Button */}
          <Dialog open={showNewQuestionDialog} onOpenChange={setShowNewQuestionDialog}>
            <DialogTrigger asChild>
              <Button 
                className="w-full bg-gradient-to-r from-ocean to-teal text-white hover:from-ocean/90 hover:to-teal/90 transition-all duration-200 shadow-lg hover:shadow-xl mb-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Question
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <QuotesIcon size="sm" />
                  <span>Ask a New Question</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-4">
                    Starting a new question will automatically save your current conversation and create a new thread.
                  </p>
                  <Textarea
                    placeholder="What would you like to ask or explore together?"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowNewQuestionDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateNewThread}
                    disabled={!newQuestionText.trim() || createThreadMutation.isPending}
                    className="bg-ocean text-white hover:bg-ocean/90"
                  >
                    {createThreadMutation.isPending ? "Creating..." : "Start New Thread"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
                {userRole && otherUserRole ? `${userRole}/${otherUserRole}` : relationshipType}
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
                `${currentQuestions.length} curated questions available`
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
