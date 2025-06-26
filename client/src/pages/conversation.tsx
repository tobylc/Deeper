import React, { useEffect, useState, useMemo } from "react";
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
import ProfileAvatar from "@/components/profile-avatar";
import OnboardingPopup from "@/components/onboarding-popup";
import ThoughtfulResponsePopup from "@/components/thoughtful-response-popup";
import NotificationPreferencePopup from "@/components/notification-preference-popup";
import TrialExpirationPopup from "@/components/trial-expiration-popup";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserDisplayName, useUserDisplayName } from "@/hooks/useUserDisplayName";
import { getRoleDisplayInfo, getConversationHeaderText } from "@shared/role-display-utils";
import { HypnoticOrbs } from "@/components/hypnotic-orbs";
import FloatingWaitingText from "@/components/floating-waiting-text";
import type { Conversation, Message, Connection, User } from "@shared/schema";

export default function ConversationPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [newMessage, setNewMessage] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<number | undefined>();
  const [showThreadsView, setShowThreadsView] = useState(false);
  const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showTrialExpirationPopup, setShowTrialExpirationPopup] = useState(false);

  const [showThoughtfulResponsePopup, setShowThoughtfulResponsePopup] = useState(false);
  const [responseStartTime, setResponseStartTime] = useState<Date | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const [hasStartedResponse, setHasStartedResponse] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if user was invited by someone else (is an invitee)
  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: [`/api/connections/${user?.email}`],
    enabled: !!user?.email,
  });

  const isInviteeUser = connections.some(c => c.inviteeEmail === user?.email);

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  // Initialize selected conversation ID from URL
  useEffect(() => {
    if (id && !selectedConversationId) {
      console.log("Setting conversation ID from URL:", id);
      setSelectedConversationId(parseInt(id));
    }
  }, [id, selectedConversationId]);

  // Listen for WebSocket conversation thread creation events
  useEffect(() => {
    const handleConversationThreadCreated = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      if (conversationId) {
        setSelectedConversationId(conversationId);
        setNewMessage(""); // Clear any existing message
      }
    };

    window.addEventListener('conversationThreadCreated', handleConversationThreadCreated as EventListener);
    
    return () => {
      window.removeEventListener('conversationThreadCreated', handleConversationThreadCreated as EventListener);
    };
  }, []);

  const { data: conversation, isLoading: conversationLoading, error: conversationError } = useQuery<Conversation>({
    queryKey: [`/api/conversations/${selectedConversationId || id}`],
    queryFn: async () => {
      const conversationId = selectedConversationId || id;
      try {
        const response = await apiRequest('GET', `/api/conversations/${conversationId}`);
        if (!response.ok) {
          throw new Error(`Failed to load conversation: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Conversation loading error:', error);
        throw error;
      }
    },
    enabled: !!(selectedConversationId || id) && !!user,
    retry: 3,
    retryDelay: 1000,
  });

  // Determine other participant after conversation is loaded
  const otherParticipant = conversation && user?.email 
    ? (conversation.participant1Email === user.email 
        ? conversation.participant2Email 
        : conversation.participant1Email)
    : '';

  // Get connection info for threading
  const { data: connection } = useQuery<Connection>({
    queryKey: [`/api/connections/${conversation?.connectionId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/connections/${conversation?.connectionId}`);
      return response.json();
    },
    enabled: !!conversation?.connectionId && !!user,
  });

  // Determine user roles based on connection data
  const currentUserRole = connection && user?.email 
    ? (connection.inviterEmail === user.email 
        ? connection.inviterRole 
        : connection.inviteeRole)
    : '';

  const otherUserRole = connection && user?.email 
    ? (connection.inviterEmail === user.email 
        ? connection.inviteeRole 
        : connection.inviterRole)
    : '';

  // Determine if current user is the inviter
  const isInviter = connection && user?.email 
    ? connection.inviterEmail === user.email 
    : false;

  // Get user data for both participants
  const { data: currentUserData } = useQuery<User>({
    queryKey: [`/api/users/by-email/${user?.email}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/by-email/${user?.email}`);
      return response.json();
    },
    enabled: !!user?.email,
  });

  const { data: otherUserData } = useQuery<User>({
    queryKey: [`/api/users/by-email/${otherParticipant}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/by-email/${otherParticipant}`);
      return response.json();
    },
    enabled: !!otherParticipant,
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

  // Check notification preference status for this conversation
  const { data: notificationPref } = useQuery({
    queryKey: [`/api/users/notification-preference/${selectedConversationId || id}`],
    queryFn: async () => {
      const conversationId = selectedConversationId || id;
      const response = await apiRequest('GET', `/api/users/notification-preference/${conversationId}`);
      return response.json();
    },
    enabled: !!(selectedConversationId || id) && !!user,
  });

  // Check if user needs to see onboarding popup - only show once globally per user
  useEffect(() => {
    if (currentUserData && currentUserData.hasSeenOnboarding === false && conversation && !showOnboardingPopup) {
      // Only show if user has never seen onboarding globally
      setShowOnboardingPopup(true);
    }
  }, [currentUserData?.hasSeenOnboarding, conversation?.id]);





  // Mutation to mark onboarding as complete
  const markOnboardingCompleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/users/mark-onboarding-complete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/by-email/${user?.email}`] });
      setShowOnboardingPopup(false);
    },
  });

  // Mutation to set notification preference
  const setNotificationPreferenceMutation = useMutation({
    mutationFn: async (data: { conversationId: number; preference: "email" | "sms" | "both" }) => {
      return apiRequest('POST', '/api/users/notification-preference', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/notification-preference/${selectedConversationId || id}`] });
      setShowNotificationPopup(false);
    },
  });

  // Mutation to dismiss notification popup
  const dismissNotificationPopupMutation = useMutation({
    mutationFn: async (data: { conversationId: number; dismissType: "never" | "later" }) => {
      return apiRequest('POST', '/api/users/dismiss-notification-popup', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/notification-preference/${selectedConversationId || id}`] });
      setShowNotificationPopup(false);
    },
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
      
      // Check if this is user's first message in this conversation and they haven't set notification preferences
      if (messages.length === 0 && notificationPref && !notificationPref.hasPreference && !notificationPref.neverShow) {
        setShowNotificationPopup(true);
      }
      
      setNewMessage("");
      toast({
        title: "Message sent!",
        description: "Your message has been delivered",
      });
    },
    onError: (error: any) => {
      console.error("Send message error:", error);
      
      // Parse error response to check for trial expiration
      let errorData;
      try {
        errorData = JSON.parse(error.message);
      } catch {
        errorData = { message: error.message };
      }
      
      // Show beautiful trial expiration popup for trial expired errors (but not for invitee users)
      if ((errorData.type === "TRIAL_EXPIRED" || (errorData.message && errorData.message.includes("trial has expired"))) && !isInviteeUser) {
        setShowTrialExpirationPopup(true);
        return;
      }
      
      // For other errors, still show a nicer toast (not destructive red)
      toast({
        title: "Unable to send message",
        description: errorData.message || "Please try again in a moment",
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

  if (conversationError) {
    console.error('Conversation error:', conversationError);
    return (
      <div className="min-h-screen bg-gradient-radial from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-[#1B2137]/90 backdrop-blur-md p-8 rounded-2xl shadow-lg text-center border border-[#4FACFE]/30">
          <h2 className="text-xl font-semibold mb-4 text-white">Error loading conversation</h2>
          <p className="text-slate-300 mb-4">There was an issue loading this conversation. This might be a temporary network issue.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-[#4FACFE] to-teal text-white">
              Try Again
            </Button>
            <Button onClick={() => setLocation("/dashboard")} variant="outline" className="border-[#4FACFE]/30 text-[#4FACFE] hover:bg-[#4FACFE]/10">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gradient-radial from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-[#1B2137]/90 backdrop-blur-md p-8 rounded-2xl shadow-lg text-center border border-[#4FACFE]/30">
          <h2 className="text-xl font-semibold mb-4 text-white">Conversation not found</h2>
          <p className="text-slate-300 mb-4">This conversation may not exist or you may not have access to it.</p>
          <Button onClick={() => setLocation("/dashboard")} className="bg-gradient-to-r from-[#4FACFE] to-teal text-white">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Correct turn logic: inviter (participant1) always starts the conversation
  // For empty conversations, inviter should always have the first turn
  const isMyTurn = messages.length === 0 
    ? conversation.participant1Email === user.email // Inviter gets first turn in empty conversation
    : conversation.currentTurn === user.email;
  
  // Production-ready message type validation: EVERY question requires a response
  const getNextMessageType = (): 'question' | 'response' => {
    try {
      if (!messages || messages.length === 0) return 'question'; // First message is always a question
      
      // Find the most recent question in the conversation
      let lastQuestionIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === 'question') {
          lastQuestionIndex = i;
          break;
        }
      }
      
      // If there's a question without a response, only allow responses
      if (lastQuestionIndex !== -1) {
        const messagesAfterLastQuestion = messages.slice(lastQuestionIndex + 1);
        const hasResponseToLastQuestion = messagesAfterLastQuestion.some(msg => msg.type === 'response');
        
        // If the last question hasn't been responded to, only allow responses
        if (!hasResponseToLastQuestion) {
          return 'response';
        }
      }
      
      // If all questions have been answered, user can ask new questions
      return 'question';
    } catch (error) {
      console.error('[CONVERSATION] Error determining next message type:', error);
      return 'response'; // Safe default
    }
  };

  const nextMessageType = getNextMessageType();

  // Check if user has provided at least one response to allow new questions
  const hasProvidedResponse = messages.some(msg => 
    msg.type === 'response' && msg.senderEmail === user?.email
  );

  // Production-ready validation: EVERY question requires a response before new questions
  const lastQuestionNeedsResponse = useMemo(() => {
    try {
      if (!messages || messages.length === 0) return false;
      
      // Find the most recent question in current conversation
      let lastQuestionIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === 'question') {
          lastQuestionIndex = i;
          break;
        }
      }
      
      // If there's a question, check if it has a response
      if (lastQuestionIndex !== -1) {
        const messagesAfterLastQuestion = messages.slice(lastQuestionIndex + 1);
        const hasResponseToLastQuestion = messagesAfterLastQuestion.some(msg => msg.type === 'response');
        return !hasResponseToLastQuestion;
      }
      
      return false;
    } catch (error) {
      console.error('[CONVERSATION] Error checking last question response:', error);
      return false;
    }
  }, [messages]);

  // Check if there has been at least one complete question-response exchange in this thread
  const hasCompleteExchange = messages.length >= 2 && 
    messages.some(msg => msg.type === 'question') && 
    messages.some(msg => msg.type === 'response');

  // Production-ready right column validation with comprehensive error handling
  const canUseRightColumn = useMemo(() => {
    try {
      // Basic turn validation
      if (!isMyTurn) return false;
      
      // Block right column if current conversation has unanswered question
      if (lastQuestionNeedsResponse) return false;
      
      // Allow right column usage when it's user's turn and no unanswered questions
      return true;
    } catch (error) {
      console.error('[CONVERSATION] Error validating right column access:', error);
      return false; // Safe default
    }
  }, [isMyTurn, lastQuestionNeedsResponse]);
  
  // Enhanced validation for new thread creation
  const canCreateNewThread = useMemo(() => {
    try {
      // Must have complete exchange in current conversation
      if (!hasCompleteExchange) return false;
      
      // Must not have unanswered questions in current conversation
      if (lastQuestionNeedsResponse) return false;
      
      return true;
    } catch (error) {
      console.error('[CONVERSATION] Error validating new thread creation:', error);
      return false;
    }
  }, [hasCompleteExchange, lastQuestionNeedsResponse]);



  const checkResponseTime = () => {
    if (!responseStartTime) return true;
    
    const now = new Date();
    const timeDifference = now.getTime() - responseStartTime.getTime();
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    return timeDifference >= tenMinutesInMs;
  };

  const getRemainingTime = () => {
    if (!responseStartTime) return 0;
    
    const now = new Date();
    const timeDifference = now.getTime() - responseStartTime.getTime();
    const tenMinutesInMs = 10 * 60 * 1000;
    const remaining = tenMinutesInMs - timeDifference;
    
    return Math.max(0, Math.ceil(remaining / 1000)); // Return seconds remaining
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Check if this is the inviter's first question - skip timer for this case
    const isInviterFirstQuestion = messages.length === 0 && 
                                   connection?.inviterEmail === user?.email &&
                                   nextMessageType === 'question';
    
    // Check if enough time has passed for thoughtful response (skip for inviter's first question)
    if (!isInviterFirstQuestion && hasStartedResponse && !checkResponseTime()) {
      setPendingMessage(newMessage);
      setShowThoughtfulResponsePopup(true);
      return;
    }
    
    // Proceed with sending the message
    proceedWithSending(newMessage);
  };

  const proceedWithSending = (messageContent: string) => {
    sendMessageMutation.mutate({
      content: messageContent,
      type: nextMessageType,
    });

    // Reset response tracking
    setResponseStartTime(null);
    setHasStartedResponse(false);
    setPendingMessage("");
    setNewMessage("");
  };

  const handleThoughtfulResponseProceed = () => {
    setShowThoughtfulResponsePopup(false);
    proceedWithSending(pendingMessage);
  };

  const handleThoughtfulResponseClose = () => {
    setShowThoughtfulResponsePopup(false);
    setPendingMessage("");
  };

  const handleRecordingStart = () => {
    // Only start timer if this is not the inviter's first question
    const isInviterFirstQuestion = messages.length === 0 && 
                                   connection?.inviterEmail === user?.email &&
                                   nextMessageType === 'question';
    
    if (!isInviterFirstQuestion && !hasStartedResponse && !responseStartTime) {
      setHasStartedResponse(true);
      setResponseStartTime(new Date());
    }
  };

  const handleQuestionSelect = (question: string) => {
    setNewMessage(question);
  };

  const handleThreadSelect = (conversationId: number) => {
    setSelectedConversationId(conversationId);
    setNewMessage(""); // Clear message when switching threads
    setShowThreadsView(false); // Hide threads view on mobile after selection
    
    // Update the URL to reflect the selected conversation
    setLocation(`/conversation/${conversationId}`);
  };

  const handleNewThreadCreated = (conversationId: number) => {
    // Switch to the new conversation thread automatically
    setSelectedConversationId(conversationId);
    setNewMessage(""); // Clear any existing message
    
    // Update the URL to reflect the new conversation
    setLocation(`/conversation/${conversationId}`);
  };

  const handleNotificationPreferenceSet = (preference: "email" | "sms" | "both") => {
    const conversationId = selectedConversationId || parseInt(id || '0');
    setNotificationPreferenceMutation.mutate({
      conversationId,
      preference
    });
  };

  const handleNotificationPopupDismiss = (type: "never" | "later") => {
    const conversationId = selectedConversationId || parseInt(id || '0');
    dismissNotificationPopupMutation.mutate({
      conversationId,
      dismissType: type
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/dashboard")}
              className="flex items-center text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="flex -space-x-2">
                <ProfileAvatar
                  email={user?.email || ''}
                  firstName={currentUserData?.firstName}
                  lastName={currentUserData?.lastName}
                  profileImageUrl={currentUserData?.profileImageUrl}
                  size="sm"
                  className="border-2 border-white shadow-md z-10"
                />
                <ProfileAvatar
                  email={otherParticipant}
                  firstName={otherUserData?.firstName}
                  lastName={otherUserData?.lastName}
                  profileImageUrl={otherUserData?.profileImageUrl}
                  size="sm"
                  className="border-2 border-white shadow-md"
                />
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-sm">
                  {currentUserData?.firstName || user?.firstName || user?.email?.split('@')[0] || 'You'} & <UserDisplayName email={otherParticipant} />
                </div>
                <div className="text-xs text-slate-600">
                  {(() => {
                    if (connection) {
                      const roleInfo = getRoleDisplayInfo(
                        connection.relationshipType, 
                        connection.inviterRole, 
                        connection.inviteeRole
                      );
                      return roleInfo.relationshipDisplay;
                    }
                    
                    return conversation.relationshipType; // fallback
                  })()}
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

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-2">
        <div className="grid lg:grid-cols-4 gap-3 min-h-full">
          {/* Conversation Threads Sidebar */}
          <div className={`lg:col-span-1 ${showThreadsView ? 'block' : 'hidden lg:block'}`}>
            {conversation && connection && (
              <ConversationThreads
                connectionId={conversation.connectionId}
                currentUserEmail={user.email || ''}
                otherParticipantEmail={otherParticipant}
                relationshipType={conversation.relationshipType}
                onThreadSelect={handleThreadSelect}
                selectedConversationId={selectedConversationId || parseInt(id!)}
                isMyTurn={isMyTurn}
                isInviter={isInviter}
              />
            )}
          </div>

          {/* Main Conversation */}
          <div className={`lg:col-span-2 ${showThreadsView ? 'hidden lg:block' : 'block'} flex flex-col h-[calc(100vh-8rem)] overflow-hidden`}>
            {/* Hypnotic Orbs Background Effect with Floating Text */}
            {!isMyTurn && (
              <>
                <HypnoticOrbs className="absolute inset-0 z-0" />
                <FloatingWaitingText className="absolute inset-0 z-30" />
              </>
            )}
            <ConversationInterface 
              messages={messages}
              currentUserEmail={user.email || ''}
              participant1Email={conversation.participant1Email}
              participant2Email={conversation.participant2Email}
              isMyTurn={isMyTurn}
              relationshipType={conversation.relationshipType}
              connection={connection}

              newMessage={newMessage}
              setNewMessage={(message: string) => {
                setNewMessage(message);
                // Start timer when user begins typing (but not for inviter's first question)
                if (message.trim() && !hasStartedResponse) {
                  const isInviterFirstQuestion = messages.length === 0 && 
                                                 connection?.inviterEmail === user?.email &&
                                                 nextMessageType === 'question';
                  
                  if (!isInviterFirstQuestion) {
                    setHasStartedResponse(true);
                    setResponseStartTime(new Date());
                  }
                } else if (!message.trim() && hasStartedResponse) {
                  setHasStartedResponse(false);
                  setResponseStartTime(null);
                }
              }}
              onSendMessage={handleSendMessage}
              onQuestionSelect={handleQuestionSelect}
              onRecordingStart={handleRecordingStart}
              isSending={sendMessageMutation.isPending}
              nextMessageType={nextMessageType}
              conversationId={selectedConversationId || 0}
              hasStartedResponse={hasStartedResponse}
              responseStartTime={responseStartTime}
              onTimerStart={() => {
                // Check if this is the inviter's first question - skip timer for this case
                const isInviterFirstQuestion = messages.length === 0 && 
                                               connection?.inviterEmail === user?.email &&
                                               nextMessageType === 'question';
                
                if (!isInviterFirstQuestion) {
                  setHasStartedResponse(true);
                  setResponseStartTime(new Date());
                }
              }}
            />
          </div>

          {/* Question Suggestions Sidebar - Always visible */}
          <div className={`lg:col-span-1 ${showThreadsView ? 'hidden lg:block' : 'block'}`}>
            <QuestionSuggestions 
              relationshipType={conversation.relationshipType}
              userRole={currentUserRole || ''}
              otherUserRole={otherUserRole || ''}
              onQuestionSelect={handleQuestionSelect}
              isMyTurn={isMyTurn}
              otherParticipant={otherParticipant}
              connectionId={conversation.connectionId}
              onNewThreadCreated={handleNewThreadCreated}
              canUseRightColumn={canUseRightColumn}
              canCreateNewThread={canCreateNewThread}
              nextMessageType={nextMessageType}
            />
          </div>
        </div>
      </div>

      {/* Onboarding Popup */}
      {showOnboardingPopup && conversation && (
        <OnboardingPopup
          isOpen={showOnboardingPopup}
          onClose={() => setShowOnboardingPopup(false)}
          onComplete={() => markOnboardingCompleteMutation.mutate()}
          userRole={conversation.participant1Email === user?.email ? 'questioner' : 'responder'}
          otherParticipant={otherParticipant}
          relationshipType={conversation.relationshipType}
          inviterRole={connection?.inviterRole}
          inviteeRole={connection?.inviteeRole}
        />
      )}

      {/* Notification Preference Popup */}
      {showNotificationPopup && notificationPref && conversation && (
        <NotificationPreferencePopup
          conversationId={selectedConversationId || parseInt(id || '0')}
          currentPreference={notificationPref.globalPreference || "email"}
          onPreferenceSet={handleNotificationPreferenceSet}
          onDismiss={handleNotificationPopupDismiss}
        />
      )}

      {/* Thoughtful Response Popup */}
      <ThoughtfulResponsePopup
        isOpen={showThoughtfulResponsePopup}
        onClose={handleThoughtfulResponseClose}
        onProceed={handleThoughtfulResponseProceed}
        remainingSeconds={getRemainingTime()}
      />

      {/* Trial Expiration Popup */}
      <TrialExpirationPopup
        isOpen={showTrialExpirationPopup}
        onClose={() => setShowTrialExpirationPopup(false)}
        action="messaging"
      />
    </div>
  );
}
