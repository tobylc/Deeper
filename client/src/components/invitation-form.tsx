import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle, AlertTriangle } from "lucide-react";
import TrialExpirationPopup from "@/components/trial-expiration-popup";
import { relationshipRoles, getRolesForRelationship, getValidRolePairs } from "@shared/relationship-roles";
import type { Connection } from "@shared/schema";

// Function to generate personalized placeholder text based on relationship
function getPersonalizedPlaceholder(relationshipType: string, inviterRole: string, inviteeRole: string): string {
  if (!relationshipType || !inviterRole || !inviteeRole) {
    return "Share what this conversation opportunity means to you and why you'd like to connect...";
  }

  const key = `${relationshipType}-${inviterRole}-${inviteeRole}`;
  
  // Specific relationship-based examples
  const examples: { [key: string]: string } = {
    // Parent-Child relationships
    "Parent-Child-Father-Son": "Hey son, I've been thinking about how much I'd love to connect with you on a deeper level. I know we've both been busy, but I really want to understand your world better and share more of mine with you. This could be a chance for us to grow closer as father and son.",
    "Parent-Child-Father-Daughter": "My dear daughter, I've been reflecting on our relationship and would love the opportunity to have more meaningful conversations with you. I want to be someone you feel comfortable sharing with, and I'd love to learn more about who you're becoming as a person.",
    "Parent-Child-Mother-Son": "My son, I've been thinking about how we can strengthen our bond. I'd love to have a space where we can talk openly about life, dreams, and everything in between. You mean the world to me, and I want to understand you better.",
    "Parent-Child-Mother-Daughter": "Sweetheart, I'd love to create a special space for us to connect more deeply. I want to be someone you can always talk to, and I'm excited about the possibility of growing closer through meaningful conversations.",
    "Parent-Child-Son-Father": "Dad, I've been thinking about our relationship and would love the chance to connect with you on a deeper level. I want to understand your experiences better and share more of what's going on in my life. I think this could really strengthen our bond.",
    "Parent-Child-Daughter-Father": "Dad, I'd really love the opportunity to have more meaningful conversations with you. I want to know more about your stories, your wisdom, and I'd love to share more of my world with you too.",
    "Parent-Child-Son-Mother": "Mom, I'd love to have a special place where we can talk about life, dreams, and everything that matters. You've always been there for me, and I want to deepen our connection through honest conversations.",
    "Parent-Child-Daughter-Mother": "Mom, I've been thinking about how much I value our relationship, and I'd love to have deeper conversations with you. I want to share more of my life with you and learn from your experiences.",
    
    // Siblings
    "Siblings-Brother-Brother": "Hey brother, I've been thinking about how we can reconnect and build a stronger relationship. I know we've grown apart over the years, but I'd love to understand who you are now and share what's been happening in my life. Let's see if we can grow closer as adults.",
    "Siblings-Sister-Sister": "Hey sis, I'd love the chance to reconnect with you on a deeper level. I miss having meaningful conversations with you, and I think this could be a beautiful way for us to strengthen our sisterly bond.",
    "Siblings-Brother-Sister": "Hey sis, I've been reflecting on our relationship and would love to connect with you more deeply. I want to be a better brother and understand your world better. This could be a chance for us to grow closer.",
    "Siblings-Sister-Brother": "Hey brother, I'd love the opportunity to have more meaningful conversations with you. I want to understand your perspective better and share more of what's important to me. Let's see if we can strengthen our sibling bond.",
    
    // Romantic Partners
    "Romantic Partners-Boyfriend-Girlfriend": "My love, I'd love for us to have a dedicated space for deeper conversations. I want to understand your heart better, share my thoughts more openly, and grow even closer together. What do you think?",
    "Romantic Partners-Girlfriend-Boyfriend": "Babe, I've been thinking about how we can deepen our connection even more. I'd love to have meaningful conversations about our dreams, fears, and everything in between. This could be beautiful for our relationship.",
    "Romantic Partners-Husband-Wife": "My dear wife, after all these years together, I'd love to rediscover new depths in our relationship. I want to keep growing with you and learning about who you're becoming. This could be a gift to our marriage.",
    "Romantic Partners-Wife-Husband": "My love, I'd love for us to have a special place to connect on an even deeper level. After all we've shared, I'm excited about discovering new layers of our relationship through meaningful conversations.",
    "Romantic Partners-Partner-Partner": "My darling, I'd love to explore deeper conversations with you. I want to understand your inner world better and share more of mine with you. This could be a beautiful way to strengthen our bond.",
    
    // Friends
    "Friends-Best Friend-Best Friend": "Hey bestie, I've been thinking about how much our friendship means to me, and I'd love to take our conversations to an even deeper level. I want to understand you better and share more of my authentic self with you.",
    "Friends-Close Friend-Close Friend": "My friend, I really value our friendship and would love the chance to connect with you on a deeper level. I think meaningful conversations could make our friendship even stronger.",
    "Friends-Friend-Friend": "Hey there, I've been thinking about our friendship and would love to have more meaningful conversations with you. I'd love to understand your perspective better and share more of what's important to me.",
    
    // Grandparents
    "Grandparents-Grandfather-Grandson": "My dear grandson, I've been thinking about all the stories and wisdom I'd love to share with you, and all the things I'd love to learn about your generation. This could be a beautiful way for us to connect across the years.",
    "Grandparents-Grandmother-Granddaughter": "My precious granddaughter, I'd love to have deeper conversations with you about life, dreams, and family stories. I want to understand your world better and share some of the lessons I've learned along the way.",
    "Grandparents-Grandson-Grandfather": "Grandpa, I'd love to learn more about your life experiences and share what's happening in mine. I think we could have some really meaningful conversations that would help me understand our family history better.",
    "Grandparents-Granddaughter-Grandmother": "Grandma, I'd love to hear more of your stories and share what's going on in my life. I think deeper conversations between us could be really special and meaningful.",
  };

  return examples[key] || `I'd love to connect with you more deeply as your ${inviterRole.toLowerCase()}. This invitation represents an opportunity for us to understand each other better and strengthen our ${relationshipType.toLowerCase()} relationship through meaningful conversations.`;
}

