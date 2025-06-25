import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, Type, Mic, ArrowRight, Clock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserDisplayName } from '@/hooks/useUserDisplayName';
import ProfileAvatar from '@/components/profile-avatar';
import VoiceRecorder from '@/components/voice-recorder';
import VoiceMessageDisplay from '@/components/voice-message-display';
import TranscriptionProgress from '@/components/transcription-progress';
import ThoughtfulResponsePopup from '@/components/thoughtful-response-popup';

interface Message {
  id: number;
  senderEmail: string;
  content: string;
  type: 'question' | 'response' | 'follow_up';
  createdAt: string;
  messageFormat?: 'text' | 'voice';
  audioFileUrl?: string | null;
  transcription?: string | null;
  audioDuration?: number | null;
}

interface User {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

interface Connection {
  id: number;
  inviterEmail: string;
  inviteeEmail: string;
  relationshipType: string;
  inviterRole?: string;
  inviteeRole?: string;
}

interface ConversationInterfaceProps {
  messages: Message[];
  currentUserEmail: string;
  participant1Email: string;
  participant2Email: string;
  isMyTurn: boolean;
  relationshipType: string;
  connection?: Connection;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  onQuestionSelect: (question: string) => void;
  onRecordingStart?: () => void;
  isSending: boolean;
  nextMessageType: 'question' | 'response';
  conversationId: number;
  hasStartedResponse?: boolean;
  responseStartTime?: Date | null;
  onTimerStart?: () => void;
}

export default function ConversationInterface({ 
  messages,
  currentUserEmail,
  participant1Email,
  participant2Email,
  isMyTurn,
  relationshipType,
  connection,
  newMessage,
  setNewMessage,
  onSendMessage,
  onQuestionSelect,
  onRecordingStart,
  isSending,
  nextMessageType,
  conversationId,
  hasStartedResponse = false,
  responseStartTime = null,
  onTimerStart
}: ConversationInterfaceProps) {
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [messageMode, setMessageMode] = useState<'text' | 'voice'>('text');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showThoughtfulResponsePopup, setShowThoughtfulResponsePopup] = useState(false);
  const [showTranscriptionProgress, setShowTranscriptionProgress] = useState(false);
  const queryClient = useQueryClient();

