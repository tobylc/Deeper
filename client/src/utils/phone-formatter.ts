/**
 * Phone number formatting utilities for US phone numbers
 */

export function formatPhoneNumber(value: string): string {
  // Handle empty input or just prefix
  if (!value || value.length <= 2) {
    return '+1';
  }
  
  // Extract only digits from the input (remove +, -, (, ), spaces, etc.)
  const digits = value.replace(/\D/g, '');
  
  // If no digits found, return the prefix
  if (digits.length === 0) {
    return '+1';
  }
  
  // Take only the last 10 digits (in case user types country code)
  const phoneDigits = digits.slice(-10);
  
  // Format as +1(XXX)XXX-XXXX based on how many digits we have
  if (phoneDigits.length <= 3) {
    return `+1(${phoneDigits}`;
  } else if (phoneDigits.length <= 6) {
    return `+1(${phoneDigits.slice(0, 3)})${phoneDigits.slice(3)}`;
  } else {
    return `+1(${phoneDigits.slice(0, 3)})${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6, 10)}`;
  }
}

export function extractDigitsForApi(formattedPhone: string): string {
  // Extract just the digits (excluding the country code prefix)
  const digits = formattedPhone.replace(/[^\d]/g, '');
  return `+1${digits}`;
}

export function isValidUSPhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/[^\d]/g, '');
  
  // Check if it's exactly 10 digits (US phone number)
  return digits.length === 10;
}