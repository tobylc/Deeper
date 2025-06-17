import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { Message } from "@shared/schema";
import { UserDisplayName } from "@/hooks/useUserDisplayName";

interface ConversationInterfaceProps {
  messages: Message[];
  currentUserEmail: string;
  participant1Email: string;
  participant2Email: string;
  isMyTurn: boolean;
}

export default function ConversationInterface({ 
  messages, 
  currentUserEmail, 
  participant1Email, 
  participant2Email,
  isMyTurn
}: ConversationInterfaceProps) {
  const getParticipantName = (email: string) => {
    if (email === currentUserEmail) return "You";
    return <UserDisplayName email={email} />;
  };

  return (
    <Card className="card-elevated">
      <CardContent className="p-6">
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              {isMyTurn ? (
                <div className="space-y-4">
                  <div className="text-lg font-medium text-slate-700">
                    It's your turn to start the conversation!
                  </div>
                  <div className="text-muted-foreground">
                    Ask your first question below to begin this meaningful exchange.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-lg font-medium text-slate-700">
                    Waiting for them to start
                  </div>
                  <div className="text-muted-foreground">
                    Your conversation partner will ask the first question soon.
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((message, index) => {
              const isFromCurrentUser = message.senderEmail === currentUserEmail;
              const senderName = getParticipantName(message.senderEmail);
              
              return (
                <div key={message.id} className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'} smooth-enter`}>
                  <div className={`max-w-xs ${
                    isFromCurrentUser 
                      ? 'message-bubble own' 
                      : 'message-bubble other'
                  }`}>
                    <div className={`text-xs mb-1 ${
                      isFromCurrentUser ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      <Badge variant={message.type === 'question' ? 'default' : 'secondary'} className="mr-2">
                        {message.type === 'question' ? 'Q' : 'A'}
                      </Badge>
                      {message.type === 'question' ? 'Question' : 'Response'} from {senderName}
                    </div>
                    <div className={isFromCurrentUser ? 'text-white' : 'text-darkslate'}>
                      {message.content}
                    </div>
                    <div className={`text-xs mt-2 ${
                      isFromCurrentUser ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      {formatDistanceToNow(new Date(message.createdAt!), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Typing indicator placeholder */}
          {messages.length > 0 && messages[messages.length - 1]?.type === 'question' && 
           messages[messages.length - 1]?.senderEmail === currentUserEmail && (
            <div className="flex justify-start">
              <div className="bg-primary/10 p-4 rounded-2xl rounded-tl-md border-2 border-dashed border-primary/30">
                <div className="flex items-center space-x-2 text-primary">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm">{getParticipantName(
                    currentUserEmail === participant1Email ? participant2Email : participant1Email
                  )} is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
