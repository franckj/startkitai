import {
	handleCheckoutSessionCompleted,
	handleSubscriptionDeleted,
	handleSubscriptionUpdated
} from '#helpers/payments.js';

import Stripe from 'stripe';
import { rawBody } from '#api/middleware/raw-body.js';
import router from '@koa/router';

const stripeApiKey = process.env.STRIPE_API_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = Stripe(stripeApiKey);

const stripeRouter = router();
stripeRouter.use(rawBody);

stripeRouter.post('/api/webhooks/stripe', async (ctx) => {
	let event;
	try {
		// It's recommended to verify that the webhook requests are coming from Stripe like this
		const stripeSignatureHeader = ctx.request.headers['stripe-signature'];
		event = stripe.webhooks.constructEvent(ctx.rawBody, stripeSignatureHeader, stripeWebhookSecret);
	} catch (err) {
		ctx.throw(400, `Failed to verify Stripe webhook event: ${err.message}`, {
			error: err
		});
		return;
	}

	const { type, data } = event;

	switch (type) {
		case 'checkout.session.completed': {
			// The user completed the checkout and paid successfully
			// ✨ Provision access to your product
			await handleCheckoutSessionCompleted(data.object);
			break;
		}
		case 'checkout.session.expired': {
			// The user opened the checkout but did not complete the payment
			// (optional) Send a cart expired email
			break;
		}
		case 'customer.subscription.updated': {
			// The user changed their subscription.
			//
			// ✨ If the plan was upgraded or downgraded change access to your product
			//
			// If the plan was canceled make a note of this on the user
			// as this event is received before the end of the cancelation
			// period. A 'customer.subscription.deleted' event will be fired
			// when the billing period is finished
			//
			// (optional) If the plan was reactivated make a note of this on the user
			handleSubscriptionUpdated(data.object, data.previous_attributes);
			break;
		}
		case 'customer.subscription.deleted': {
			// The user deleted their subscription
			// 🚫 Remove access to your product
			handleSubscriptionDeleted(data.object);
			break;
		}
	}

	// only send 200 when we're done, then the customer will
	// get redirected to the success url
	ctx.status = 200;
});

export default stripeRouter;
