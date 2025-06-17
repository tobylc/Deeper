import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  Users,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { UserDisplayName } from "@/hooks/useUserDisplayName";
import QuotesIcon from "@/components/quotes-icon";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, Message } from "@shared/schema";

interface ConversationThreadsProps {
  connectionId: number;
  currentUserEmail: string;
  otherParticipantEmail: string;
  relationshipType: string;
  onThreadSelect: (conversationId: number) => void;
  selectedConversationId?: number;
}

export default function ConversationThreads({
  connectionId,
  currentUserEmail,
  otherParticipantEmail,
  relationshipType,
  onThreadSelect,
  selectedConversationId
}: ConversationThreadsProps) {
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set());
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [newThreadTopic, setNewThreadTopic] = useState("");
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
        body: JSON.stringify({
          topic: data.topic,
          title: data.title || data.topic,
          participant1Email: currentUserEmail,
          participant2Email: otherParticipantEmail,
          relationshipType,
          isMainThread: false
        }),
      });
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${connectionId}/conversations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${connectionId}/conversations/message-counts`] });
      setShowNewThreadDialog(false);
      setNewThreadTopic("");
      onThreadSelect(newConversation.id);
      toast({
        title: "New conversation started",
        description: `Created new thread: ${newConversation.topic}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new conversation thread",
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
    if (!newThreadTopic.trim()) return;
    createThreadMutation.mutate({ topic: newThreadTopic.trim() });
  };

  // Sort conversations: main thread first, then by last activity
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.isMainThread && !b.isMainThread) return -1;
    if (!a.isMainThread && b.isMainThread) return 1;
    return new Date(b.lastActivityAt || b.createdAt!).getTime() - 
           new Date(a.lastActivityAt || a.createdAt!).getTime();
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-slate-200 rounded mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Conversation Threads</h3>
          <p className="text-sm text-slate-600">
            {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'} with{' '}
            <UserDisplayName email={otherParticipantEmail} />
          </p>
        </div>
        
        <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="btn-ocean">
              <Plus className="w-4 h-4 mr-2" />
              New Topic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  What would you like to talk about?
                </label>
                <Input
                  value={newThreadTopic}
                  onChange={(e) => setNewThreadTopic(e.target.value)}
                  placeholder="e.g., 'Weekend plans', 'Childhood memories', 'Future goals'..."
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCreateThread();
                    }
                  }}
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={handleCreateThread}
                  disabled={!newThreadTopic.trim() || createThreadMutation.isPending}
                  className="btn-ocean flex-1"
                >
                  {createThreadMutation.isPending ? "Creating..." : "Start Conversation"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewThreadDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Conversation Threads */}
      <div className="space-y-3">
        {sortedConversations.map((conversation) => {
          const messageCount = messageCounts[conversation.id] || 0;
          const isExpanded = expandedThreads.has(conversation.id);
          const isSelected = selectedConversationId === conversation.id;
          const isMyTurn = conversation.currentTurn === currentUserEmail;

          return (
            <Card 
              key={conversation.id}
              className={cn(
                "transition-all duration-200 cursor-pointer border",
                isSelected 
                  ? "ring-2 ring-ocean/20 border-ocean/30 bg-ocean/5" 
                  : "hover:shadow-md hover:border-slate-300",
                conversation.isMainThread && "border-l-4 border-l-amber"
              )}
            >
              <CardContent className="p-4">
                {/* Thread Header */}
                <div 
                  className="flex items-center justify-between"
                  onClick={() => onThreadSelect(conversation.id)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleThreadExpansion(conversation.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      
                      {conversation.isMainThread ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber to-amber/80 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean to-teal flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-slate-800">
                          {conversation.topic || conversation.title || 'Untitled Conversation'}
                        </h4>
                        {conversation.isMainThread && (
                          <Badge variant="outline" className="text-xs bg-amber/10 text-amber-800 border-amber/30">
                            Main
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500">
                        <span className="flex items-center space-x-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{messageCount} exchanges</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(conversation.lastActivityAt || conversation.createdAt!), { addSuffix: true })}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant={isMyTurn ? "default" : "outline"} className="text-xs">
                      {isMyTurn ? "Your turn" : "Their turn"}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Expanded Thread Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-sm text-slate-600 space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Relationship: {relationshipType}</span>
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
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-800 mb-2">No conversations yet</h3>
            <p className="text-sm text-slate-600 mb-4">
              Start your first conversation with <UserDisplayName email={otherParticipantEmail} />
            </p>
            <Button onClick={() => setShowNewThreadDialog(true)} className="btn-ocean">
              <Plus className="w-4 h-4 mr-2" />
              Start First Conversation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}