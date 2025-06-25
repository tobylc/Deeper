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
import { useToast } from "@/hooks/use-toast";
import ExchangeRequiredPopup from "@/components/exchange-required-popup";
import MesmerizingWaitingVisual from "@/components/mesmerizing-waiting-visual";

interface QuestionSuggestionsProps {
  relationshipType: string;
  userRole: string;
  otherUserRole: string;
  onQuestionSelect: (question: string) => void;
  isMyTurn: boolean;
  otherParticipant: string;
  connectionId: number;
  onNewThreadCreated: (conversationId: number) => void;
  canUseRightColumn: boolean;
  canCreateNewThread: boolean;
  nextMessageType: 'question' | 'response';
}

export default function QuestionSuggestions({ relationshipType, userRole, otherUserRole, onQuestionSelect, isMyTurn, otherParticipant, connectionId, onNewThreadCreated, canUseRightColumn, canCreateNewThread, nextMessageType }: QuestionSuggestionsProps) {
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
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showExchangeRequiredPopup, setShowExchangeRequiredPopup] = useState(false);
  
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Thread creation mutation using specialized endpoint with flow validation
  const createThreadMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!user?.email) {
        throw new Error("User not authenticated");
      }
      
      // Use the specialized endpoint that creates conversation thread with question and enforces flow restrictions
      const response = await apiRequest("POST", `/api/connections/${connectionId}/conversations/with-question`, {
        question: question.trim(),
        participant1Email: user.email,
        participant2Email: otherParticipant,
        relationshipType: relationshipType
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${connectionId}/conversations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversation.id}/messages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/by-email/${user?.email}`] });
      setShowNewQuestionDialog(false);
      setNewQuestionText("");
      onNewThreadCreated(data.conversation.id);
    },
    onError: (error: any) => {
      console.error("Create thread error:", error);
      // Check if it's an exchange requirement error
      if (error.message && error.message.includes("provide at least one response")) {
        setShowExchangeRequiredPopup(true);
      } else {
        toast({
          title: "Unable to create thread",
          description: error.message || "Please try again in a moment",
        });
      }
    }
  });

  const handleCreateNewThread = () => {
    if (!newQuestionText.trim() || !isMyTurn) return;
    
    // Check if we can create new threads
    if (!canCreateNewThread) {
      setShowExchangeRequiredPopup(true);
      return;
    }
    
    createThreadMutation.mutate(newQuestionText.trim());
  };

  // Handle all question selections from right column (curated, AI, custom)
  const handleQuestionSelect = (question: string) => {
    // Always allow question suggestions if it's the user's turn and next message is a question
    if (!canUseRightColumn) {
      // Show beautiful popup instead of ugly toast
      setShowExchangeRequiredPopup(true);
      return;
    }
    
    // If we can create new threads (i.e., there's been a complete exchange), create a new thread
    // Otherwise, just populate the question into the current conversation
    if (canCreateNewThread) {
      // Create new conversation thread with the selected question
      createThreadMutation.mutate(question);
    } else {
      // For the first question in a conversation, just populate it into the input
      onQuestionSelect(question);
    }
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
        setShowCustomModal(true);
      }
    } catch (error) {
      console.error('Failed to generate custom AI questions:', error);
    } finally {
      setIsGeneratingCustomAI(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Show mesmerizing waiting visual when it's not the user's turn */}
      {!isMyTurn ? (
        <Card className="card-elevated border-ocean/30 bg-gradient-to-br from-ocean/5 to-ocean/8 h-fit overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[280px]">
              <MesmerizingWaitingVisual otherUserName={otherParticipant} />
            </div>
          </CardContent>
        </Card>
      ) : !isMyTurn ? (
        // Show waiting state when it's not user's turn
        <Card className="card-elevated border-ocean/30 bg-ocean/5 h-fit">
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-ocean/20 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5 text-ocean" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground font-inter mb-2 text-sm">
                  Their turn to write
                </h3>
                <p className="text-xs text-slate-700 font-inter leading-relaxed">
                  While you wait, take a moment to reflect on the conversation so far. What insights are emerging?
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !canUseRightColumn ? (
        // Show message when user needs to complete requirements before asking new questions
        <Card className="card-elevated border-ocean/30 bg-ocean/5 h-fit">
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-ocean/20 flex items-center justify-center mx-auto">
                <MessageCircle className="w-5 h-5 text-ocean" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground font-inter mb-2 text-sm">
                  {nextMessageType === 'response' ? 'Response Required' : 'Initial Exchange Needed'}
                </h3>
                <p className="text-xs text-slate-700 font-inter leading-relaxed">
                  {nextMessageType === 'response' 
                    ? 'Please respond to the current question using the middle column before asking a new question.'
                    : 'Complete at least one question-response exchange before starting new question threads.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* New Question Button - Only available when canCreateNewThread is true */}
          <Dialog open={showNewQuestionDialog} onOpenChange={setShowNewQuestionDialog}>
            <DialogTrigger asChild>
              <Button 
                className="w-full bg-gradient-to-r from-ocean to-teal text-white hover:from-ocean/90 hover:to-teal/90 transition-all duration-200 shadow-lg hover:shadow-xl mb-4"
                disabled={!canCreateNewThread}
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
                onClick={() => handleQuestionSelect(question)}
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



          {/* More Button */}
          <div className="text-center pt-3">
            <button
              onClick={showAI ? generateAIQuestions : shuffleQuestions}
              disabled={showAI ? isGeneratingAI : false}
              className={cn(
                "text-xs font-medium px-4 py-2 rounded-lg border transition-all duration-200",
                "hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
                showAI 
                  ? "text-amber-700 border-amber/30 bg-amber/10 hover:bg-amber/20"
                  : "text-ocean border-ocean/30 bg-ocean/10 hover:bg-ocean/20"
              )}
            >
              {showAI && isGeneratingAI ? "Generating..." : "More"}
            </button>
          </div>

          {/* Custom AI Prompt */}
          {showAI && (
            <div className="mt-3 pt-3 border-t border-amber/20">
              <div className="text-xs font-medium text-amber-700 mb-2">Ask AI about a specific topic or situation:</div>
              <div className="space-y-2">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe what you want to talk about or explore with your partner..."
                  className="w-full text-xs p-2 rounded-lg border border-amber/30 bg-amber/5 resize-none focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber/50"
                  rows={2}
                />
                <button
                  onClick={generateCustomAIQuestions}
                  disabled={!customPrompt.trim() || isGeneratingCustomAI}
                  className="w-full text-xs font-medium px-3 py-1.5 rounded-lg border bg-amber/10 border-amber/30 text-amber-700 hover:bg-amber/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isGeneratingCustomAI ? "Generating..." : "Generate Custom Questions"}
                </button>
              </div>
            </div>
          )}

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

      {/* Custom AI Questions Modal */}
      <Dialog open={showCustomModal} onOpenChange={setShowCustomModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium text-amber-700">
              Custom Question Suggestions
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {customAiQuestions.map((question, index) => (
              <div
                key={`modal-custom-${index}`}
                onClick={() => {
                  handleQuestionSelect(question);
                  setShowCustomModal(false);
                  setCustomPrompt("");
                  setCustomAiQuestions([]);
                }}
                className="group cursor-pointer transition-all duration-200 p-3 rounded-xl border bg-gradient-to-br from-amber/10 to-amber/15 border-amber/30 hover:border-amber/50 hover:bg-amber/20 hover:shadow-md hover:scale-[1.01]"
              >
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <MessageCircle className="w-3 h-3 text-amber-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm leading-relaxed text-slate-700 group-hover:text-slate-900">
                      "{question}"
                    </div>
                    
                    <div className="flex items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-xs font-medium mr-1 text-amber-600">
                        Click to use
                      </span>
                      <ArrowRight className="w-2 h-2 text-amber-600" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Beautiful Exchange Required Popup */}
      <ExchangeRequiredPopup
        isOpen={showExchangeRequiredPopup}
        onClose={() => setShowExchangeRequiredPopup(false)}
        nextMessageType={nextMessageType}
        relationshipType={relationshipType}
      />
    </div>
  );
}
