import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function ConversationPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();

  // Simple state management
  const [conversationId, setConversationId] = useState<number | null>(null);

  // Set conversation ID from URL parameter
  useEffect(() => {
    if (id) {
      const parsedId = parseInt(id);
      if (!isNaN(parsedId)) {
        setConversationId(parsedId);
      }
    }
  }, [id]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  // Simple conversation query
  const { data: conversation, isLoading, error } = useQuery({
    queryKey: [`/api/conversations/${conversationId}`],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await apiRequest('GET', `/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Failed to load conversation');
      return response.json();
    },
    enabled: !!conversationId && !!user,
    retry: false,
  });

  // Loading state
  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-radial from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-ocean to-teal flex items-center justify-center p-3 mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-300">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-gradient-radial from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-[#1B2137]/90 backdrop-blur-md p-8 rounded-2xl shadow-lg text-center border border-[#4FACFE]/30">
          <h2 className="text-xl font-semibold mb-4 text-white">Conversation not found</h2>
          <p className="text-slate-300 mb-4">This conversation may not exist or you may not have access to it.</p>
          <Button onClick={() => setLocation("/dashboard")} className="bg-gradient-to-r from-[#4FACFE] to-teal text-white">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Success state - simple conversation display
  return (
    <div className="min-h-screen bg-gradient-radial from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Conversation {conversationId}</h1>
          <p className="text-slate-600 mb-4">
            Conversation between {conversation.participant1Email} and {conversation.participant2Email}
          </p>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Status: {conversation.currentTurn ? `${conversation.currentTurn}'s turn` : 'Waiting to start'}
            </p>
            <Button onClick={() => setLocation("/dashboard")} className="bg-gradient-to-r from-[#4FACFE] to-teal text-white">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}