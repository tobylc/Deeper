import { useEffect, useState } from "react";
import { useAuth } from "@/App";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Users, Clock } from "lucide-react";
import ConversationInterface from "@/components/conversation-interface";
import QuestionSuggestions from "@/components/question-suggestions";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, Message } from "@shared/schema";

export default function ConversationPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  const { data: conversation } = useQuery<Conversation>({
    queryKey: [`/api/conversations/${id}`],
    enabled: !!id,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${id}/messages`],
    enabled: !!id,
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
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${user?.email}`] });
      setNewMessage("");
      toast({
        title: "Message sent!",
        description: "Your message has been delivered",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  if (!user || !conversation) return null;

  const otherParticipant = conversation.participant1Email === user.email 
    ? conversation.participant2Email 
    : conversation.participant1Email;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/dashboard")}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                <Users className="text-white w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-darkslate">
                  {user.name} & {otherParticipant}
                </div>
                <div className="text-sm text-gray-600">
                  {conversation.relationshipType}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant={isMyTurn ? "default" : "outline"}>
                {isMyTurn ? "Your turn" : "Their turn"}
              </Badge>
              <div className="text-sm text-gray-600 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {messages.length} exchanges
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Conversation */}
          <div className="lg:col-span-2">
            <ConversationInterface 
              messages={messages}
              currentUserEmail={user.email}
              participant1Email={conversation.participant1Email}
              participant2Email={conversation.participant2Email}
            />

            {/* Message Input */}
            {isMyTurn && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {nextMessageType === 'question' ? 'Ask a Question' : 'Share Your Response'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={
                        nextMessageType === 'question' 
                          ? "What would you like to ask?" 
                          : "Share your thoughts..."
                      }
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {nextMessageType === 'question' ? 'Asking a question' : 'Responding'}
                      </span>
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Question Suggestions Sidebar */}
          <div className="lg:col-span-1">
            {isMyTurn && nextMessageType === 'question' && (
              <QuestionSuggestions 
                relationshipType={conversation.relationshipType}
                onQuestionSelect={handleQuestionSelect}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
