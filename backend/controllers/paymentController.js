const Stripe = require('stripe');
const User = require('../models/User');
const Payment = require('../models/Payment');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const createCheckoutSession = async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/dashboard?checkout_success=true`,
      cancel_url: `${req.headers.origin}/dashboard?canceled=true`,
      client_reference_id: req.user.uid,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      const userId = session.client_reference_id;
      const stripeCustomerId = session.customer;
      const stripeSubscriptionId = session.subscription;

      if (userId) {
        await User.findOneAndUpdate(
          { uid: userId },
          { 
            'subscription.status': 'pro',
            'subscription.stripeCustomerId': stripeCustomerId,
            'subscription.stripeSubscriptionId': stripeSubscriptionId 
          }
        );

        await Payment.create({
          userId,
          stripeSubscriptionId,
          amount: session.amount_total / 100,
          status: 'completed'
        });
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': subscription.id },
        { 
          'subscription.status': 'free',
          'subscription.stripeSubscriptionId': null 
        }
      );
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createCheckoutSession, handleWebhook };
