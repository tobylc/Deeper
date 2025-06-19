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
  userRole: string, 
  otherUserRole: string
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
  return {
    userRole: '',
    otherUserRole: '',
    relationshipDisplay: relationshipType,
    conversationContext: relationshipType.toLowerCase()
  };
}

/**
 * Generate invitation text with specific roles
 */
export function getInvitationText(
  inviterRole: string,
  inviteeRole: string,
  relationshipType: string
): string {
  if (inviterRole && inviteeRole) {
    return `meaningful ${inviterRole.toLowerCase()}/${inviteeRole.toLowerCase()} conversations`;
  }
  
  return `meaningful ${relationshipType} conversations`;
}

/**
 * Generate conversation header text
 */
export function getConversationHeaderText(
  userRole: string,
  otherUserRole: string,
  relationshipType: string
): string {
  if (userRole && otherUserRole) {
    return `${userRole}/${otherUserRole} Conversation`;
  }
  
  return `${relationshipType} Conversation`;
}

/**
 * Generate email subject lines with specific roles
 */
export function getEmailSubjectWithRoles(
  action: string,
  inviterRole: string,
  inviteeRole: string,
  relationshipType: string
): string {
  if (inviterRole && inviteeRole) {
    return `${action} - ${inviterRole}/${inviteeRole} Connection on Deeper`;
  }
  
  return `${action} - ${relationshipType} Connection on Deeper`;
}

/**
 * Generate dashboard section headers
 */
export function getDashboardSectionTitle(
  userRole: string,
  otherUserRole: string,
  relationshipType: string,
  section: 'pending' | 'active' | 'ready'
): string {
  const roleDisplay = userRole && otherUserRole 
    ? `${userRole}/${otherUserRole}` 
    : relationshipType;
    
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