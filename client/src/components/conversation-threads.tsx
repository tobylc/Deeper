import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Sparkles,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { UserDisplayName } from "@/hooks/useUserDisplayName";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Conversation } from "@shared/schema";

interface ConversationThreadsProps {
  connectionId: number;
  currentUserEmail: string;
  otherParticipantEmail: string;
  relationshipType: string;
  onThreadSelect: (conversationId: number) => void;
  selectedConversationId?: number;
  isMyTurn: boolean;
}

// AI-generated questions based on relationship type
const getAIQuestionSuggestions = (relationshipType: string): string[] => {
  const suggestions = {
    "Parent-Child": [
      "What's one family tradition you hope to continue?",
      "When did you feel most proud of me recently?",
      "What was your biggest worry as a teenager?",
      "What life lesson do you wish you'd learned earlier?"
    ],
    "Romantic Partners": [
      "What's something new you'd like us to try together?",
      "When do you feel most loved by me?",
      "What's your happiest memory of us?",
      "What dream would you like us to pursue together?"
    ],
    "Friends": [
      "What's the best advice you've ever received?",
      "What adventure would you want us to go on?",
      "How have you changed in the past year?",
      "What's something you're excited about right now?"
    ],
    "Siblings": [
      "What's your favorite childhood memory of us?",
      "How do you think we've influenced each other?",
      "What family trait do you see in yourself?",
      "What would you want to tell our younger selves?"
    ]
  };
  
  return suggestions[relationshipType as keyof typeof suggestions] || suggestions["Friends"];
};

