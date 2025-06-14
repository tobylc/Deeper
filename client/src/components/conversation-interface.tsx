import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { Message } from "@shared/schema";

interface ConversationInterfaceProps {
  messages: Message[];
  currentUserEmail: string;
  participant1Email: string;
  participant2Email: string;
}

export default function ConversationInterface({ 
  messages, 
  currentUserEmail, 
  participant1Email, 
  participant2Email 
}: ConversationInterfaceProps) {
  const getParticipantName = (email: string) => {
    if (email === currentUserEmail) return "You";
    return email.split("@")[0]; // Simple name extraction
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                No messages yet. Start the conversation by asking a question!
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isFromCurrentUser = message.senderEmail === currentUserEmail;
              const senderName = getParticipantName(message.senderEmail);
              
              return (
                <div key={message.id} className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs ${
                    isFromCurrentUser 
                      ? message.type === 'question' 
                        ? 'bg-primary text-white' 
                        : 'bg-accent text-white'
                      : 'bg-gray-100'
                  } p-4 rounded-2xl ${
                    isFromCurrentUser ? 'rounded-tr-md' : 'rounded-tl-md'
                  } shadow-sm`}>
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
