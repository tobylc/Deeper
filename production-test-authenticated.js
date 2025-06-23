#!/usr/bin/env node

/**
 * Comprehensive Production Test Suite - Authenticated User Flow
 * Tests the complete subscription upgrade flow with real authentication
 */

import http from 'http';
import crypto from 'crypto';

const baseUrl = 'http://localhost:5000';

// Test configuration
const testConfig = {
  testEmail: `test-${Date.now()}@example.com`,
  testPassword: 'TestPassword123!',
  testName: 'Test User'
};

console.log('🚀 Starting Authenticated Production Test Suite');
console.log('================================================');

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody,
            rawBody: body
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: {},
            rawBody: body
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Helper to extract session cookie
function extractSessionCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return '';
  
  for (const cookie of setCookie) {
    if (cookie.startsWith('connect.sid=')) {
      return cookie.split(';')[0];
    }
  }
  return '';
}

async function runAuthenticatedTests() {
  let sessionCookie = '';
  let testResults = [];

  try {
    // Test 1: Create a new user account
    console.log('\n📝 Test 1: Creating test user account...');
    const signupResponse = await makeRequest('POST', '/api/auth/signup', {
      email: testConfig.testEmail,
      password: testConfig.testPassword,
      firstName: 'Test',
      lastName: 'User'
    });

    if (signupResponse.status === 201) {
      sessionCookie = extractSessionCookie(signupResponse.headers);
      console.log('✅ User created successfully');
      testResults.push({ test: 'User Signup', status: 'PASS', details: 'Account created with session' });
    } else {
      console.log('❌ User creation failed:', signupResponse.body);
      testResults.push({ test: 'User Signup', status: 'FAIL', details: signupResponse.body });
      return testResults;
    }

    // Test 2: Verify authentication
    console.log('\n🔐 Test 2: Verifying authentication...');
    const authCheckResponse = await makeRequest('GET', '/api/auth/user', null, sessionCookie);
    
    if (authCheckResponse.status === 200) {
      console.log('✅ Authentication verified');
      console.log('User:', authCheckResponse.body.email);
      testResults.push({ test: 'Authentication Check', status: 'PASS', details: 'User authenticated successfully' });
    } else {
      console.log('❌ Authentication failed:', authCheckResponse.body);
      testResults.push({ test: 'Authentication Check', status: 'FAIL', details: authCheckResponse.body });
      return testResults;
    }

    // Test 3: Test subscription upgrade with discount
    console.log('\n💳 Test 3: Testing subscription upgrade (Advanced 50% off)...');
    const subscriptionResponse = await makeRequest('POST', '/api/subscriptions/upgrade', {
      tier: 'advanced',
      discountPercent: 50
    }, sessionCookie);

    console.log('Subscription Response Status:', subscriptionResponse.status);
    console.log('Subscription Response Body:', JSON.stringify(subscriptionResponse.body, null, 2));

    if (subscriptionResponse.status === 200 && subscriptionResponse.body.success) {
      console.log('✅ Subscription upgrade successful');
      console.log('Client Secret:', subscriptionResponse.body.clientSecret ? 'Present' : 'Missing');
      testResults.push({ test: 'Subscription Upgrade', status: 'PASS', details: 'Discount subscription created successfully' });
    } else {
      console.log('❌ Subscription upgrade failed');
      console.log('Error details:', subscriptionResponse.body);
      testResults.push({ 
        test: 'Subscription Upgrade', 
        status: 'FAIL', 
        details: `Status: ${subscriptionResponse.status}, Body: ${JSON.stringify(subscriptionResponse.body)}` 
      });
    }

    // Test 4: Test trial status endpoint
    console.log('\n⏰ Test 4: Testing trial status endpoint...');
    const trialStatusResponse = await makeRequest('GET', '/api/subscription/trial-status', null, sessionCookie);
    
    if (trialStatusResponse.status === 200) {
      console.log('✅ Trial status endpoint working');
      console.log('Trial data:', trialStatusResponse.body);
      testResults.push({ test: 'Trial Status', status: 'PASS', details: 'Trial status retrieved successfully' });
    } else {
      console.log('❌ Trial status endpoint failed:', trialStatusResponse.body);
      testResults.push({ test: 'Trial Status', status: 'FAIL', details: trialStatusResponse.body });
    }

  } catch (error) {
    console.error('❌ Test suite error:', error);
    testResults.push({ test: 'Test Suite', status: 'ERROR', details: error.message });
  }

  // Results summary
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  testResults.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${statusIcon} ${result.test}: ${result.status}`);
    if (result.status !== 'PASS') {
      console.log(`   Details: ${result.details}`);
    }
  });

  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const totalCount = testResults.length;
  
  console.log(`\n🎯 Overall Result: ${passCount}/${totalCount} tests passed`);
  
  if (passCount === totalCount) {
    console.log('🎉 All tests passed! System is production ready.');
  } else {
    console.log('⚠️  Some tests failed. Review the details above.');
  }

  return testResults;
}

// Run the test suite
runAuthenticatedTests().catch(console.error);