interface InvitationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvitationForm({ onClose, onSuccess }: InvitationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showTrialExpirationPopup, setShowTrialExpirationPopup] = useState(false);
  const [formData, setFormData] = useState({
    inviteeEmail: "",
    relationshipType: "",
    inviterRole: "",
    inviteeRole: "",
    personalMessage: "",
  });
  
  // Track message interaction state
  const [messageState, setMessageState] = useState<'placeholder' | 'example' | 'custom'>('placeholder');

  // Get the current example text based on relationship details
  const currentExample = getPersonalizedPlaceholder(formData.relationshipType, formData.inviterRole, formData.inviteeRole);

  // Handle button actions for message management
  const handleUseExample = () => {
    setFormData({ ...formData, personalMessage: currentExample });
    setMessageState('example');
  };

  const handleEditExample = () => {
    setFormData({ ...formData, personalMessage: currentExample });
    setMessageState('custom');
  };

  const handleRewrite = () => {
    setFormData({ ...formData, personalMessage: "" });
    setMessageState('custom');
  };

  // Update message state when user types
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, personalMessage: e.target.value });
    if (e.target.value === currentExample) {
      setMessageState('example');
    } else if (e.target.value === "") {
      setMessageState('placeholder');
    } else {
      setMessageState('custom');
    }
  };

  // Reset message state when relationship details change
  const handleRelationshipChange = (value: string) => {
    setFormData({ ...formData, relationshipType: value, inviterRole: "", inviteeRole: "", personalMessage: "" });
    setMessageState('placeholder');
  };

  const handleInviterRoleChange = (value: string) => {
    setFormData({ ...formData, inviterRole: value, inviteeRole: "", personalMessage: "" });
    setMessageState('placeholder');
  };

  const handleInviteeRoleChange = (value: string) => {
    setFormData({ ...formData, inviteeRole: value, personalMessage: "" });
    setMessageState('placeholder');
  };

  // Check if user was invited by someone else (is an invitee)
  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: [`/api/connections/${user?.email}`],
    enabled: !!user?.email,
  });

  const isInviteeUser = connections.some(c => c.inviteeEmail === user?.email);

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

    if (!formData.inviterRole) {
      toast({
        title: "Validation Error",
        description: "Please select your role in this relationship",
        variant: "destructive",
      });
      return;
    }

    if (!formData.inviteeRole) {
      toast({
        title: "Validation Error",
        description: "Please select their role in this relationship",
        variant: "destructive",
      });
      return;
    }

    if (formData.inviteeEmail.toLowerCase() === user.email?.toLowerCase()) {
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
        inviteeEmail: formData.inviteeEmail.trim(),
        relationshipType: formData.relationshipType,
        inviterRole: formData.inviterRole,
        inviteeRole: formData.inviteeRole,
        personalMessage: formData.personalMessage.trim(),
      });
      
      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${formData.inviteeEmail}`,
      });
      
      onSuccess();
    } catch (error: any) {
      console.log("Invitation error:", error);
      
      if (error.status === 409 || error.response?.status === 409) {
        toast({
          title: "Connection Already Exists",
          description: "You already have a connection with this person",
          variant: "destructive",
        });
      } else if (error.status === 403 || error.response?.status === 403) {
        const errorData = error.response?.data || error;
        if (errorData.type === 'TRIAL_EXPIRED' && !isInviteeUser) {
          setShowTrialExpirationPopup(true);
        } else if (errorData.type === 'SUBSCRIPTION_CANCELED' && !isInviteeUser) {
          setShowTrialExpirationPopup(true); // Reuse the same popup for upgrade flow
        } else if (errorData.type === 'SUBSCRIPTION_LIMIT') {
          toast({
            title: "Connection Limit Reached",
            description: `You've reached your limit of ${errorData.maxAllowed} connections. Upgrade your plan to invite more people.`,
          });
          // Close form and redirect to pricing
          onClose();
          setTimeout(() => {
            window.location.href = '/pricing';
          }, 1000);
        } else {
          toast({
            title: "Unable to send invitation",
            description: errorData.message || "Please try again in a moment",
          });
        }
      } else {
        toast({
          title: "Unable to send invitation",
          description: error.message || "Please try again in a moment",
        });
      }
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
              onValueChange={handleRelationshipChange}
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

          {/* Role Selection - Only show after relationship type is selected */}
          {formData.relationshipType && (
            <>
              <div className="space-y-2">
                <Label htmlFor="inviterRole">Your Role</Label>
                <Select 
                  value={formData.inviterRole} 
                  onValueChange={handleInviterRoleChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="What are you in this relationship?" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRolesForRelationship(formData.relationshipType).map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.inviterRole && (
                <div className="space-y-2">
                  <Label htmlFor="inviteeRole">Their Role</Label>
                  <Select 
                    value={formData.inviteeRole} 
                    onValueChange={handleInviteeRoleChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="What are they in this relationship?" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(
                        getValidRolePairs(formData.relationshipType)
                          .filter(pair => pair.role1 === formData.inviterRole || pair.role2 === formData.inviterRole)
                          .map(pair => pair.role1 === formData.inviterRole ? pair.role2 : pair.role1)
                      )).map(role => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Share why this invitation matters to you</Label>
            
            {/* Show action buttons only when we have relationship details and no custom message */}
            {formData.relationshipType && formData.inviterRole && formData.inviteeRole && messageState === 'placeholder' && (
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseExample}
                  className="text-xs px-3 py-1 h-7"
                >
                  Use Example
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleEditExample}
                  className="text-xs px-3 py-1 h-7"
                >
                  Edit Example
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRewrite}
                  className="text-xs px-3 py-1 h-7"
                >
                  Write Your Own
                </Button>
              </div>
            )}

            <Textarea
              id="message"
              placeholder={messageState === 'placeholder' && formData.relationshipType && formData.inviterRole && formData.inviteeRole 
                ? "Choose an option above to get started with your personal message..." 
                : "Share what this conversation opportunity means to you..."
              }
              value={formData.personalMessage}
              onChange={handleMessageChange}
              className="h-24 resize-none"
            />
            
            {/* Show helpful text based on current state */}
            {messageState === 'example' && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Using example message - you can edit this text if you'd like to personalize it further
              </p>
            )}
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

      {/* Trial Expiration Popup */}
      <TrialExpirationPopup
        isOpen={showTrialExpirationPopup}
        onClose={() => setShowTrialExpirationPopup(false)}
        action="invite"
      />
    </Dialog>
  );
}
