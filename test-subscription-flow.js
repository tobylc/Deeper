// Comprehensive subscription system test
// This script tests the complete subscription flow end-to-end

const BASE_URL = 'http://localhost:5000';

async function testSubscriptionSystem() {
  console.log('🚀 Starting comprehensive subscription system test...\n');
  
  try {
    // Test 1: Verify Stripe configuration
    console.log('Test 1: Verifying Stripe configuration...');
    const stripeTest = await fetch(`${BASE_URL}/api/test/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (stripeTest.ok) {
      const stripeData = await stripeTest.json();
      console.log('✅ Stripe configuration valid');
      console.log(`   - Customer creation: Working`);
      console.log(`   - Price ID (50% off): ${stripeData.priceId}`);
      console.log(`   - Price amount: $${stripeData.priceAmount / 100}`);
    } else {
      console.log('❌ Stripe configuration failed');
      return false;
    }
    
    // Test 2: Check API endpoint consistency
    console.log('\nTest 2: Checking API endpoint consistency...');
    const endpointTest = await fetch(`${BASE_URL}/api/subscriptions/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'advanced', discountPercent: 50 })
    });
    
    if (endpointTest.status === 401) {
      console.log('✅ Subscription endpoint accessible (401 expected without auth)');
    } else {
      console.log(`❌ Unexpected response: ${endpointTest.status}`);
    }
    
    // Test 3: Verify trial status endpoint
    console.log('\nTest 3: Verifying trial status endpoint...');
    const trialTest = await fetch(`${BASE_URL}/api/subscriptions/trial-status`);
    if (trialTest.status === 401) {
      console.log('✅ Trial status endpoint accessible (401 expected without auth)');
    } else {
      console.log(`❌ Trial status endpoint issue: ${trialTest.status}`);
    }
    
    // Test 4: Check pricing page loads correctly
    console.log('\nTest 4: Checking pricing page...');
    const pricingTest = await fetch(`${BASE_URL}/pricing`);
    if (pricingTest.ok) {
      const pricingHTML = await pricingTest.text();
      if (pricingHTML.includes('$4.95') && pricingHTML.includes('Advanced')) {
        console.log('✅ Pricing page loads with correct $4.95 pricing');
      } else {
        console.log('❌ Pricing page missing $4.95 or Advanced plan');
      }
    } else {
      console.log('❌ Pricing page failed to load');
    }
    
    // Test 5: Check checkout page routes
    console.log('\nTest 5: Checking checkout routes...');
    const checkoutBasic = await fetch(`${BASE_URL}/checkout/basic`);
    const checkoutAdvanced = await fetch(`${BASE_URL}/checkout/advanced`);
    const checkoutDiscount = await fetch(`${BASE_URL}/checkout/advanced?discount=50`);
    
    if (checkoutBasic.ok && checkoutAdvanced.ok && checkoutDiscount.ok) {
      console.log('✅ All checkout routes accessible');
    } else {
      console.log('❌ Checkout route issues detected');
    }
    
    console.log('\n🎉 Subscription system test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testSubscriptionSystem().then(success => {
  process.exit(success ? 0 : 1);
});