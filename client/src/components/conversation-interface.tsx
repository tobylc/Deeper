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

  const JournalEntry = ({ message, index }: { message: Message; index: number }) => {
    const isFromCurrentUser = message.senderEmail === currentUserEmail;
    const userData = getParticipantData(message.senderEmail);
    const isQuestion = message.type === 'question';
    const isFirstMessage = index === 0;
    const isLastMessage = index === messages.length - 1;
    
    // After first question-response pair, all subsequent messages are "Follow up"
    const isFollowUp = messages.length >= 2 && index >= 2;
    const messageTypeLabel = isFollowUp ? "Follow up" : (isQuestion ? "Question" : "Response");
    
    // Subtle paper variations for authenticity
    const paperRotation = isFromCurrentUser ? 'rotate-1' : '-rotate-1';
    const paperShadow = index % 2 === 0 ? 'shadow-lg' : 'shadow-md';
    
    return (
      <div className={cn(
        "group mb-8 smooth-enter relative",
        isFromCurrentUser ? "ml-12" : "mr-12"
      )}>
        {/* Paper Sheet */}
        <div className={cn(
          "relative bg-gradient-to-br from-amber-50 to-yellow-50/80 p-6 transform transition-all duration-300 hover:scale-[1.02]",
          paperRotation,
          paperShadow,
          "shadow-amber-200/40",
          "border border-amber-100/60",
          isFromCurrentUser ? "rounded-tl-3xl rounded-tr-lg rounded-bl-lg rounded-br-3xl" : "rounded-tl-lg rounded-tr-3xl rounded-bl-3xl rounded-br-lg"
        )}>
          {/* Paper texture overlay */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,_rgba(139,69,19,0.1)_0%,_transparent_50%)] pointer-events-none" />
          
          {/* Subtle ruled lines effect */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{
                 backgroundImage: 'repeating-linear-gradient(transparent, transparent 24px, rgba(139,69,19,0.3) 24px, rgba(139,69,19,0.3) 25px)',
               }} />
          
          {/* Red margin line */}
          <div className={cn(
            "absolute top-0 bottom-0 w-px bg-red-300/60",
            isFromCurrentUser ? "left-12" : "right-12"
          )} />
          
          {/* Three-hole punch effect */}
          <div className={cn(
            "absolute top-6 w-3 h-3 rounded-full bg-white shadow-inner border border-slate-200",
            isFromCurrentUser ? "-left-1.5" : "-right-1.5"
          )} />
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-inner border border-slate-200",
            isFromCurrentUser ? "-left-1.5" : "-right-1.5"
          )} />
          <div className={cn(
            "absolute bottom-6 w-3 h-3 rounded-full bg-white shadow-inner border border-slate-200",
            isFromCurrentUser ? "-left-1.5" : "-right-1.5"
          )} />

          {/* Journal Header */}
          <div className={cn(
            "flex items-start justify-between mb-4 relative z-10",
            isFromCurrentUser ? "pl-6" : "pr-6"
          )}>
            <div className="flex items-center space-x-3">
              <ProfileAvatar
                email={message.senderEmail}
                firstName={userData?.firstName ?? undefined}
                lastName={userData?.lastName ?? undefined}
                profileImageUrl={userData?.profileImageUrl ?? undefined}
                size="sm"
                className="shadow-md border-2 border-white"
              />
              <div>
                <div className="text-sm font-semibold text-slate-800 font-serif">
                  <UserDisplayName email={message.senderEmail} />
                </div>
                <div className="text-xs text-slate-600 italic">
                  {formatDistanceToNow(new Date(message.createdAt!), { addSuffix: true })}
                </div>
              </div>
            </div>
            
            {/* Message type label - handwritten style */}
            <div className={cn(
              "px-2 py-1 text-xs font-handwriting transform -rotate-12 relative",
              isFollowUp
                ? "text-slate-600 bg-slate-100/50 border border-slate-200"
                : isQuestion 
                  ? "text-ocean bg-ocean/10 border border-ocean/30" 
                  : "text-amber-700 bg-amber/20 border border-amber/40",
              "rounded-lg shadow-sm"
            )}>
              {isFollowUp ? "Follow up" : isQuestion ? "Question" : "Response"}
              {/* Small arrow pointing to content */}
              <div className={cn(
                "absolute w-2 h-2 rotate-45 border-r border-b",
                "top-full left-1/2 -translate-x-1/2 -mt-1",
                isFollowUp ? "border-slate-200 bg-slate-100/50" : isQuestion ? "border-ocean/30 bg-ocean/10" : "border-amber/40 bg-amber/20"
              )} />
            </div>
          </div>

          {/* Journal Content - handwritten style */}
          <div className={cn(
            "relative z-10 text-slate-800 leading-relaxed font-serif text-base",
            isFromCurrentUser ? "pl-6" : "pr-6"
          )}>
            <div className="relative">
              {/* Subtle ink bleed effect */}
              <div className="absolute -inset-1 opacity-5 bg-gradient-to-r from-blue-600 to-indigo-600 blur-sm pointer-events-none" />
              
              {/* Main text content */}
              <div className="relative italic text-slate-700 whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          </div>
          
          {/* Decorative flourish */}
          <div className={cn(
            "absolute bottom-2 opacity-30",
            isFromCurrentUser ? "right-4" : "left-4"
          )}>
            <svg width="24" height="16" viewBox="0 0 24 16" className="text-amber-600">
              <path d="M2 8c0 0 4-6 10-6s10 6 10 6-4 6-10 6S2 8 2 8z" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M8 8h8M6 6l2 2-2 2M18 6l-2 2 2 2" stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
            </svg>
          </div>
        </div>
        
        {/* Paper clip effect for special messages */}
        {(isFirstMessage || isLastMessage) && (
          <div className={cn(
            "absolute -top-2 w-8 h-4 bg-gradient-to-b from-slate-300 to-slate-400 rounded-t-lg border border-slate-400 shadow-sm",
            isFromCurrentUser ? "-right-2" : "-left-2"
          )}>
            <div className="absolute inset-1 bg-gradient-to-b from-slate-200 to-slate-300 rounded-t-md" />
          </div>
        )}
      </div>
    );
  };

  const TypingIndicator = () => (
    <div className="group mb-8 smooth-enter relative mr-12">
      {/* Paper Sheet - slightly different for typing */}
      <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50/80 p-6 transform -rotate-1 shadow-md shadow-blue-200/40 border border-blue-100/60 rounded-tl-lg rounded-tr-3xl rounded-bl-3xl rounded-br-lg transition-all duration-300">
        {/* Paper texture overlay */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1)_0%,_transparent_50%)] pointer-events-none" />
        
        {/* Subtle ruled lines effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{
               backgroundImage: 'repeating-linear-gradient(transparent, transparent 24px, rgba(59,130,246,0.3) 24px, rgba(59,130,246,0.3) 25px)',
             }} />
        
        {/* Red margin line */}
        <div className="absolute top-0 bottom-0 w-px bg-red-300/60 right-12" />
        
        {/* Three-hole punch effect */}
        <div className="absolute top-6 w-3 h-3 rounded-full bg-white shadow-inner border border-slate-200 -right-1.5" />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-inner border border-slate-200 -right-1.5" />
        <div className="absolute bottom-6 w-3 h-3 rounded-full bg-white shadow-inner border border-slate-200 -right-1.5" />

        {/* Journal Header */}
        <div className="flex items-start justify-between mb-4 relative z-10 pr-6">
          <div className="flex items-center space-x-3">
            <ProfileAvatar
              email={otherParticipantEmail}
              firstName={otherUser?.firstName ?? undefined}
              lastName={otherUser?.lastName ?? undefined}
              profileImageUrl={otherUser?.profileImageUrl ?? undefined}
              size="sm"
              className="shadow-md border-2 border-white"
            />
            <div>
              <div className="text-sm font-semibold text-slate-800 font-serif">
                <UserDisplayName email={otherParticipantEmail} />
              </div>
              <div className="text-xs text-slate-600 italic">
                writing...
              </div>
            </div>
          </div>
          
          {/* Thinking label */}
          <div className="px-2 py-1 text-xs transform -rotate-12 relative text-blue-600 bg-blue/10 border border-blue/30 rounded-lg shadow-sm">
            Thinking
            <div className="absolute w-2 h-2 rotate-45 border-r border-b top-full left-1/2 -translate-x-1/2 -mt-1 border-blue/30 bg-blue/10" />
          </div>
        </div>

        {/* Animated writing content */}
        <div className="relative z-10 text-slate-800 leading-relaxed font-serif text-base pr-6">
          <div className="relative">
            {/* Animated dots simulating writing */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              <span className="text-sm text-slate-500 italic ml-2">composing thoughts...</span>
            </div>
          </div>
        </div>
        
        {/* Decorative flourish */}
        <div className="absolute bottom-2 left-4 opacity-30">
          <svg width="24" height="16" viewBox="0 0 24 16" className="text-blue-600">
            <path d="M2 8c0 0 4-6 10-6s10 6 10 6-4 6-10 6S2 8 2 8z" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <path d="M8 8h8M6 6l2 2-2 2M18 6l-2 2 2 2" stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
          </svg>
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

      {/* Messages Container - Journal Workspace */}
      <div className="flex-1 overflow-y-auto p-8 min-h-0 relative bg-gradient-to-br from-amber-50/40 via-yellow-50/30 to-orange-50/20">
        {/* Wood desk texture background */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_rgba(139,69,19,0.4)_0%,_transparent_70%)]" />
        
        {/* Subtle paper scattered texture */}
        <div className="absolute inset-0 opacity-10" 
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4a574' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
             }} />

        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6 relative z-10">
            {messages.map((message, index) => (
              <JournalEntry key={message.id} message={message} index={index} />
            ))}
            
            {/* Typing Indicator */}
            {messages.length > 0 && messages[messages.length - 1]?.type === 'question' && 
             messages[messages.length - 1]?.senderEmail !== currentUserEmail && !isMyTurn && (
              <TypingIndicator />
            )}
          </div>
        )}
      </div>

      {/* Journal Writing Area */}
      {isMyTurn && (
        <div className="border-t border-amber-200/60 p-6 bg-gradient-to-br from-amber-50/60 via-yellow-50/40 to-orange-50/30 backdrop-blur-sm flex-shrink-0 relative">
          {/* Paper texture overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,_rgba(139,69,19,0.1)_0%,_transparent_50%)] pointer-events-none" />
          
          {/* Subtle ruled lines effect */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" 
               style={{
                 backgroundImage: 'repeating-linear-gradient(transparent, transparent 24px, rgba(139,69,19,0.3) 24px, rgba(139,69,19,0.3) 25px)',
               }} />

          <div className="space-y-4 relative z-10">
            {/* Writing prompt */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "px-3 py-2 text-sm font-handwriting transform -rotate-1 relative shadow-sm",
                  messages.length >= 2
                    ? "text-slate-600 bg-slate-100/80 border border-slate-200"
                    : nextMessageType === 'question' 
                      ? "text-ocean bg-ocean/10 border border-ocean/30" 
                      : "text-amber-700 bg-amber/20 border border-amber/40",
                  "rounded-lg"
                )}>
                  {messages.length >= 2 ? "Continue writing..." : nextMessageType === 'question' ? "Ask a question..." : "Share your thoughts..."}
                </div>
                
                <div className="text-xs text-slate-600 italic font-serif">
                  {messages.length >= 2
                    ? "Let your thoughts flow naturally onto the page"
                    : nextMessageType === 'question' 
                      ? "What would you like to explore together?"
                      : "Express what's in your heart"
                  }
                </div>
              </div>
            </div>

            {/* Writing Surface */}
            <div className="relative">
              {/* Paper sheet for writing */}
              <div className="relative bg-gradient-to-br from-white to-yellow-50/60 p-6 border border-amber-100/60 shadow-md transform rotate-0 hover:rotate-0 transition-transform duration-300 rounded-lg">
                {/* Red margin line */}
                <div className="absolute top-0 bottom-0 w-px bg-red-300/60 left-8" />
                
                {/* Ruled lines background */}
                <div className="absolute inset-0 opacity-15 pointer-events-none rounded-lg" 
                     style={{
                       backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(139,69,19,0.4) 23px, rgba(139,69,19,0.4) 24px)',
                     }} />

                <div className="flex space-x-4">
                  <div className="flex-1 pl-4">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={
                        messages.length >= 2
                          ? "Continue writing your thoughts here..."
                          : nextMessageType === 'question' 
                            ? "Write your question here... or choose from suggestions →" 
                            : "Write your response here..."
                      }
                      className="min-h-[80px] resize-none bg-transparent border-0 focus:ring-0 text-slate-700 font-serif text-base leading-6 placeholder:text-slate-400/70 placeholder:italic"
                      style={{ backgroundImage: 'none' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (newMessage.trim() && !isSending) {
                            onSendMessage();
                          }
                        }
                      }}
                      maxLength={500}
                    />
                    
                    {/* Writing stats */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-200/40">
                      <div className="text-xs text-slate-500 italic">
                        {newMessage.length} characters written
                      </div>
                      <div className="text-xs text-slate-400 italic">
                        Press Enter to share • Shift+Enter for new line
                      </div>
                    </div>
                  </div>
                  
                  {/* Send button styled as ink well */}
                  <div className="flex flex-col items-center space-y-2">
                    <Button
                      onClick={onSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className={cn(
                        "w-16 h-16 rounded-full bg-gradient-to-br from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue/25 transition-all duration-200 border-2 border-blue-700",
                        (!newMessage.trim() || isSending) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isSending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                    <span className="text-xs text-slate-600 font-handwriting">Share</span>
                  </div>
                </div>
              </div>
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
