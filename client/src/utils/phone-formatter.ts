/**
 * Phone number formatting utilities for US phone numbers
 */

export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits (US phone number without country code)
  const limitedDigits = digits.slice(0, 10);
  
  // Format as +1-XXX-XXX-XXXX
  if (limitedDigits.length === 0) {
    return '+1-';
  } else if (limitedDigits.length <= 3) {
    return `+1-${limitedDigits}`;
  } else if (limitedDigits.length <= 6) {
    return `+1-${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
  } else {
    return `+1-${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  }
}

export function extractDigitsForApi(formattedPhone: string): string {
  // Extract just the digits and add +1 prefix for API
  const digits = formattedPhone.replace(/\D/g, '');
  return `+1${digits}`;
}

export function isValidUSPhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Check if it's exactly 10 digits (US phone number)
  return digits.length === 10;
}