  // Real-time countdown timer synchronization for text input
  useEffect(() => {
    if (hasStartedResponse && responseStartTime) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [hasStartedResponse, responseStartTime]);

  // Calculate remaining time for thoughtful response timer
  const getRemainingTime = () => {
    if (!hasStartedResponse || !responseStartTime) return 600; // 10 minutes in seconds
    const elapsed = (currentTime.getTime() - responseStartTime.getTime()) / 1000;
    return Math.max(0, 600 - elapsed);
  };

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canSendNow = () => {
    if (!hasStartedResponse) return true;
    return getRemainingTime() <= 0;
  };

  // Voice message mutation with transcription progress
  const sendVoiceMessageMutation = useMutation({
    mutationFn: async ({ audioBlob, duration }: { audioBlob: Blob; duration: number }) => {
      console.log('Sending voice message:', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        duration,
        conversationId
      });

      // Show transcription progress indicator
      setShowTranscriptionProgress(true);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.webm');
      formData.append('senderEmail', currentUserEmail);
      formData.append('type', nextMessageType);
      formData.append('duration', duration.toString());

      return fetch(`/api/conversations/${conversationId}/voice-messages`, {
        method: 'POST',
        body: formData,
      }).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      });
    },
    onSuccess: () => {
      console.log('Voice message sent successfully');
      setShowTranscriptionProgress(false);
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
    onError: (error) => {
      console.error('Error sending voice message:', error);
      setShowTranscriptionProgress(false);
    }
  });

  // Fetch current user data for profile images
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md space-y-6">
          <div className="mb-8">
            <h3 className="text-2xl font-serif text-slate-800 mb-3">
              Begin Your Journey
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Start a meaningful conversation by asking a thoughtful question or sharing what's on your heart.
            </p>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 mb-4">Or try one of these conversation starters:</p>
            {exampleQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => onQuestionSelect(question)}
                className="block w-full p-4 text-left bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-lg transition-all duration-200 hover:shadow-md group"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-blue-200 transition-colors">
                    <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed group-hover:text-slate-800">
                    {question}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Journal Entry Component with organic paper styling
  const JournalEntry = ({ message, index }: { message: Message; index: number }) => {
    const isCurrentUser = message.senderEmail === currentUserEmail;
    const participant = getParticipantData(message.senderEmail);
    
    return (
      <div className={cn(
        "relative transform transition-all duration-300 hover:scale-[1.01]",
        isCurrentUser ? "rotate-0" : "rotate-0",
        index % 2 === 0 ? "ml-2" : "mr-2"
      )}>
        {/* Paper styling with organic edges */}
        <div 
          className={cn(
            "relative p-8 shadow-lg transition-all duration-200 hover:shadow-xl",
            isCurrentUser 
              ? "bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20" 
              : "bg-gradient-to-br from-white via-gray-50/30 to-gray-100/20"
          )}
          style={{
            clipPath: "polygon(2% 0%, 98% 0%, 99% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 1% 2%)",
            filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.08))',
            backdropFilter: 'blur(0.5px)'
          }}
        >
          {/* Paper texture and aging effects */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(0,0,0,0.015)_0%,_transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,_rgba(0,0,0,0.01)_0%,_transparent_50%)]"></div>
          </div>
          
          {/* Very subtle ruled lines */}
          <div className="absolute inset-0 opacity-25 pointer-events-none" 
               style={{
                 backgroundImage: 'repeating-linear-gradient(transparent, transparent 25px, rgba(156,163,175,0.08) 25px, rgba(156,163,175,0.08) 26px)',
               }} />

          {/* Message header */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center space-x-3">
              <ProfileAvatar
                email={message.senderEmail}
                firstName={participant?.firstName ?? undefined}
                lastName={participant?.lastName ?? undefined}
                profileImageUrl={participant?.profileImageUrl ?? undefined}
                size="sm"
                className="shadow-sm border border-gray-200"
              />
              <div>
                <div className="text-sm font-medium text-gray-800">
                  {getParticipantName(message.senderEmail)}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(message.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
            
            {/* Message type badge */}
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs px-2 py-1",
                message.type === 'question' ? "bg-blue-100 text-blue-800" :
                message.type === 'response' ? "bg-amber-100 text-amber-800" :
                "bg-gray-100 text-gray-800"
              )}
            >
              {message.type === 'question' ? 'Question' : 
               message.type === 'response' ? 'Response' : 'Follow up'}
            </Badge>
          </div>

          {/* Message content */}
          <div className="relative z-10 pl-12">
            {message.messageFormat === 'voice' ? (
              <VoiceMessageDisplay
                audioUrl={message.audioFileUrl || ''}
                transcription={message.transcription || ''}
                duration={message.audioDuration || 0}
              />
            ) : (
              <div className="text-gray-800 leading-relaxed font-serif text-base whitespace-pre-wrap">
                {message.content}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Typing indicator for when other user is composing
  const TypingIndicator = () => (
    <div className="relative transform rotate-1 mb-6">
      <div className="relative bg-gradient-to-br from-white via-gray-50/20 to-amber-50/10 p-6 border border-gray-200/40 shadow-lg rounded-sm"
           style={{
             background: `
               linear-gradient(135deg, 
                 rgba(255,255,255,0.98) 0%, 
                 rgba(248,250,252,0.96) 30%, 
                 rgba(255,251,235,0.94) 70%, 
                 rgba(255,251,235,0.92) 100%
               )
             `,
             filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.08))',
             backdropFilter: 'blur(0.5px)'
           }}>
        {/* Paper texture */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(0,0,0,0.015)_0%,_transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,_rgba(0,0,0,0.01)_0%,_transparent_50%)]"></div>
        </div>
        
        {/* Very subtle ruled lines */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" 
             style={{
               backgroundImage: 'repeating-linear-gradient(transparent, transparent 25px, rgba(156,163,175,0.08) 25px, rgba(156,163,175,0.08) 26px)',
             }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center space-x-3">
            <ProfileAvatar
              email={otherParticipantEmail}
              firstName={otherUser?.firstName ?? undefined}
              lastName={otherUser?.lastName ?? undefined}
              profileImageUrl={otherUser?.profileImageUrl ?? undefined}
              size="sm"
              className="shadow-sm border border-gray-200"
            />
            <div>
              <div className="text-sm font-medium text-gray-800">
                <UserDisplayName email={otherParticipantEmail} />
              </div>
              <div className="text-xs text-gray-500">
                writing...
              </div>
            </div>
          </div>
          
          {/* Clean thinking badge */}
          <div className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full">
            Thinking
          </div>
        </div>

        {/* Animated writing content */}
        <div className="relative z-10 pl-12">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            <span className="text-sm text-gray-500 ml-2">composing thoughts...</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Messages Container - Journal Workspace (flex-1 to take remaining space) */}
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
            
            {/* Show typing indicator when not user's turn */}
            {!isMyTurn && <TypingIndicator />}
          </div>
        )}

        {/* Transcription Progress Indicator */}
        {showTranscriptionProgress && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <TranscriptionProgress isVisible={showTranscriptionProgress} />
          </div>
        )}

        {/* Thoughtful Response Popup */}
        {showThoughtfulResponsePopup && (
          <ThoughtfulResponsePopup
            onClose={() => setShowThoughtfulResponsePopup(false)}
          />
        )}
      </div>

      {/* Fixed Input Area at Bottom - Only visible when it's user's turn */}
      {isMyTurn && (
        <div className="flex-shrink-0 border-t border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-white/50 backdrop-blur-sm p-4">
          {/* Message Mode Toggle */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Button
              onClick={() => setMessageMode('text')}
              variant={messageMode === 'text' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "transition-all duration-200",
                messageMode === 'text' 
                  ? "bg-ocean text-white shadow-ocean/20" 
                  : "text-slate-600 border-slate-300 hover:bg-slate-50"
              )}
            >
              <Type className="w-4 h-4 mr-2" />
              Write Text
            </Button>
            <Button
              onClick={() => setMessageMode('voice')}
              variant={messageMode === 'voice' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "transition-all duration-200",
                messageMode === 'voice' 
                  ? "bg-white text-[#4FACFE] border-2 border-[#4FACFE] shadow-lg hover:bg-slate-50" 
                  : "text-[#4FACFE] border-slate-300 hover:bg-slate-50 hover:border-[#4FACFE]/50"
              )}
            >
              <Mic className="w-4 h-4 mr-2" />
              Record Voice
            </Button>
          </div>

          {/* Input Surface */}
          <div className="relative">
            {messageMode === 'text' ? (
              /* Text Writing Surface */
              <div className="relative bg-gradient-to-br from-white via-ocean/5 to-ocean/8 p-6 border border-ocean/20 shadow-md rounded-sm"
                   style={{
                     background: `
                       linear-gradient(135deg, 
                         rgba(255,255,255,0.98) 0%, 
                         rgba(239,246,255,0.96) 30%, 
                         rgba(79,172,254,0.08) 70%, 
                         rgba(79,172,254,0.12) 100%
                       )
                     `,
                     filter: 'drop-shadow(0px 6px 12px rgba(0, 0, 0, 0.06))',
                     backdropFilter: 'blur(0.5px)'
                   }}>
                {/* Subtle paper texture */}
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(0,0,0,0.02)_0%,_transparent_50%)]"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,_rgba(0,0,0,0.015)_0%,_transparent_50%)]"></div>
                </div>
                
                {/* Red margin line */}
                <div className="absolute top-0 bottom-0 w-px bg-red-400/40 left-8" />
                
                {/* Very subtle ruled lines */}
                <div className="absolute inset-0 opacity-25 pointer-events-none" 
                     style={{
                       backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(156,163,175,0.12) 23px, rgba(156,163,175,0.12) 24px)',
                     }} />

                <div className="flex space-x-4">
                  <div className="flex-1 pl-4">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        // Start timer on first text input (similar to voice recorder)
                        if (!hasStartedResponse && e.target.value.trim() && onTimerStart) {
                          onTimerStart();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (canSendNow()) {
                            onSendMessage();
                          } else {
                            setShowThoughtfulResponsePopup(true);
                          }
                        }
                      }}
                      placeholder={
                        messages.length >= 2
                          ? "Continue your thoughts..."
                          : nextMessageType === 'question' 
                            ? "What would you like to explore together?"
                            : "Express what's in your heart..."
                      }
                      className="min-h-[120px] resize-none border-0 bg-transparent text-slate-800 placeholder:text-slate-500 focus:ring-0 font-handwriting text-base leading-relaxed p-0"
                      disabled={isSending}
                    />
                  </div>
                  <div className="flex flex-col items-center justify-between py-2">
                    <Button
                      onClick={() => {
                        if (canSendNow()) {
                          onSendMessage();
                        } else {
                          setShowThoughtfulResponsePopup(true);
                        }
                      }}
                      disabled={!newMessage.trim() || isSending}
                      size="sm"
                      className={cn(
                        "w-12 h-12 rounded-full shadow-lg transition-all duration-200",
                        "bg-gradient-to-br from-ocean to-ocean/80 hover:from-ocean/90 hover:to-ocean",
                        "hover:shadow-xl hover:scale-105 active:scale-95",
                        !newMessage.trim() || isSending 
                          ? "opacity-50 cursor-not-allowed" 
                          : "cursor-pointer"
                      )}
                    >
                      {isSending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-600 font-handwriting">Share</span>
                      {hasStartedResponse && !canSendNow() && (
                        <span className="text-xs text-slate-500 font-mono">
                          {formatTime(getRemainingTime())}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Voice Recording Surface */
              <VoiceRecorder
                onSendVoiceMessage={(audioBlob, duration) => {
                  sendVoiceMessageMutation.mutate({ audioBlob, duration });
                }}
                onRecordingStart={onRecordingStart}
                disabled={isSending || sendVoiceMessageMutation.isPending}
                canSendMessage={true}
                hasStartedResponse={hasStartedResponse}
                responseStartTime={responseStartTime}
                onTimerStart={onTimerStart}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}