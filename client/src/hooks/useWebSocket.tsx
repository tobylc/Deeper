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

    // Invalidate relevant queries to refresh dashboard
    queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    queryClient.invalidateQueries({ queryKey: [`/api/conversations/by-email/${user?.email}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}/messages`] });

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
      console.log('[WebSocket] Turn updated - invalidating conversation data for both users');
      
      // Invalidate conversation data to refresh turn information
      if (data.conversationId) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}`] });
        // Also invalidate dashboard to update turn badges
        queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/by-email/${user?.email}`] });
      }
      return; // Exit early - no toast needed for turn updates
    }

    // CRITICAL FIX: Handle thread switching to synchronize both users' conversation pages
    if (data.action === 'thread_switched') {
      console.log('[WebSocket] Thread switched - synchronizing conversation state for both users');
      
      // Update URL for both users to show the same conversation
      const currentPath = window.location.pathname;
      if (currentPath.includes('/conversation/') && data.conversationId) {
        // Only update URL if we're not already on this conversation
        const currentConversationId = window.location.pathname.split('/conversation/')[1];
        if (currentConversationId !== data.conversationId.toString()) {
          window.history.pushState(null, '', `/conversation/${data.conversationId}`);
          
          // Dispatch custom event to notify conversation page components
          window.dispatchEvent(new CustomEvent('conversationThreadSwitched', { 
            detail: { 
              conversationId: data.conversationId,
              currentTurn: data.currentTurn,
              switchedByUser: data.switchedByUser
            } 
          }));
        }
      }

      // Invalidate conversation data to ensure both users see the correct turn state
      if (data.conversationId && data.connectionId) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}/messages`] });
        queryClient.invalidateQueries({ queryKey: [`/api/connections/${data.connectionId}/conversations`] });
        // Also refresh dashboard to sync turn indicators
        queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/by-email/${user?.email}`] });
      }
      return; // Exit early - no toast needed for thread switching
    }

    // Handle thread reopening specially - minimal invalidation to prevent turn changes
    if (data.action === 'thread_reopened') {
      console.log('[WebSocket] Thread reopened - using minimal query invalidation');
      
      // Only invalidate conversation threads list, NOT the conversation itself
      if (data.connectionId) {
        queryClient.invalidateQueries({ queryKey: [`/api/connections/${data.connectionId}/conversations`] });
      }
      return; // Exit early to prevent full invalidation
    }

    // For other conversation updates (new conversations, etc.), do full invalidation
    queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    queryClient.invalidateQueries({ queryKey: [`/api/conversations/by-email/${user?.email}`] });
    
    if (data.conversationId) {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${data.conversationId}/messages`] });
      
      // Also invalidate conversation threads for the specific connection
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${data.connectionId}/conversations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${data.connectionId}/conversations/message-counts`] });
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