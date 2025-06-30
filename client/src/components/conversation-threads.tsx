import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Clock, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { WaitingTurnPopup } from './waiting-turn-popup';
import { RespondFirstPopup } from './respond-first-popup';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';

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
  isInviter,
  selectedConversationId,
  onWaitingClick,
  onRespondFirstClick
}: { 
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  currentUserEmail: string;
  isMyTurn: boolean;
  isInviter: boolean;
  selectedConversationId?: number;
  onWaitingClick: () => void;
  onRespondFirstClick: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldStack = conversation.messageCount >= 4;

  // Role-based glowing effect styles - maximum visibility
  const glowStyles = isInviter 
    ? 'shadow-[0_0_60px_rgba(79,172,254,1),0_0_100px_rgba(79,172,254,0.7),0_0_150px_rgba(79,172,254,0.4)] border-4 border-[#4FACFE] ring-8 ring-[#4FACFE]/60 hover:shadow-[0_0_80px_rgba(79,172,254,1),0_0_120px_rgba(79,172,254,0.8)] bg-gradient-to-br from-[#4FACFE]/20 via-[#4FACFE]/10 to-transparent backdrop-blur-sm' 
    : 'shadow-[0_0_60px_rgba(215,160,135,1),0_0_100px_rgba(215,160,135,0.7),0_0_150px_rgba(215,160,135,0.4)] border-4 border-[#D7A087] ring-8 ring-[#D7A087]/60 hover:shadow-[0_0_80px_rgba(215,160,135,1),0_0_120px_rgba(215,160,135,0.8)] bg-gradient-to-br from-[#D7A087]/20 via-[#D7A087]/10 to-transparent backdrop-blur-sm';
  
  return (
    <Card 
      className={`cursor-pointer transition-all duration-300 ${shouldStack ? 'relative' : ''} ${glowStyles} ${
        isSelected ? 'ring-2 ring-ocean border-ocean/30' : ''
      }`}
      onClick={() => {
        if (isMyTurn) {
          onClick();
        } else {
          onWaitingClick();
        }
      }}
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
            
            {/* Reopen Thread Button */}
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await fetch(
                      `/api/conversations/${conversation.id}/can-reopen?currentConversationId=${selectedConversationId || ''}`
                    );
                    
                    // Production-ready response handling
                    if (!response.ok) {
                      console.error(`API error: ${response.status} ${response.statusText}`);
                      onWaitingClick();
                      return;
                    }

                    const data = await response.json();
                    
                    // Validate response structure
                    if (typeof data.canReopen !== 'boolean') {
                      console.error('Invalid API response structure:', data);
                      onWaitingClick();
                      return;
                    }
                    
                    if (data.canReopen) {
                      onClick(); // Reopen the thread - this does NOT count as a turn and does NOT require user's turn
                    } else {
                      // FIXED: Thread reopening should NOT depend on whose turn it is
                      // Only show respond first popup if there are unanswered questions
                      if (data.reason === 'respond_to_question') {
                        onRespondFirstClick(); // Show "Respond First" popup for unanswered questions
                      } else {
                        // For any other reason, allow thread reopening (it's just navigation)
                        console.log('[THREAD_REOPEN] Backend blocking thread reopen for reason:', data.reason);
                        onClick(); // Allow thread reopening regardless - it's pure navigation
                      }
                    }
                  } catch (error) {
                    if (process.env.NODE_ENV === 'development') {
                      console.error('Error checking thread reopen permission:', error);
                    }
                    onWaitingClick(); // Show waiting popup on error
                  }
                }}
                className="text-xs px-2 py-1 h-6 border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reopen Thread
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-1">
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
  const [showWaitingPopup, setShowWaitingPopup] = useState(false);
  const [showRespondFirstPopup, setShowRespondFirstPopup] = useState(false);
  const { data: otherParticipantName } = useUserDisplayName(otherParticipantEmail);

  // Fetch real conversations from API
  const { data: conversationData, isLoading } = useQuery({
    queryKey: [`/api/connections/${connectionId}/conversations`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/connections/${connectionId}/conversations`);
        if (!response.ok) {
          return { conversations: [], activeConversationId: null, previousConversations: [] };
        }
        const data = await response.json();
        // API returns { conversations, activeConversationId, previousConversations }
        return data && typeof data === 'object' ? data : { conversations: [], activeConversationId: null, previousConversations: [] };
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return { conversations: [], activeConversationId: null, previousConversations: [] };
      }
    },
    enabled: !!connectionId
  });

  const conversations = conversationData?.conversations || [];
  
  // Debug logging for production troubleshooting
  console.log('[CONVERSATION_THREADS] Connection ID:', connectionId);
  console.log('[CONVERSATION_THREADS] Raw API response:', conversationData);
  console.log('[CONVERSATION_THREADS] Conversations array:', conversations);
  console.log('[CONVERSATION_THREADS] Selected conversation ID:', selectedConversationId);

  // Fetch message counts for each conversation
  const { data: messageCounts = {} } = useQuery({
    queryKey: [`/api/connections/${connectionId}/conversations/message-counts`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/connections/${connectionId}/conversations/message-counts`);
        if (!response.ok) {
          return {};
        }
        const data = await response.json();
        return typeof data === 'object' && data !== null ? data : {};
      } catch (error) {
        console.error('Error fetching message counts:', error);
        return {};
      }
    },
    enabled: !!connectionId
  });

  // Filter out the currently active conversation and sort remaining conversations
  const sortedConversations = Array.isArray(conversations) 
    ? conversations
        .filter((conv: Conversation) => conv && conv.id !== selectedConversationId) // Hide currently active conversation
        .map((conv: Conversation) => ({
          ...conv,
          messageCount: messageCounts[conv.id] || 0,
          lastMessageAt: conv.lastActivityAt
        }))
        .sort((a: Conversation, b: Conversation) => {
          if (a.isMainThread && !b.isMainThread) return -1;
          if (!a.isMainThread && b.isMainThread) return 1;
          return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
        })
    : [];

  // Debug logging for filtered conversations
  console.log('[CONVERSATION_THREADS] Filtered conversations for left column:', sortedConversations);
  console.log('[CONVERSATION_THREADS] Total conversations before filter:', conversations.length);
  console.log('[CONVERSATION_THREADS] Total conversations after filter:', sortedConversations.length);

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
                // Only allow thread selection if it's the user's turn
                if (isMyTurn) {
                  onThreadSelect(conversation.id);
                } else {
                  setShowWaitingPopup(true);
                }
              }}
              currentUserEmail={currentUserEmail}
              isMyTurn={isMyTurn}
              isInviter={isInviter}
              selectedConversationId={selectedConversationId}
              onWaitingClick={() => setShowWaitingPopup(true)}
              onRespondFirstClick={() => setShowRespondFirstPopup(true)}
            />
          ))
        )}
      </div>
      
      {/* Waiting Turn Popup */}
      <WaitingTurnPopup
        isOpen={showWaitingPopup}
        onClose={() => setShowWaitingPopup(false)}
        otherParticipantName={otherParticipantName || 'the other person'}
      />
      
      {/* Respond First Popup */}
      <RespondFirstPopup
        isOpen={showRespondFirstPopup}
        onClose={() => setShowRespondFirstPopup(false)}
        otherParticipantName={otherParticipantName || 'the other person'}
      />
    </div>
  );
}