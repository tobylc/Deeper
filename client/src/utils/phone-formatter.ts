/**
 * Phone number formatting utilities for US phone numbers
 */

export function formatPhoneNumber(value: string): string {
  // Handle empty input or just prefix
  if (!value || value === '+' || value === '+1') {
    return '+1';
  }
  
  // Extract only digits from the input (remove +, -, (, ), spaces, etc.)
  const digits = value.replace(/\D/g, '');
  
  // If no digits found, return the prefix
  if (digits.length === 0) {
    return '+1';
  }
  
  // Handle US country code properly
  let phoneDigits;
  if (digits.startsWith('1') && digits.length > 1) {
    // If starts with 1 and has more digits, assume it's +1 followed by 10-digit number
    phoneDigits = digits.slice(1, 11); // Take digits after the '1' country code, max 10 digits
  } else {
    // If doesn't start with 1, treat all digits as the phone number
    phoneDigits = digits.slice(0, 10); // Take first 10 digits
  }
  
  // Format as +1(XXX)XXX-XXXX based on how many digits we have
  if (phoneDigits.length === 0) {
    return '+1';
  } else if (phoneDigits.length === 1) {
    return `+1(${phoneDigits}`;
  } else if (phoneDigits.length === 2) {
    return `+1(${phoneDigits}`;
  } else if (phoneDigits.length === 3) {
    return `+1(${phoneDigits})`;
  } else if (phoneDigits.length <= 6) {
    return `+1(${phoneDigits.slice(0, 3)})${phoneDigits.slice(3)}`;
  } else {
    return `+1(${phoneDigits.slice(0, 3)})${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
  }
}

export function extractDigitsForApi(formattedPhone: string): string {
  // Extract just the digits from the formatted phone number
  const digits = formattedPhone.replace(/[^\d]/g, '');
  
  // Handle case where digits already include country code
  if (digits.startsWith('1') && digits.length === 11) {
    return `+${digits}`;
  } else if (digits.length === 10) {
    return `+1${digits}`;
  } else {
    // Fallback - assume it's a 10-digit US number
    return `+1${digits.slice(-10)}`;
  }
}

export function isValidUSPhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/[^\d]/g, '');
  
  // Check if it's exactly 10 digits (US phone number) or 11 digits starting with 1
  if (digits.length === 10) {
    return true;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return true;
  }
  return false;
}