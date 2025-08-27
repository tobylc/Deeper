import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircleQuestion } from "lucide-react";

interface QuestionDetectionPopupProps {
  isOpen: boolean;
  message: string;
  onConfirmNewQuestion: () => void;
  onKeepAsResponse: () => void;
}

export default function QuestionDetectionPopup({
  isOpen,
  message,
  onConfirmNewQuestion,
  onKeepAsResponse,
}: QuestionDetectionPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-2 border-ocean/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-ocean to-teal rounded-full flex items-center justify-center mb-4">
            <MessageCircleQuestion className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Start a New Conversation?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border">
            <p className="text-sm text-slate-600 mb-2">Your message:</p>
            <p className="text-sm font-medium text-slate-800 italic">"{message}"</p>
          </div>
          
          <p className="text-sm text-slate-600 text-center leading-relaxed">
            I noticed your message ends with a question mark. Would you like to start a new conversation thread with this question, or send it as a response to the current conversation?
          </p>
          
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={onConfirmNewQuestion}
              className="w-full bg-gradient-to-r from-ocean to-teal hover:from-ocean/90 hover:to-teal/90 text-white font-medium"
            >
              Yes, Start New Conversation
            </Button>
            
            <Button
              onClick={onKeepAsResponse}
              variant="outline"
              className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              No, Send as Response
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}