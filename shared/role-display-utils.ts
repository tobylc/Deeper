/**
 * Utility functions for displaying personalized role-based text throughout the application
 */

export interface RoleDisplayInfo {
  userRole: string;
  otherUserRole: string;
  relationshipDisplay: string;
  conversationContext: string;
}

/**
 * Generate personalized relationship display text based on specific roles
 */
export function getRoleDisplayInfo(
  relationshipType: string, 
  userRole: string | null | undefined, 
  otherUserRole: string | null | undefined
): RoleDisplayInfo {
  // If we have specific roles, use them for personalized display
  if (userRole && otherUserRole) {
    return {
      userRole,
      otherUserRole,
      relationshipDisplay: `${userRole}/${otherUserRole}`,
      conversationContext: `${userRole.toLowerCase()} and ${otherUserRole.toLowerCase()}`
    };
  }
  
  // Fallback to relationship type if roles aren't available
  const safeRelationshipType = relationshipType || 'Connection';
  return {
    userRole: '',
    otherUserRole: '',
    relationshipDisplay: safeRelationshipType,
    conversationContext: safeRelationshipType.toLowerCase()
  };
}

/**
 * Generate invitation text with specific roles
 */
export function getInvitationText(
  inviterRole: string | null | undefined,
  inviteeRole: string | null | undefined,
  relationshipType: string
): string {
  if (inviterRole && inviteeRole) {
    return `meaningful ${inviterRole.toLowerCase()}/${inviteeRole.toLowerCase()} conversations`;
  }
  
  const safeRelationshipType = relationshipType || 'connection';
  return `meaningful ${safeRelationshipType.toLowerCase()} conversations`;
}

/**
 * Generate conversation header text
 */
export function getConversationHeaderText(
  userRole: string | null | undefined,
  otherUserRole: string | null | undefined,
  relationshipType: string
): string {
  if (userRole && otherUserRole) {
    return `${userRole}/${otherUserRole} Conversation`;
  }
  
  const safeRelationshipType = relationshipType || 'Connection';
  return `${safeRelationshipType} Conversation`;
}

/**
 * Generate email subject lines with specific roles
 */
export function getEmailSubjectWithRoles(
  action: string,
  inviterRole: string | null | undefined,
  inviteeRole: string | null | undefined,
  relationshipType: string
): string {
  if (inviterRole && inviteeRole) {
    return `${action} - ${inviterRole}/${inviteeRole} Connection on Deeper`;
  }
  
  const safeRelationshipType = relationshipType || 'Connection';
  return `${action} - ${safeRelationshipType} Connection on Deeper`;
}

/**
 * Generate dashboard section headers
 */
export function getDashboardSectionTitle(
  userRole: string | null | undefined,
  otherUserRole: string | null | undefined,
  relationshipType: string,
  section: 'pending' | 'active' | 'ready'
): string {
  const safeRelationshipType = relationshipType || 'Connection';
  const roleDisplay = userRole && otherUserRole 
    ? `${userRole}/${otherUserRole}` 
    : safeRelationshipType;
    
  switch (section) {
    case 'pending':
      return `Pending ${roleDisplay} Invitations`;
    case 'active':
      return `Active ${roleDisplay} Conversations`;
    case 'ready':
      return `Ready to Start ${roleDisplay} Conversations`;
    default:
      return `${roleDisplay} Connections`;
  }
}