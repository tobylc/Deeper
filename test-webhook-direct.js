// Test webhook processing directly with Stripe subscription data
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testWebhookProcessing() {
  try {
    console.log('Testing webhook processing with recent subscription data...');
    
    // Test with the subscription IDs from the logs
    const subscriptionIds = [
      'sub_1RdbscJk5EQAqG1WEscVLpyW',
      'sub_1RdcppJk5EQAqG1WBAaGZaDL'
    ];
    
    for (const subId of subscriptionIds) {
      console.log(`\n--- Testing subscription: ${subId} ---`);
      
      try {
        const subscription = await stripe.subscriptions.retrieve(subId, {
          expand: ['latest_invoice.payment_intent']
        });
        
        console.log(`Status: ${subscription.status}`);
        console.log(`Metadata:`, subscription.metadata);
        
        const latestInvoice = subscription.latest_invoice;
        const paymentIntent = latestInvoice?.payment_intent;
        
        if (paymentIntent) {
          console.log(`Payment Intent Status: ${paymentIntent.status}`);
          console.log(`Amount: ${paymentIntent.amount}`);
          console.log(`Amount Received: ${paymentIntent.amount_received}`);
        }
        
        // Check if this should trigger an upgrade
        const isDiscountSub = subscription.metadata?.discount_applied === '50';
        const hasSucceededPayment = paymentIntent?.status === 'succeeded' && paymentIntent.amount_received === 495;
        
        console.log(`Is discount subscription: ${isDiscountSub}`);
        console.log(`Should upgrade: ${isDiscountSub && hasSucceededPayment}`);
        
        if (paymentIntent) {
          console.log(`Payment Intent Details:`);
          console.log(`  ID: ${paymentIntent.id}`);
          console.log(`  Status: ${paymentIntent.status}`);
          console.log(`  Amount: ${paymentIntent.amount} cents`);
          console.log(`  Amount Received: ${paymentIntent.amount_received} cents`);
          console.log(`  Client Secret: ${paymentIntent.client_secret ? 'present' : 'missing'}`);
          
          if (paymentIntent.status !== 'succeeded') {
            console.log(`⚠️  Payment Intent not succeeded - current status: ${paymentIntent.status}`);
          }
        } else {
          console.log(`❌ No payment intent found`);
        }
        
      } catch (error) {
        console.error(`Error retrieving subscription ${subId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testWebhookProcessing();