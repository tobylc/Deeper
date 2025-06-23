import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Production readiness test suite for subscription system
async function runProductionTests() {
  console.log('🚀 Running comprehensive production readiness tests...\n');
  
  const results = {
    stripe_config: false,
    database_connection: false,
    api_endpoints: false,
    pricing_consistency: false,
    email_service: false,
    environment_variables: false
  };

  try {
    // Test 1: Environment Variables
    console.log('Test 1: Checking environment variables...');
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_PRICE_ID_BASIC',
      'STRIPE_PRICE_ID_ADVANCED', 
      'STRIPE_PRICE_ID_UNLIMITED',
      'STRIPE_PRICE_ID_ADVANCED_50_OFF',
      'DATABASE_URL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length === 0) {
      console.log('✅ All required environment variables present');
      results.environment_variables = true;
    } else {
      console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    }

    // Test 2: Database Connection
    console.log('\nTest 2: Testing database connection...');
    try {
      const { DatabaseStorage } = await import('./server/storage');
      const storage = new DatabaseStorage();
      await storage.getConnections();
      console.log('✅ Database connection successful');
      results.database_connection = true;
    } catch (error) {
      console.log(`❌ Database connection failed: ${error.message}`);
    }

    // Test 3: Stripe Configuration
    console.log('\nTest 3: Testing Stripe configuration...');
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      // Test customer creation
      const testCustomer = await stripe.customers.create({
        email: 'test@example.com',
        name: 'Test Customer'
      });
      
      // Test price retrieval
      const advancedPrice = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_ADVANCED_50_OFF!);
      
      // Cleanup test customer
      await stripe.customers.del(testCustomer.id);
      
      console.log('✅ Stripe configuration valid');
      console.log(`   - 50% discount price: $${advancedPrice.unit_amount! / 100}`);
      results.stripe_config = true;
    } catch (error) {
      console.log(`❌ Stripe configuration failed: ${error.message}`);
    }

    // Test 4: Email Service Configuration
    console.log('\nTest 4: Testing email service...');
    const hasEmailConfig = !!(process.env.SENDGRID_API_KEY || process.env.CONSOLE_EMAIL);
    if (hasEmailConfig) {
      console.log('✅ Email service configured');
      results.email_service = true;
    } else {
      console.log('❌ No email service configured');
    }

    // Test 5: API Endpoint Structure
    console.log('\nTest 5: Validating API endpoint structure...');
    try {
      const routesContent = await import('fs').then(fs => 
        fs.promises.readFile('./server/routes.ts', 'utf-8')
      );
      
      const requiredEndpoints = [
        '/api/subscriptions/upgrade',
        '/api/subscriptions/trial-status',
        '/api/stripe/webhook'
      ];
      
      const missingEndpoints = requiredEndpoints.filter(endpoint => 
        !routesContent.includes(endpoint)
      );
      
      if (missingEndpoints.length === 0) {
        console.log('✅ All required API endpoints present');
        results.api_endpoints = true;
      } else {
        console.log(`❌ Missing endpoints: ${missingEndpoints.join(', ')}`);
      }
    } catch (error) {
      console.log(`❌ Could not validate endpoints: ${error.message}`);
    }

    // Test 6: Pricing Consistency
    console.log('\nTest 6: Checking pricing consistency...');
    try {
      const pricingContent = await import('fs').then(fs =>
        fs.promises.readFile('./client/src/pages/pricing.tsx', 'utf-8')
      );
      const checkoutContent = await import('fs').then(fs =>
        fs.promises.readFile('./client/src/pages/checkout.tsx', 'utf-8')
      );
      
      const hasPricing495 = pricingContent.includes('$4.95') && checkoutContent.includes('$4.95');
      const hasAdvancedTier = pricingContent.includes('Advanced') && checkoutContent.includes('Advanced');
      
      if (hasPricing495 && hasAdvancedTier) {
        console.log('✅ Pricing consistency validated ($4.95 Advanced discount)');
        results.pricing_consistency = true;
      } else {
        console.log('❌ Pricing inconsistency detected');
      }
    } catch (error) {
      console.log(`❌ Could not validate pricing: ${error.message}`);
    }

    // Summary
    console.log('\n📊 Production Readiness Summary:');
    console.log('=====================================');
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testName = test.replace(/_/g, ' ').toUpperCase();
      console.log(`${status} ${testName}`);
    });
    
    console.log(`\n🎯 Score: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 System is 100% production ready!');
      return true;
    } else {
      console.log('⚠️  System requires attention before production deployment');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  runProductionTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runProductionTests };