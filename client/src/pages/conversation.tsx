import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Users, Clock, MessageCircle, Grid3X3 } from "lucide-react";
import ConversationInterface from "@/components/conversation-interface";
import ConversationThreads from "@/components/conversation-threads";
import QuestionSuggestions from "@/components/question-suggestions";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserDisplayName, useUserDisplayName } from "@/hooks/useUserDisplayName";
import type { Conversation, Message, Connection } from "@shared/schema";

export default function ConversationPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [newMessage, setNewMessage] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<number | undefined>();
  const [showThreadsView, setShowThreadsView] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  // Initialize selected conversation ID from URL
  useEffect(() => {
    if (id && !selectedConversationId) {
      setSelectedConversationId(parseInt(id));
    }
  }, [id, selectedConversationId]);

  const { data: conversation, isLoading: conversationLoading } = useQuery<Conversation>({
    queryKey: [`/api/conversations/${selectedConversationId || id}`],
    queryFn: async () => {
      const conversationId = selectedConversationId || id;
      const response = await apiRequest('GET', `/api/conversations/${conversationId}`);
      return response.json();
    },
    enabled: !!(selectedConversationId || id) && !!user,
  });

  // Get connection info for threading
  const { data: connection } = useQuery<Connection>({
    queryKey: [`/api/connections/${conversation?.connectionId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/connections/${conversation?.connectionId}`);
      return response.json();
    },
    enabled: !!conversation?.connectionId && !!user,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${selectedConversationId || id}/messages`],
    queryFn: async () => {
      const conversationId = selectedConversationId || id;
      const response = await apiRequest('GET', `/api/conversations/${conversationId}/messages`);
      return response.json();
    },
    enabled: !!(selectedConversationId || id) && !!user,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; type: 'question' | 'response' }) => {
      if (!user?.email) {
        throw new Error("User not authenticated");
      }
      if (!data.content.trim()) {
        throw new Error("Message content cannot be empty");
      }
      const response = await apiRequest("POST", `/api/conversations/${id}/messages`, {
        senderEmail: user.email,
        content: data.content.trim(),
        type: data.type,
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${id}/messages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/by-email/${user?.email}`] });
      setNewMessage("");
      toast({
        title: "Message sent!",
        description: "Your message has been delivered",
      });
    },
    onError: (error: any) => {
      console.error("Send message error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <h2 className="text-xl font-semibold mb-4">Please log in to view this conversation</h2>
          <Button onClick={() => setLocation("/auth")} className="btn-ocean">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (conversationLoading || messagesLoading) {
    return (
      <div className="min-h-screen bg-gradient-radial from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-ocean to-teal flex items-center justify-center p-3 mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-300">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <h2 className="text-xl font-semibold mb-4">Conversation not found</h2>
          <Button onClick={() => setLocation("/dashboard")} className="btn-ocean">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const otherParticipant = conversation.participant1Email === user.email 
    ? conversation.participant2Email 
    : conversation.participant1Email;
  
  // Correct turn logic: inviter (participant1) always starts the conversation
  const isMyTurn = conversation.currentTurn === user.email;
  
  // Determine if the next message should be a question or response
  const lastMessage = messages[messages.length - 1];
  const nextMessageType: 'question' | 'response' = 
    !lastMessage || lastMessage.type === 'response' ? 'question' : 'response';

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      content: newMessage,
      type: nextMessageType,
    });
  };

  const handleQuestionSelect = (question: string) => {
    setNewMessage(question);
  };

  const handleThreadSelect = (conversationId: number) => {
    setSelectedConversationId(conversationId);
    setNewMessage(""); // Clear message when switching threads
    setShowThreadsView(false); // Hide threads view on mobile after selection
  };

  return (
    <div className="h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/dashboard")}
              className="flex items-center text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                <Users className="text-white w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-darkslate text-sm">
                  {user.firstName || user.email?.split('@')[0] || 'You'} & <UserDisplayName email={otherParticipant} />
                </div>
                <div className="text-xs text-gray-600">
                  {conversation.relationshipType}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowThreadsView(!showThreadsView)}
                className="lg:hidden text-xs px-2 py-1"
              >
                <Grid3X3 className="w-3 h-3 mr-1" />
                Questions
              </Button>
              <Badge variant={isMyTurn ? "default" : "outline"} className="text-xs">
                {isMyTurn ? "Your turn" : "Their turn"}
              </Badge>
              <div className="text-xs text-gray-600 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {messages.length} exchanges
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 min-h-0">
        <div className="grid lg:grid-cols-4 gap-4 h-full">
          {/* Conversation Threads Sidebar */}
          <div className={`lg:col-span-1 ${showThreadsView ? 'block' : 'hidden lg:block'} h-full`}>
            {conversation && connection && (
              <ConversationThreads
                connectionId={conversation.connectionId}
                currentUserEmail={user.email || ''}
                otherParticipantEmail={otherParticipant}
                relationshipType={conversation.relationshipType}
                onThreadSelect={handleThreadSelect}
                selectedConversationId={selectedConversationId || parseInt(id!)}
              />
            )}
          </div>

          {/* Main Conversation */}
          <div className={`lg:col-span-2 ${showThreadsView ? 'hidden lg:block' : 'block'} h-full`}>
            <ConversationInterface 
              messages={messages}
              currentUserEmail={user.email || ''}
              participant1Email={conversation.participant1Email}
              participant2Email={conversation.participant2Email}
              isMyTurn={isMyTurn}
              relationshipType={conversation.relationshipType}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={handleSendMessage}
              onQuestionSelect={handleQuestionSelect}
              isSending={sendMessageMutation.isPending}
              nextMessageType={nextMessageType}
            />
          </div>

          {/* Question Suggestions Sidebar */}
          <div className={`lg:col-span-1 ${showThreadsView ? 'hidden lg:block' : 'block'} h-full`}>
            {isMyTurn && nextMessageType === 'question' && (
              <QuestionSuggestions 
                relationshipType={conversation.relationshipType}
                onQuestionSelect={handleQuestionSelect}
              />
            )}
            
            {/* Turn Status and Instructions */}
            {!isMyTurn && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
