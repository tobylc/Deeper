import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, ArrowRight, Sparkles, Clock, Send, Plus } from "lucide-react";
import DeeperLogo from "@/components/deeper-logo";
import QuotesIcon from "@/components/quotes-icon";
import type { Message, User } from "@shared/schema";
import { UserDisplayName } from "@/hooks/useUserDisplayName";
import ProfileAvatar from "@/components/profile-avatar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface ConversationInterfaceProps {
  messages: Message[];
  currentUserEmail: string;
  participant1Email: string;
  participant2Email: string;
  isMyTurn: boolean;
  relationshipType: string;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  onQuestionSelect: (question: string) => void;
  isSending: boolean;
  nextMessageType: 'question' | 'response';
}

export default function ConversationInterface({ 
  messages, 
  currentUserEmail, 
  participant1Email, 
  participant2Email,
  isMyTurn,
  relationshipType,
  newMessage,
  setNewMessage,
  onSendMessage,
  onQuestionSelect,
  isSending,
  nextMessageType
}: ConversationInterfaceProps) {
  // Fetch user data for profile avatars
  const { data: currentUser } = useQuery<User>({
    queryKey: [`/api/users/by-email/${currentUserEmail}`],
    enabled: !!currentUserEmail,
  });

  const otherParticipantEmail = currentUserEmail === participant1Email ? participant2Email : participant1Email;
  
  const { data: otherUser } = useQuery<User>({
    queryKey: [`/api/users/by-email/${otherParticipantEmail}`],
    enabled: !!otherParticipantEmail,
  });

  const getParticipantName = (email: string) => {
    if (email === currentUserEmail) return "You";
    return <UserDisplayName email={email} />;
  };

  const getParticipantData = (email: string) => {
    if (email === currentUserEmail) return currentUser;
    return otherUser;
  };

  // Sample questions based on relationship type for empty state
  const getExampleQuestions = (relationshipType: string): string[] => {
    const examples = {
      "Parent-Child": [
        "What's one family tradition you hope to continue?",
        "When did you feel most proud of me recently?",
        "What was your biggest worry as a teenager?"
      ],
      "Romantic Partners": [
        "What's something new you'd like us to try together?",
        "When do you feel most loved by me?",
        "What's your happiest memory of us?"
      ],
      "Friends": [
        "What's the best advice you've ever received?",
        "What adventure would you want us to go on?",
        "How have you changed in the past year?"
      ],
      "Siblings": [
        "What's your favorite childhood memory of us?",
        "How do you think we've influenced each other?",
        "What family trait do you see in yourself?"
      ]
    };
    
    return examples[relationshipType as keyof typeof examples] || examples["Friends"];
  };

  const EmptyState = () => {
    const exampleQuestions = getExampleQuestions(relationshipType);
    
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 px-6">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-ocean/20 to-amber/20 rounded-full blur-xl"></div>
          <div className="relative bg-gradient-to-br from-ocean to-amber p-4 rounded-2xl shadow-xl">
            <Sparkles className="h-8 w-8 text-white animate-pulse" />
          </div>
        </div>
        
        {isMyTurn ? (
          <div className="text-center space-y-6 max-w-lg w-full">
            <h3 className="text-xl font-bold bg-gradient-to-r from-ocean to-amber bg-clip-text text-transparent">
              Begin Your Journey
            </h3>
            <p className="text-slate-600 leading-relaxed">
              You're about to start a meaningful {relationshipType.toLowerCase()} conversation. 
              Ask the first question to begin this deeper connection.
            </p>
            
            {/* Example Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2 text-sm text-amber">
                <QuotesIcon size="sm" />
                <span className="font-medium">Try one of these conversation starters:</span>
              </div>
              <div className="space-y-2">
                {exampleQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => onQuestionSelect(question)}
                    className="w-full p-3 text-left bg-white border border-slate-200 hover:border-ocean/30 hover:bg-ocean/5 rounded-xl transition-all duration-200 text-sm text-slate-700 hover:text-slate-900 shadow-sm hover:shadow-md"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
              <QuotesIcon size="xs" />
              <span>Every great conversation starts with curiosity</span>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 max-w-md">
            <h3 className="text-xl font-bold bg-gradient-to-r from-ocean to-amber bg-clip-text text-transparent">
              Waiting for Magic
            </h3>
            <p className="text-slate-600 leading-relaxed">
              <UserDisplayName email={otherParticipantEmail} /> is preparing the first question. 
              Great conversations are worth the wait.
            </p>
            <div className="flex items-center justify-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-ocean rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-ocean rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-ocean rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
              <span className="text-sm text-ocean/80">Anticipating...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const MessageBubble = ({ message, index }: { message: Message; index: number }) => {
    const isFromCurrentUser = message.senderEmail === currentUserEmail;
    const userData = getParticipantData(message.senderEmail);
    const isQuestion = message.type === 'question';
    const isFirstMessage = index === 0;
    const isLastMessage = index === messages.length - 1;
    
    return (
      <div className={cn(
        "group flex items-end space-x-3 mb-6 smooth-enter",
        isFromCurrentUser ? "flex-row-reverse space-x-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          <ProfileAvatar
            email={message.senderEmail}
            firstName={userData?.firstName ?? undefined}
            lastName={userData?.lastName ?? undefined}
            profileImageUrl={userData?.profileImageUrl ?? undefined}
            size="md"
            className="shadow-lg border-2 border-white/20"
          />
        </div>

        {/* Message Content */}
        <div className={cn(
          "max-w-md relative",
          isFromCurrentUser ? "items-end" : "items-start"
        )}>
          {/* Message Type Indicator */}
          <div className={cn(
            "flex items-center space-x-2 mb-2",
            isFromCurrentUser ? "justify-end" : "justify-start"
          )}>
            <Badge 
              variant={isQuestion ? "default" : "secondary"} 
              className={cn(
                "text-xs font-medium shadow-sm",
                isQuestion 
                  ? "bg-gradient-to-r from-ocean to-ocean/80 text-white border-0" 
                  : "bg-gradient-to-r from-amber/20 to-amber/10 text-amber-800 border-amber/30"
              )}
            >
              {isQuestion ? (
                <>
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Question
                </>
              ) : (
                <>
                  <QuotesIcon size="sm" className="mr-1" />
                  Response
                </>
              )}
            </Badge>
            <span className="text-xs text-slate-500 font-medium">
              <UserDisplayName email={message.senderEmail} />
            </span>
          </div>

          {/* Message Bubble */}
          <div className={cn(
            "relative p-4 rounded-2xl shadow-lg border-0",
            isFromCurrentUser 
              ? cn(
                  "bg-ocean text-white",
                  "rounded-br-md"
                )
              : cn(
                  "bg-slate-600 text-white",
                  "rounded-bl-md"
                ),
            isFirstMessage && "animate-in slide-in-from-bottom-4 duration-500",
            isLastMessage && "ring-2 ring-ocean/20 ring-offset-2"
          )}>
            {/* Content */}
            <div className="text-sm leading-relaxed text-white">
              {message.content}
            </div>

            {/* Timestamp */}
            <div className="flex items-center space-x-1 mt-3 text-xs text-white/80">
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(message.createdAt!), { addSuffix: true })}</span>
            </div>

            {/* Message bubble tail */}
            <div className={cn(
              "absolute w-3 h-3 rotate-45",
              isFromCurrentUser 
                ? "bg-ocean bottom-0 right-0 translate-x-1 translate-y-1" 
                : "bg-slate-600 bottom-0 left-0 -translate-x-1 translate-y-1"
            )} />
          </div>
        </div>
      </div>
    );
  };

  const TypingIndicator = () => (
    <div className="flex items-end space-x-3 mb-6">
      <ProfileAvatar
        email={otherParticipantEmail}
        firstName={otherUser?.firstName ?? undefined}
        lastName={otherUser?.lastName ?? undefined}
        profileImageUrl={otherUser?.profileImageUrl ?? undefined}
        size="md"
        className="shadow-lg border-2 border-white/20"
      />
      
      <div className="bg-slate-600 p-4 rounded-2xl rounded-bl-md shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
          <span className="text-sm text-white font-medium">
            <UserDisplayName email={otherParticipantEmail} /> is thinking...
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Conversation Header */}
      <div className="border-b border-slate-200/60 p-4 bg-gradient-to-r from-slate-50/50 to-white/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex -space-x-2">
              <ProfileAvatar
                email={participant1Email}
                firstName={currentUserEmail === participant1Email ? currentUser?.firstName ?? undefined : otherUser?.firstName ?? undefined}
                lastName={currentUserEmail === participant1Email ? currentUser?.lastName ?? undefined : otherUser?.lastName ?? undefined}
                profileImageUrl={currentUserEmail === participant1Email ? currentUser?.profileImageUrl ?? undefined : otherUser?.profileImageUrl ?? undefined}
                size="sm"
                className="border-2 border-white shadow-lg z-10"
              />
              <ProfileAvatar
                email={participant2Email}
                firstName={currentUserEmail === participant2Email ? currentUser?.firstName ?? undefined : otherUser?.firstName ?? undefined}
                lastName={currentUserEmail === participant2Email ? currentUser?.lastName ?? undefined : otherUser?.lastName ?? undefined}
                profileImageUrl={currentUserEmail === participant2Email ? currentUser?.profileImageUrl ?? undefined : otherUser?.profileImageUrl ?? undefined}
                size="sm"
                className="border-2 border-white shadow-lg"
              />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                {relationshipType} Conversation
              </h3>
              <p className="text-xs text-slate-500">
                {messages.length} exchanges • Deeper connection
              </p>
            </div>
          </div>
          
          <Badge 
            variant={isMyTurn ? "default" : "outline"} 
            className={cn(
              "shadow-sm font-medium px-3 py-1 text-xs",
              isMyTurn 
                ? "bg-gradient-to-r from-ocean to-ocean/80 text-white border-0 shadow-ocean/20" 
                : "bg-gradient-to-r from-amber/10 to-amber/5 border-amber/30 text-amber-800"
            )}
          >
            {isMyTurn ? "Your turn" : "Their turn"}
          </Badge>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-slate-50/30 via-white/50 to-slate-50/30 min-h-0">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-0">
            {messages.map((message, index) => (
              <MessageBubble key={message.id} message={message} index={index} />
            ))}
            
            {/* Typing Indicator */}
            {messages.length > 0 && messages[messages.length - 1]?.type === 'question' && 
             messages[messages.length - 1]?.senderEmail !== currentUserEmail && !isMyTurn && (
              <TypingIndicator />
            )}
          </div>
        )}
      </div>

      {/* Message Input Area */}
      {isMyTurn && (
        <div className="border-t border-slate-200/60 p-4 bg-gradient-to-r from-slate-50/50 to-white/50 backdrop-blur-sm flex-shrink-0">
          <div className="space-y-3">
            {/* Message Type Indicator */}
            <div className="flex items-center justify-between">
              <Badge 
                variant="outline" 
                className={cn(
                  "border-slate-300 text-slate-700 font-medium text-xs",
                  nextMessageType === 'question' 
                    ? "bg-ocean/10 border-ocean/30 text-ocean" 
                    : "bg-amber/10 border-amber/30 text-amber-800"
                )}
              >
                {nextMessageType === 'question' ? (
                  <>
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Your Question
                  </>
                ) : (
                  <>
                    <QuotesIcon size="sm" className="mr-1" />
                    Your Response
                  </>
                )}
              </Badge>
              
              <div className="text-xs text-slate-600">
                {nextMessageType === 'question' 
                  ? "Ask something meaningful to deepen your connection"
                  : "Share your thoughts and continue the conversation"
                }
              </div>
            </div>

            {/* Input Area */}
            <div className="flex space-x-3">
              <div className="flex-1">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    nextMessageType === 'question' 
                      ? "Type your question or click a suggestion from the right sidebar..." 
                      : "Share your response..."
                  }
                  className="min-h-[60px] resize-none bg-white/80 backdrop-blur-sm border-slate-200/60 focus:border-ocean/50 focus:ring-ocean/20 rounded-xl text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSendMessage();
                    }
                  }}
                  maxLength={500}
                />
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={onSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className={cn(
                    "h-10 w-10 rounded-xl shadow-lg transition-all duration-200 border-0 group",
                    newMessage.trim() 
                      ? "bg-gradient-to-r from-ocean to-ocean/80 hover:from-ocean/90 hover:to-ocean/70 hover:shadow-xl hover:scale-105" 
                      : "bg-gradient-to-r from-ocean/60 to-ocean/40 cursor-default",
                    isSending && "animate-pulse"
                  )}
                >
                  {isSending ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className={cn(
                      "h-3 w-3 text-white transition-transform duration-200",
                      newMessage.trim() && "group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    )} />
                  )}
                </Button>
              </div>
            </div>

            {/* Character Count */}
            <div className="text-xs text-slate-500 text-right">
              {newMessage.length}/500 characters
            </div>
          </div>
        </div>
      )}

      {/* Turn Status for Non-Turn */}
      {!isMyTurn && (
        <div className="border-t border-slate-200/60 p-4 bg-gradient-to-r from-slate-50/50 to-white/50 backdrop-blur-sm flex-shrink-0">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-ocean rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-ocean rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-ocean rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
              <span className="text-sm text-slate-700 font-medium">
                Waiting for <UserDisplayName email={otherParticipantEmail} />
              </span>
            </div>
            <p className="text-xs text-slate-600">
              You'll be notified when it's your turn to respond
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
