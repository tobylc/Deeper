import type { User } from "./schema";

/**
 * Get display name for a user, preferring full name over email
 */
export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return "Unknown User";
  
  // If we have both first and last name, use full name
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  // If we only have first name, use that
  if (user.firstName) {
    return user.firstName;
  }
  
  // If we only have last name, use that
  if (user.lastName) {
    return user.lastName;
  }
  
  // Fallback to email username if no names available
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return "Unknown User";
}

/**
 * Get display name from email address when user object is not available
 */
export function getDisplayNameFromEmail(email: string | null | undefined): string {
  if (!email) return "Unknown User";
  return email.split('@')[0];
}

/**
 * Get short display name (first name only or email username)
 */
export function getShortDisplayName(user: User | null | undefined): string {
  if (!user) return "Unknown User";
  
  if (user.firstName) {
    return user.firstName;
  }
  
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return "Unknown User";
}