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
    
    // Unique paper variations for each message
    const paperRotations = ['rotate-1', '-rotate-1', 'rotate-2', '-rotate-2', 'rotate-0.5', '-rotate-0.5'];
    const paperRotation = paperRotations[index % paperRotations.length];
    const paperShadow = index % 3 === 0 ? 'shadow-lg' : index % 3 === 1 ? 'shadow-md' : 'shadow-sm';
    
    // Generate unique tattered edge shapes for each paper
    const tatteredEdges = [
      "polygon(2% 0%, 98% 3%, 99% 8%, 100% 15%, 97% 22%, 100% 30%, 98% 40%, 100% 50%, 97% 60%, 99% 70%, 100% 85%, 95% 92%, 98% 100%, 5% 100%, 0% 95%, 3% 88%, 0% 78%, 2% 70%, 0% 60%, 3% 50%, 0% 40%, 2% 30%, 0% 20%, 3% 10%, 0% 5%)",
      "polygon(0% 2%, 5% 0%, 15% 3%, 25% 0%, 35% 2%, 45% 0%, 55% 3%, 65% 0%, 75% 2%, 85% 0%, 95% 3%, 100% 8%, 98% 18%, 100% 28%, 97% 38%, 100% 48%, 98% 58%, 100% 68%, 97% 78%, 100% 88%, 95% 97%, 85% 100%, 75% 98%, 65% 100%, 55% 97%, 45% 100%, 35% 98%, 25% 100%, 15% 97%, 5% 100%, 0% 92%)",
      "polygon(3% 0%, 10% 2%, 18% 0%, 28% 3%, 38% 0%, 48% 2%, 58% 0%, 68% 3%, 78% 0%, 88% 2%, 97% 0%, 100% 7%, 98% 17%, 100% 27%, 97% 37%, 100% 47%, 98% 57%, 100% 67%, 97% 77%, 100% 87%, 97% 97%, 88% 100%, 78% 98%, 68% 100%, 58% 97%, 48% 100%, 38% 98%, 28% 100%, 18% 97%, 10% 100%, 3% 98%, 0% 87%)",
      "polygon(0% 5%, 8% 0%, 18% 4%, 28% 0%, 38% 3%, 48% 0%, 58% 4%, 68% 0%, 78% 3%, 88% 0%, 98% 4%, 100% 12%, 97% 22%, 100% 32%, 96% 42%, 100% 52%, 97% 62%, 100% 72%, 96% 82%, 100% 92%, 92% 100%, 82% 96%, 72% 100%, 62% 97%, 52% 100%, 42% 96%, 32% 100%, 22% 97%, 12% 100%, 2% 96%, 0% 85%)",
      "polygon(4% 0%, 14% 3%, 24% 0%, 34% 4%, 44% 0%, 54% 3%, 64% 0%, 74% 4%, 84% 0%, 94% 3%, 100% 9%, 96% 19%, 100% 29%, 97% 39%, 100% 49%, 96% 59%, 100% 69%, 97% 79%, 100% 89%, 94% 97%, 84% 100%, 74% 96%, 64% 100%, 54% 97%, 44% 100%, 34% 96%, 24% 100%, 14% 97%, 4% 100%, 0% 91%)",
      "polygon(1% 3%, 11% 0%, 21% 4%, 31% 0%, 41% 3%, 51% 0%, 61% 4%, 71% 0%, 81% 3%, 91% 0%, 99% 3%, 100% 13%, 97% 23%, 100% 33%, 96% 43%, 100% 53%, 97% 63%, 100% 73%, 96% 83%, 100% 93%, 91% 100%, 81% 97%, 71% 100%, 61% 96%, 51% 100%, 41% 97%, 31% 100%, 21% 96%, 11% 100%, 1% 97%, 0% 83%)"
    ];
    const clipPath = tatteredEdges[index % tatteredEdges.length];
    
    return (
      <div className={cn(
        "group mb-8 relative",
        isFromCurrentUser ? "ml-12" : "mr-12"
      )}>
        {/* Parchment Sheet */}
        <div className={cn(
          "relative bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-orange-50/60 p-6 transform",
          paperRotation,
          paperShadow,
          "shadow-amber-300/50",
          "border-0"
        )}
        style={{
          clipPath: clipPath,
          filter: 'drop-shadow(2px 4px 8px rgba(139, 69, 19, 0.15))'
        }}>
          {/* Aged parchment texture overlay */}
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_rgba(160,82,45,0.1)_0%,_rgba(210,180,140,0.05)_50%,_transparent_100%)] pointer-events-none" />
          
          {/* Coffee stains and aging effects - unique for each paper */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {/* Generate unique stains based on index */}
            {index % 6 === 0 && (
              <>
                <div className="absolute top-4 right-8 w-6 h-6 rounded-full bg-gradient-radial from-amber-300/30 to-transparent"></div>
                <div className="absolute bottom-6 left-10 w-4 h-4 rounded-full bg-gradient-radial from-amber-400/20 to-transparent"></div>
                <div className="absolute top-1/3 left-1/4 w-8 h-3 rounded-full bg-gradient-radial from-amber-200/15 to-transparent transform rotate-45"></div>
              </>
            )}
            {index % 6 === 1 && (
              <>
                <div className="absolute top-8 left-6 w-5 h-7 rounded-full bg-gradient-radial from-amber-400/25 to-transparent transform rotate-12"></div>
                <div className="absolute bottom-4 right-12 w-3 h-3 rounded-full bg-gradient-radial from-amber-300/30 to-transparent"></div>
                <div className="absolute top-2/3 right-1/3 w-6 h-4 rounded-full bg-gradient-radial from-amber-200/20 to-transparent transform -rotate-30"></div>
              </>
            )}
            {index % 6 === 2 && (
              <>
                <div className="absolute top-6 right-4 w-4 h-8 rounded-full bg-gradient-radial from-amber-500/20 to-transparent transform -rotate-45"></div>
                <div className="absolute bottom-8 left-6 w-7 h-5 rounded-full bg-gradient-radial from-amber-300/25 to-transparent"></div>
                <div className="absolute top-1/4 left-1/2 w-3 h-6 rounded-full bg-gradient-radial from-amber-400/15 to-transparent transform rotate-60"></div>
              </>
            )}
            {index % 6 === 3 && (
              <>
                <div className="absolute top-10 left-8 w-8 h-4 rounded-full bg-gradient-radial from-amber-300/35 to-transparent transform rotate-75"></div>
                <div className="absolute bottom-5 right-6 w-5 h-5 rounded-full bg-gradient-radial from-amber-400/25 to-transparent"></div>
                <div className="absolute top-1/2 right-1/4 w-4 h-7 rounded-full bg-gradient-radial from-amber-200/20 to-transparent transform -rotate-15"></div>
              </>
            )}
            {index % 6 === 4 && (
              <>
                <div className="absolute top-3 right-10 w-6 h-5 rounded-full bg-gradient-radial from-amber-400/30 to-transparent transform rotate-30"></div>
                <div className="absolute bottom-10 left-4 w-4 h-6 rounded-full bg-gradient-radial from-amber-300/20 to-transparent"></div>
                <div className="absolute top-2/5 left-2/3 w-5 h-4 rounded-full bg-gradient-radial from-amber-500/15 to-transparent transform -rotate-60"></div>
              </>
            )}
            {index % 6 === 5 && (
              <>
                <div className="absolute top-5 left-12 w-7 h-6 rounded-full bg-gradient-radial from-amber-300/25 to-transparent transform -rotate-20"></div>
                <div className="absolute bottom-3 right-8 w-3 h-4 rounded-full bg-gradient-radial from-amber-400/30 to-transparent"></div>
                <div className="absolute top-3/4 left-1/3 w-6 h-3 rounded-full bg-gradient-radial from-amber-200/20 to-transparent transform rotate-45"></div>
              </>
            )}
            
            {/* Random burn marks and tears */}
            {index % 4 === 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-amber-800/10 rounded-full"></div>
            )}
            {index % 3 === 1 && (
              <div className="absolute bottom-2 left-2 w-1 h-3 bg-amber-700/15 transform rotate-45"></div>
            )}
            {index % 5 === 2 && (
              <div className="absolute top-1/2 right-1 w-1 h-4 bg-amber-600/10 transform -rotate-30"></div>
            )}
          </div>
          
          {/* Subtle ruled lines effect - more organic */}
          <div className="absolute inset-0 opacity-8 pointer-events-none" 
               style={{
                 backgroundImage: 'repeating-linear-gradient(transparent, transparent 26px, rgba(139,69,19,0.2) 26px, rgba(139,69,19,0.2) 27px)',
               }} />
          
          {/* Faded margin line */}
          <div className={cn(
            "absolute top-0 bottom-0 w-px bg-gradient-to-b from-red-300/40 via-red-300/60 to-red-300/30",
            isFromCurrentUser ? "left-12" : "right-12"
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
      </div>
    );
  };

  const TypingIndicator = () => (
    <div className="group mb-8 smooth-enter relative mr-12">
      {/* Parchment Sheet - typing variant */}
      <div className="relative bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-purple-50/60 p-6 transform -rotate-1 shadow-md shadow-blue-300/40 transition-all duration-300"
           style={{
             clipPath: "polygon(5% 0%, 100% 5%, 100% 95%, 92% 100%, 5% 100%, 0% 92%, 0% 8%, 5% 0%)",
             filter: 'drop-shadow(2px 4px 8px rgba(59, 130, 246, 0.15))'
           }}>
        {/* Aged parchment texture overlay - blue tinted */}
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08)_0%,_rgba(147,197,253,0.05)_50%,_transparent_100%)] pointer-events-none" />
        
        {/* Subtle coffee stains */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute top-6 right-10 w-5 h-5 rounded-full bg-gradient-radial from-blue-300/20 to-transparent"></div>
          <div className="absolute bottom-8 left-8 w-3 h-3 rounded-full bg-gradient-radial from-indigo-400/15 to-transparent"></div>
        </div>
        
        {/* Subtle ruled lines effect */}
        <div className="absolute inset-0 opacity-8 pointer-events-none" 
             style={{
               backgroundImage: 'repeating-linear-gradient(transparent, transparent 26px, rgba(59,130,246,0.15) 26px, rgba(59,130,246,0.15) 27px)',
             }} />
        
        {/* Faded margin line */}
        <div className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-red-300/30 via-red-300/50 to-red-300/25 right-12" />

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
          <div className="px-2 py-1 text-xs font-handwriting transform -rotate-12 relative text-blue-600 bg-blue/10 border border-blue/30 rounded-lg shadow-sm">
            Thinking
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

      {/* Beautiful Waiting State */}
      {!isMyTurn && (
        <div className="border-t border-amber-200/60 p-6 bg-gradient-to-br from-amber-50/60 via-yellow-50/40 to-orange-50/30 backdrop-blur-sm flex-shrink-0 relative">
          {/* Paper texture overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,_rgba(139,69,19,0.1)_0%,_transparent_50%)] pointer-events-none" />
          
          {/* Subtle ruled lines effect */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" 
               style={{
                 backgroundImage: 'repeating-linear-gradient(transparent, transparent 24px, rgba(139,69,19,0.3) 24px, rgba(139,69,19,0.3) 25px)',
               }} />

          <div className="relative z-10">
            {/* Elegant waiting parchment */}
            <div className="relative bg-gradient-to-br from-white to-yellow-50/60 p-6 border border-amber-100/60 shadow-md transform rotate-0 transition-transform duration-300 rounded-lg max-w-md mx-auto"
                 style={{
                   clipPath: "polygon(5% 0%, 100% 3%, 97% 100%, 0% 95%)",
                   filter: 'drop-shadow(2px 4px 8px rgba(139, 69, 19, 0.15))'
                 }}>
              {/* Aged parchment texture */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_rgba(160,82,45,0.08)_0%,_rgba(210,180,140,0.05)_50%,_transparent_100%)] pointer-events-none rounded-lg" />
              
              {/* Subtle aging stains */}
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                <div className="absolute top-4 right-6 w-4 h-4 rounded-full bg-gradient-radial from-amber-300/20 to-transparent"></div>
                <div className="absolute bottom-4 left-8 w-3 h-3 rounded-full bg-gradient-radial from-amber-400/15 to-transparent"></div>
              </div>
              
              {/* Red margin line */}
              <div className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-red-300/40 via-red-300/60 to-red-300/30 left-8" />
              
              {/* Ruled lines background */}
              <div className="absolute inset-0 opacity-12 pointer-events-none rounded-lg" 
                   style={{
                     backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(139,69,19,0.3) 23px, rgba(139,69,19,0.3) 24px)',
                   }} />

              <div className="pl-4 text-center space-y-4">
                {/* Elegant waiting message */}
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean/20 to-ocean/10 flex items-center justify-center border border-ocean/30">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-ocean rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-ocean rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                      <div className="w-1.5 h-1.5 bg-ocean rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                    </div>
                  </div>
                  <div className="text-slate-700">
                    <div className="text-base font-serif italic">
                      Waiting for <UserDisplayName email={otherParticipantEmail} />
                    </div>
                    <div className="text-sm text-slate-600 font-handwriting">
                      to finish writing...
                    </div>
                  </div>
                </div>
                
                {/* Gentle explanation */}
                <div className="text-xs text-slate-500 italic font-serif leading-relaxed">
                  Take a moment to reflect while they craft their response. 
                  <br />
                  You'll be notified when it's your turn to continue the conversation.
                </div>
                
                {/* Decorative flourish */}
                <div className="flex justify-center pt-2">
                  <svg width="32" height="20" viewBox="0 0 32 20" className="text-amber-600 opacity-30">
                    <path d="M2 10c0 0 6-8 14-8s14 8 14 8-6 8-14 8S2 10 2 10z" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    <path d="M10 10h12M8 8l2 2-2 2M24 8l-2 2 2 2" stroke="currentColor" strokeWidth="0.3" opacity="0.7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
