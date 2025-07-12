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
  onRespondFirstClick,
  index
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
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Remove stacked effect for conversations with more than 3 messages
  const shouldStack = false;

  // Rotating border colors: ocean blue, amber, dark navy
  const borderColors = [
    'border-[#4FACFE] border-4', // Ocean blue from app
    'border-[#D7A087] border-4', // Amber from app
    'border-[#1e3a8a] border-4'  // Dark navy blue
  ];
  
  const borderStyle = borderColors[index % 3];
  
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 rounded-lg ${shouldStack ? 'relative' : ''} ${borderStyle} bg-white hover:bg-gray-50 ${
        isSelected ? 'ring-2 ring-gray-400' : ''
      }`}
      onClick={() => {
        // Thread reopening is PURE NAVIGATION - never consumes user's turn
        onClick();
      }}
    >
      {shouldStack && !isExpanded && (
        <>
          {/* Clean stacked paper effect without background colors */}
          <div className="absolute -bottom-1 -right-1 w-full h-full border-2 border-gray-200 rounded-lg rotate-1"></div>
          <div className="absolute -bottom-0.5 -right-0.5 w-full h-full border-2 border-gray-100 rounded-lg rotate-0.5"></div>
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
            
            {/* Reopen Thread Button - Pure Navigation Only */}
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async (e) => {
                  e.stopPropagation();
                  
                  // CORE RULES #10, #11, #12: Check if thread reopening is allowed
                  try {
                    const response = await fetch(`/api/conversations/${conversationId}/can-reopen?currentConversationId=${selectedConversationId}`, {
                      credentials: 'include'
                    });
                    const result = await response.json();
                    
                    if (result.canReopen) {
                      onThreadSelect(conversation.id); // Thread reopening allowed
                    } else {
                      // Show appropriate popup based on the reason
                      if (result.reason === 'respond_to_question') {
                        setShowRespondFirstPopup(true);
                      } else if (result.reason === 'not_your_turn') {
                        setShowWaitingPopup(true);
                      } else {
                        setShowWaitingPopup(true);
                      }
                    }
                  } catch (error) {
                    // Fallback to allowing reopening if check fails
                    onThreadSelect(conversation.id);
                  }
                }}
                className="text-xs px-2 py-1 h-6 border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 rounded-lg"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reopen Thread
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            {/* Turn indicator badge */}
            <Badge 
              variant="outline"
              className={`text-xs px-2 py-1 text-center min-w-[60px] ${
                conversation.currentTurn === currentUserEmail 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {conversation.currentTurn === currentUserEmail ? 'Your Turn' : 'Their Turn'}
            </Badge>
            
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
          sortedConversations.map((conversation: Conversation, index: number) => (
            <StackedConversation
              key={conversation.id}
              conversation={conversation}
              isSelected={false} // Never selected since active conversation is hidden
              onClick={async () => {
                // CORE RULE #10: Check if thread reopening is allowed
                try {
                  const response = await fetch(`/api/conversations/${selectedConversationId}/can-reopen/${conversation.id}`, {
                    credentials: 'include'
                  });
                  const result = await response.json();
                  
                  if (result.canReopen) {
                    onThreadSelect(conversation.id); // Thread reopening allowed
                  } else {
                    // Show appropriate popup based on the reason
                    if (result.reason === 'respond_to_question') {
                      setShowRespondFirstPopup(true);
                    } else {
                      setShowWaitingPopup(true);
                    }
                  }
                } catch (error) {
                  // Fallback to allowing reopening if check fails
                  onThreadSelect(conversation.id);
                }
              }}
              currentUserEmail={currentUserEmail}
              isMyTurn={isMyTurn}
              isInviter={isInviter}
              selectedConversationId={selectedConversationId}
              onWaitingClick={() => setShowWaitingPopup(true)}
              onRespondFirstClick={() => setShowRespondFirstPopup(true)}
              index={index}
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