export default function ConversationThreads({
  connectionId,
  currentUserEmail,
  otherParticipantEmail,
  relationshipType,
  onThreadSelect,
  selectedConversationId,
  isMyTurn
}: ConversationThreadsProps) {
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set());
  const [showNewQuestionDialog, setShowNewQuestionDialog] = useState(false);
  const [newQuestionTopic, setNewQuestionTopic] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all conversation threads for this connection
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: [`/api/connections/${connectionId}/conversations`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/connections/${connectionId}/conversations`);
      return response.json();
    },
  });

  // Fetch message counts for each conversation
  const { data: messageCounts = {} } = useQuery<Record<number, number>>({
    queryKey: [`/api/connections/${connectionId}/conversations/message-counts`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/connections/${connectionId}/conversations/message-counts`);
      return response.json();
    },
  });

  // Create new conversation thread
  const createThreadMutation = useMutation({
    mutationFn: async (data: { topic: string; title?: string }) => {
      const response = await apiRequest('POST', `/api/connections/${connectionId}/conversations`, {
        topic: data.topic,
        title: data.title || data.topic,
        participant1Email: currentUserEmail,
        participant2Email: otherParticipantEmail,
        relationshipType,
        isMainThread: false
      });
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${connectionId}/conversations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${connectionId}/conversations/message-counts`] });
      setShowNewQuestionDialog(false);
      setNewQuestionTopic("");
      onThreadSelect(newConversation.id);
      toast({
        title: "New question started",
        description: `Created new conversation: ${newConversation.topic}`,
      });
    },
    onError: (error: any) => {
      console.error("Create thread error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create new question thread",
        variant: "destructive",
      });
    },
  });

  const toggleThreadExpansion = (threadId: number) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId);
    } else {
      newExpanded.add(threadId);
    }
    setExpandedThreads(newExpanded);
  };

  const handleCreateThread = () => {
    if (!newQuestionTopic.trim()) return;
    
    // Prevent new thread creation when it's not user's turn
    if (!isMyTurn) {
      // Close dialog and don't show error - the waiting state will be visible
      setShowNewQuestionDialog(false);
      setNewQuestionTopic("");
      return;
    }
    
    createThreadMutation.mutate({ topic: newQuestionTopic.trim() });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNewQuestionTopic(suggestion);
  };

  // Sort conversations: main thread first, then by last activity
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.isMainThread && !b.isMainThread) return -1;
    if (!a.isMainThread && b.isMainThread) return 1;
    return new Date(b.lastActivityAt || b.createdAt!).getTime() - 
           new Date(a.lastActivityAt || a.createdAt!).getTime();
  });

  const aiSuggestions = getAIQuestionSuggestions(relationshipType);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="h-3 bg-slate-200 rounded mb-2"></div>
              <div className="h-2 bg-slate-100 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-slate-800">Questions</h3>
          {isMyTurn ? (
            <Dialog open={showNewQuestionDialog} onOpenChange={setShowNewQuestionDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="btn-ocean text-xs px-2 py-1 h-7">
                  <Plus className="w-3 h-3 mr-1" />
                  New Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Ask a New Question</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      What would you like to ask?
                    </label>
                    <Input
                      value={newQuestionTopic}
                      onChange={(e) => setNewQuestionTopic(e.target.value)}
                      placeholder="Type your question..."
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCreateThread();
                        }
                      }}
                    />
                  </div>
                  
                  {/* AI Question Suggestions */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-amber" />
                      <span className="text-sm font-medium text-slate-700">Question Ideas</span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {aiSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left p-2 text-xs bg-slate-50 hover:bg-slate-100 rounded border text-slate-700 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleCreateThread}
                      disabled={!newQuestionTopic.trim() || createThreadMutation.isPending}
                      className="btn-ocean flex-1"
                    >
                      {createThreadMutation.isPending ? "Creating..." : "Ask Question"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewQuestionDialog(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="relative bg-gradient-to-br from-white via-amber-50/20 to-amber/5 p-3 rounded-sm border border-amber/20 shadow-md shadow-amber/10"
                 style={{
                   background: `
                     linear-gradient(135deg, 
                       rgba(255,255,255,0.98) 0%, 
                       rgba(255,251,235,0.96) 30%, 
                       rgba(215,160,135,0.08) 70%, 
                       rgba(215,160,135,0.12) 100%
                     )
                   `,
                   filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.06))',
                   backdropFilter: 'blur(0.5px)'
                 }}>
              {/* Subtle paper texture */}
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(0,0,0,0.02)_0%,_transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,_rgba(0,0,0,0.015)_0%,_transparent_50%)]"></div>
              </div>
              
              {/* Very subtle ruled lines */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" 
                   style={{
                     backgroundImage: 'repeating-linear-gradient(transparent, transparent 12px, rgba(156,163,175,0.1) 12px, rgba(156,163,175,0.1) 13px)',
                   }} />
              
              <div className="text-xs text-gray-700 text-center relative z-10">
                Their turn to write
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-600 relative z-10">
          {conversations.length} {conversations.length === 1 ? 'question' : 'questions'} with{' '}
          <UserDisplayName email={otherParticipantEmail} />
        </p>
      </div>

      {/* Conversation Threads */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {sortedConversations.map((conversation) => {
          const messageCount = messageCounts[conversation.id] || 0;
          const isExpanded = expandedThreads.has(conversation.id);
          const isSelected = selectedConversationId === conversation.id;
          const isMyTurn = conversation.currentTurn === currentUserEmail;

          return (
            <Card 
              key={conversation.id}
              className={cn(
                "transition-all duration-200 cursor-pointer border rounded-sm",
                isSelected ? [
                  "bg-gradient-to-br from-white via-ocean/10 to-ocean/5",
                  "border-ocean/30 shadow-lg shadow-ocean/15"
                ] : [
                  "bg-gradient-to-br from-white via-gray-50/30 to-amber-50/10", 
                  "border-gray-200/40 shadow-md shadow-gray-400/10 hover:shadow-lg"
                ],
                conversation.isMainThread && "border-l-4 border-l-amber"
              )}
              style={{
                background: isSelected ? `
                  linear-gradient(135deg, 
                    rgba(255,255,255,0.98) 0%, 
                    rgba(239,246,255,0.96) 30%, 
                    rgba(79,172,254,0.12) 70%, 
                    rgba(79,172,254,0.15) 100%
                  )
                ` : `
                  linear-gradient(135deg, 
                    rgba(255,255,255,0.98) 0%, 
                    rgba(248,250,252,0.96) 30%, 
                    rgba(255,251,235,0.94) 70%, 
                    rgba(255,251,235,0.92) 100%
                  )
                `,
                filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.06))',
                backdropFilter: 'blur(0.5px)'
              }}
            >
              <CardContent className="p-3 relative">
                {/* Subtle paper texture */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(0,0,0,0.015)_0%,_transparent_50%)]"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,_rgba(0,0,0,0.01)_0%,_transparent_50%)]"></div>
                </div>
                
                {/* Very subtle ruled lines */}
                <div className="absolute inset-0 opacity-15 pointer-events-none" 
                     style={{
                       backgroundImage: 'repeating-linear-gradient(transparent, transparent 18px, rgba(156,163,175,0.08) 18px, rgba(156,163,175,0.08) 19px)',
                     }} />
                {/* Thread Header */}
                <div 
                  className="flex items-center justify-between"
                  onClick={() => onThreadSelect(conversation.id)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-4 w-4 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleThreadExpansion(conversation.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </Button>
                    
                    {conversation.isMainThread ? (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber to-amber/80 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ocean to-teal flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center space-x-1">
                        <h4 className="font-medium text-gray-800 text-xs truncate">
                          {conversation.title || conversation.topic || 'Untitled Question'}
                        </h4>
                        {conversation.isMainThread && (
                          <Badge variant="outline" className="text-xs bg-amber/10 text-amber-800 border-amber/30 px-1 py-0">
                            Main
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
                        <span className="flex items-center space-x-1">
                          <MessageCircle className="w-2 h-2" />
                          <span>{messageCount}</span>
                        </span>
                        <span className="truncate">
                          {formatDistanceToNow(new Date(conversation.lastActivityAt || conversation.createdAt!), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0 relative z-10">
                    <Badge 
                      variant={isMyTurn ? "default" : "outline"} 
                      className={cn(
                        "text-xs px-1 py-0",
                        isMyTurn 
                          ? "bg-ocean text-white border-ocean" 
                          : "bg-amber/10 text-amber-800 border-amber/30"
                      )}
                    >
                      {isMyTurn ? "Your turn" : "Their turn"}
                    </Badge>
                  </div>
                </div>

                {/* Expanded Thread Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 relative z-10">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Type: {relationshipType}</span>
                        <span>Status: {conversation.status}</span>
                      </div>
                      <div>
                        Current turn: <UserDisplayName email={conversation.currentTurn} />
                      </div>
                      {conversation.topic && conversation.topic !== conversation.title && (
                        <div>Topic: {conversation.topic}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {conversations.length === 0 && (
        <Card className="border-dashed border-2 border-slate-200 flex-1">
          <CardContent className="p-6 text-center flex flex-col justify-center h-full">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-800 mb-2 text-sm">No questions yet</h3>
            <p className="text-xs text-slate-600 mb-4">
              Start your first conversation with <UserDisplayName email={otherParticipantEmail} />
            </p>
            <Button onClick={() => setShowNewQuestionDialog(true)} className="btn-ocean text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Ask First Question
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}