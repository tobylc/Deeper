// Final verification of complete subscription flow

async function verifySubscriptionFlow() {
  console.log('Starting end-to-end subscription flow verification...\n');
  
  // Verify key pages load correctly
  const pagesToTest = [
    { url: 'http://localhost:5000', name: 'Landing Page' },
    { url: 'http://localhost:5000/pricing', name: 'Pricing Page' },
    { url: 'http://localhost:5000/checkout/advanced?discount=50', name: 'Discount Checkout' },
    { url: 'http://localhost:5000/features', name: 'Features Page' }
  ];

  for (const page of pagesToTest) {
    try {
      const response = await fetch(page.url);
      if (response.ok) {
        const html = await response.text();
        
        // Check for key elements
        if (page.name === 'Pricing Page') {
          const has495 = html.includes('$4.95');
          const hasAdvanced = html.includes('Advanced');
          console.log(`✅ ${page.name}: $4.95 pricing ${has495 ? 'found' : 'missing'}, Advanced plan ${hasAdvanced ? 'found' : 'missing'}`);
        } else if (page.name === 'Discount Checkout') {
          const hasDiscount = html.includes('50%') || html.includes('4.95');
          console.log(`✅ ${page.name}: Discount elements ${hasDiscount ? 'found' : 'missing'}`);
        } else {
          console.log(`✅ ${page.name}: Loads successfully`);
        }
      } else {
        console.log(`❌ ${page.name}: Failed to load (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${page.name}: Error - ${error.message}`);
    }
  }

  // Verify API endpoints respond correctly
  const apiEndpoints = [
    { path: '/api/subscriptions/trial-status', expectedStatus: 401 },
    { path: '/api/subscriptions/upgrade', expectedStatus: 401 },
    { path: '/api/health/subscription-system', expectedStatus: 200 }
  ];

  console.log('\nVerifying API endpoints...');
  for (const endpoint of apiEndpoints) {
    try {
      const response = await fetch(`http://localhost:5000${endpoint.path}`, {
        method: endpoint.path.includes('upgrade') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.path.includes('upgrade') ? JSON.stringify({ tier: 'advanced' }) : undefined
      });
      
      if (response.status === endpoint.expectedStatus) {
        console.log(`✅ ${endpoint.path}: Responds correctly (${response.status})`);
      } else {
        console.log(`⚠️ ${endpoint.path}: Unexpected status ${response.status} (expected ${endpoint.expectedStatus})`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.path}: Error - ${error.message}`);
    }
  }

  console.log('\n🎯 Subscription system verification complete!');
}

verifySubscriptionFlow().catch(console.error);