import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp?: string;
}

export function useWebSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!user?.email || !user?.id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?email=${encodeURIComponent(user.email)}&userId=${encodeURIComponent(user.id)}`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setConnectionAttempts(0);
        
        // Subscribe to dashboard updates
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe_dashboard'
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && connectionAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${connectionAttempts + 1})`);
          
          setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
    }
  };

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connection_confirmed':
        console.log('[WebSocket] Connection confirmed');
        break;

      case 'dashboard_subscribed':
        console.log('[WebSocket] Subscribed to dashboard updates');
        break;

      case 'new_message':
        handleNewMessage(message.data);
        break;

      case 'connection_update':
        handleConnectionUpdate(message.data);
        break;

      case 'conversation_update':
        handleConversationUpdate(message.data);
        break;

      case 'pong':
        // Response to ping - connection is alive
        break;

      default:
        console.log('[WebSocket] Unknown message type:', message.type);
    }
  };

  const handleNewMessage = (data: any) => {
    if (!data) return;

    console.log('[WebSocket] New message received:', data);

    // CRITICAL FIX: Force immediate refresh of conversation data for real-time sync
    // Invalidate and immediately refetch all relevant queries
    queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    queryClient.invalidateQueries({ queryKey: [`/api/conversations/by-email/${user?.email}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}/messages`] });

    // Force immediate refetch to ensure both users see changes instantly
    queryClient.refetchQueries({ queryKey: [`/api/conversations/${data.conversationId}`] });
    queryClient.refetchQueries({ queryKey: [`/api/conversations/${data.conversationId}/messages`] });
    queryClient.refetchQueries({ queryKey: ['/api/connections'] });

    // Show toast notification
    toast({
      title: "New message received!",
      description: `${data.senderName} sent you a ${data.messageType} in your ${data.relationshipType.toLowerCase()} conversation.`,
      duration: 5000,
    });
  };

  const handleConnectionUpdate = (data: any) => {
    if (!data) return;

    console.log('[WebSocket] Connection update received:', data);

    // Invalidate connections query to refresh dashboard
    queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
  };

  const handleConversationUpdate = (data: any) => {
    if (!data) return;

    console.log('[WebSocket] Conversation update received:', data);

    // CRITICAL FIX: Handle turn updates to synchronize both users
    if (data.action === 'turn_updated') {
      console.log('[WebSocket] Turn updated - forcing immediate conversation data refresh for both users');
      
      // Force immediate refresh of conversation data to sync turn information
      if (data.conversationId) {
        // Invalidate and immediately refetch conversation data
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}`] });
        queryClient.refetchQueries({ queryKey: [`/api/conversations/${data.conversationId}`] });
        
        // Also force refresh dashboard and conversation lists
        queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/by-email/${user?.email}`] });
        queryClient.refetchQueries({ queryKey: ['/api/connections'] });
        queryClient.refetchQueries({ queryKey: [`/api/conversations/by-email/${user?.email}`] });
      }
      return; // Exit early - no toast needed for turn updates
    }

    // Handle thread reopening specially - minimal invalidation to prevent turn changes
    if (data.action === 'thread_reopened') {
      console.log('[WebSocket] Thread reopened - using minimal query invalidation and dispatching sync event');
      console.log('[WebSocket] Thread reopened data:', JSON.stringify(data));
      
      // Only invalidate conversation threads list, NOT the conversation itself
      if (data.connectionId) {
        console.log('[WebSocket] Invalidating conversation threads for connection:', data.connectionId);
        queryClient.invalidateQueries({ queryKey: [`/api/connections/${data.connectionId}/conversations`] });
      }
      
      // Dispatch custom event for conversation page synchronization
      if (data.conversationId) {
        console.log('[WebSocket] Dispatching conversationSync event for conversation:', data.conversationId);
        const syncEvent = new CustomEvent('conversationSync', {
          detail: {
            conversationId: data.conversationId,
            action: 'thread_reopened',
            connectionId: data.connectionId
          }
        });
        window.dispatchEvent(syncEvent);
        console.log('[WebSocket] conversationSync event dispatched successfully');
      }
      
      return; // Exit early to prevent full invalidation
    }

    // For other conversation updates (new conversations, etc.), do full invalidation with immediate refresh
    queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    queryClient.invalidateQueries({ queryKey: [`/api/conversations/by-email/${user?.email}`] });
    
    if (data.conversationId) {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}/messages`] });
      
      // CRITICAL: Force immediate refresh of conversation threads to maintain sync
      if (data.connectionId) {
        queryClient.invalidateQueries({ queryKey: [`/api/connections/${data.connectionId}/conversations`] });
        queryClient.invalidateQueries({ queryKey: [`/api/connections/${data.connectionId}/conversations/message-counts`] });
        queryClient.refetchQueries({ queryKey: [`/api/connections/${data.connectionId}/conversations`] });
        queryClient.refetchQueries({ queryKey: [`/api/connections/${data.connectionId}/conversations/message-counts`] });
      }
      
      // Force immediate refresh for conversation and message data
      queryClient.refetchQueries({ queryKey: [`/api/conversations/${data.conversationId}`] });
      queryClient.refetchQueries({ queryKey: [`/api/conversations/${data.conversationId}/messages`] });
    }

    // Handle new conversation thread creation
    if (data.action === 'conversation_created') {
      // Trigger URL change for both users to synchronize conversation states
      const currentPath = window.location.pathname;
      if (currentPath.includes('/conversation/') && data.conversationId) {
        // Update URL to new conversation for synchronized viewing
        window.history.pushState(null, '', `/conversation/${data.conversationId}`);
        
        // Dispatch custom event to notify conversation page components
        window.dispatchEvent(new CustomEvent('conversationThreadCreated', { 
          detail: { conversationId: data.conversationId } 
        }));
      }
      
      toast({
        title: "New conversation thread started!",
        description: `A new ${data.relationshipType?.toLowerCase()} conversation has begun.`,
        duration: 3000,
      });
    }

    // Show appropriate notification based on status
    if (data.status === 'accepted') {
      toast({
        title: "Connection accepted!",
        description: "Your invitation has been accepted. You can now start conversations.",
        duration: 5000,
      });
    } else if (data.status === 'declined') {
      toast({
        title: "Connection declined",
        description: "Your invitation was declined.",
        duration: 5000,
      });
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
      setIsConnected(false);
    }
  };

  const sendPing = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  };

  useEffect(() => {
    if (user?.email && user?.id) {
      connect();

      // Send periodic pings to keep connection alive
      const pingInterval = setInterval(() => {
        sendPing();
      }, 30000); // Ping every 30 seconds

      return () => {
        clearInterval(pingInterval);
        disconnect();
      };
    }

    return () => {
      disconnect();
    };
  }, [user?.email, user?.id]);

  return {
    isConnected,
    connectionAttempts,
    connect,
    disconnect,
    sendPing
  };
}