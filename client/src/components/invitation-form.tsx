import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle } from "lucide-react";

interface InvitationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvitationForm({ onClose, onSuccess }: InvitationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    inviteeEmail: "",
    relationshipType: "",
    personalMessage: "",
  });

  const relationshipTypes = [
    "Parent-Child",
    "Romantic Partners",
    "Friends",
    "Siblings", 
    "Grandparents",
    "Long-distance",
    "Other"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!formData.inviteeEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.relationshipType) {
      toast({
        title: "Validation Error",
        description: "Please select a relationship type",
        variant: "destructive",
      });
      return;
    }

    if (formData.inviteeEmail.toLowerCase() === user.email.toLowerCase()) {
      toast({
        title: "Validation Error",
        description: "You cannot invite yourself",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/connections", {
        inviterEmail: user.email,
        inviteeEmail: formData.inviteeEmail.trim(),
        relationshipType: formData.relationshipType,
        personalMessage: formData.personalMessage.trim(),
      });
      
      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${formData.inviteeEmail}`,
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Send Invitation
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Their Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="someone@example.com"
              value={formData.inviteeEmail}
              onChange={(e) => setFormData({ ...formData, inviteeEmail: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship Type</Label>
            <Select 
              value={formData.relationshipType} 
              onValueChange={(value) => setFormData({ ...formData, relationshipType: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship type" />
              </SelectTrigger>
              <SelectContent>
                {relationshipTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Hey! I'd love to have some deeper conversations with you..."
              value={formData.personalMessage}
              onChange={(e) => setFormData({ ...formData, personalMessage: e.target.value })}
              className="h-24 resize-none"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-darkslate mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-success" />
              What happens next?
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• They'll receive a beautiful email invitation</li>
              <li>• They can accept or decline thoughtfully</li>
              <li>• Only if both agree, the conversation space is created</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.inviteeEmail || !formData.relationshipType}
              className="flex-1"
            >
              {isLoading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
