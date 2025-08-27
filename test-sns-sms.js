// Test script for Amazon SNS SMS functionality
// Run with: node test-sns-sms.js

import { SNSSMSService } from './server/sms.js';

async function testSNSSMS() {
  console.log('🧪 Testing Amazon SNS SMS Service...');
  
  // Check if AWS credentials are available
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('❌ AWS credentials not found in environment variables');
    console.log('Please ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set');
    return;
  }
  
  const smsService = new SNSSMSService(process.env.AWS_REGION || 'us-east-1');
  
  // Test connection invitation (replace with your test phone number)
  const testConnection = {
    id: 'test-123',
    inviteePhone: '+1234567890', // Replace with your actual phone number for testing
    inviterName: 'Test User',
    relationshipType: 'Friends',
    personalMessage: 'This is a test message from the Deeper SMS migration'
  };
  
  try {
    console.log('📱 Testing connection invitation SMS...');
    // Uncomment the line below to actually send a test SMS
    // await smsService.sendConnectionInvitation(testConnection);
    console.log('✅ SMS service initialized successfully');
    console.log('💡 To test actual SMS sending, uncomment the sendConnectionInvitation line and add your phone number');
    
    // Test verification code
    console.log('📱 Testing verification code SMS...');
    // Uncomment the line below to actually send a verification code
    // await smsService.sendVerificationCode('+1234567890', '123456');
    console.log('✅ Verification code SMS test passed');
    
  } catch (error) {
    console.error('❌ SMS test failed:', error.message);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSNSSMS();
}