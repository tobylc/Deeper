import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface ConversationThreadsProps {
  connectionId: number;
  currentUserEmail: string;
  otherParticipantEmail: string;
  relationshipType: string;
  onThreadSelect: (conversationId: number) => void;
  selectedConversationId?: number;
  isMyTurn: boolean;
  isInviter: boolean;
}

interface Conversation {
  id: number;
  title: string | null;
  topic: string;
  lastMessageAt: Date | null;
  messageCount: number;
  currentTurn: string;
  status: string;
  isMainThread: boolean;
  parentConversationId: number | null;
  lastActivityAt: Date | null;
  connectionId: number;
  participant1Email: string;
  participant2Email: string;
  relationshipType: string;
  createdAt: Date | null;
}

// Helper component for stacked conversation display
function StackedConversation({ 
  conversation, 
  isSelected, 
  onClick, 
  currentUserEmail, 
  isMyTurn,
  isInviter 
}: { 
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  currentUserEmail: string;
  isMyTurn: boolean;
  isInviter: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldStack = conversation.messageCount >= 4;
  
  // Role-based glowing effect styles
  const glowStyles = isInviter 
    ? 'shadow-[0_0_20px_rgba(79,172,254,0.3)] border-[#4FACFE]/40' 
    : 'shadow-[0_0_20px_rgba(215,160,135,0.3)] border-amber/40';
  
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-ocean border-ocean/30' : 'border-slate-200/60'
      } ${shouldStack ? 'relative' : ''} ${glowStyles}`}
      onClick={onClick}
    >
      {shouldStack && !isExpanded && (
        <>
          {/* Paper stack effect - bottom layers */}
          <div className="absolute -bottom-1 -right-1 w-full h-full bg-slate-100 rounded-lg rotate-1 opacity-60"></div>
          <div className="absolute -bottom-0.5 -right-0.5 w-full h-full bg-slate-50 rounded-lg rotate-0.5 opacity-80"></div>
        </>
      )}
      
      <CardContent className="p-3 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <MessageSquare className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <h4 className="text-xs font-medium text-slate-800 truncate">
                {conversation.title || conversation.topic}
              </h4>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Users className="w-3 h-3" />
              <span>{conversation.messageCount} messages</span>
              {conversation.lastMessageAt && (
                <>
                  <Clock className="w-3 h-3" />
                  <span>{new Date(conversation.lastMessageAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            {/* Turn indicator */}
            {conversation.currentTurn === currentUserEmail ? (
              <Badge className="text-xs bg-ocean text-white">Your turn</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Their turn</Badge>
            )}
            
            {/* Stack expansion control */}
            {shouldStack && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
        
        {shouldStack && isExpanded && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-600">
              Conversation expanded - showing all {conversation.messageCount} messages in main view
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ConversationThreads({
  connectionId,
  currentUserEmail,
  otherParticipantEmail,
  relationshipType,
  onThreadSelect,
  selectedConversationId,
  isMyTurn,
  isInviter
}: ConversationThreadsProps) {
  // Fetch real conversations from API
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: [`/api/connections/${connectionId}/conversations`],
    queryFn: () => fetch(`/api/connections/${connectionId}/conversations`).then(res => res.json()),
    enabled: !!connectionId
  });

  // Fetch message counts for each conversation
  const { data: messageCounts = {} } = useQuery({
    queryKey: [`/api/connections/${connectionId}/conversations/message-counts`],
    queryFn: () => fetch(`/api/connections/${connectionId}/conversations/message-counts`).then(res => res.json()),
    enabled: !!connectionId
  });

  // Filter out the currently active conversation and sort remaining conversations
  const sortedConversations = conversations
    .filter((conv: Conversation) => conv.id !== selectedConversationId) // Hide currently active conversation
    .map((conv: Conversation) => ({
      ...conv,
      messageCount: messageCounts[conv.id] || 0,
      lastMessageAt: conv.lastActivityAt
    }))
    .sort((a: Conversation, b: Conversation) => {
      if (a.isMainThread && !b.isMainThread) return -1;
      if (!a.isMainThread && b.isMainThread) return 1;
      return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
    });

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
          <h3 className="text-sm font-semibold text-slate-800">Previous Conversations</h3>
        </div>
        
        {!isMyTurn && (
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
            <div className="absolute inset-0 opacity-25 pointer-events-none">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-slate-300/40"
                  style={{ top: `${20 + i * 25}%` }}
                />
              ))}
            </div>
            
            <p className="text-xs text-slate-700 relative z-10 font-serif leading-relaxed">
              Waiting for their response...
            </p>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {sortedConversations.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="p-6 text-center">
              <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                {conversations.length === 0 ? "No conversations yet." : "Current conversation is active."}
              </p>
              <p className="text-xs text-slate-500">
                {conversations.length === 0 
                  ? "Start a new question to begin your conversation history." 
                  : "Previous conversations will appear here when you start new questions."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedConversations.map((conversation: Conversation) => (
            <StackedConversation
              key={conversation.id}
              conversation={conversation}
              isSelected={false} // Never selected since active conversation is hidden
              onClick={() => {
                // Only allow thread selection when it's user's turn
                if (isMyTurn) {
                  onThreadSelect(conversation.id);
                }
              }}
              currentUserEmail={currentUserEmail}
              isMyTurn={isMyTurn}
              isInviter={isInviter}
            />
          ))
        )}
      </div>
    </div>
  );
}