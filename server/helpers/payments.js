import {
	cancelUserBilling,
	changeUserBillingStatus,
	deactivateUserBilling,
	getUserBySubscriptionId,
	reactivateUserBilling,
	updateUserBilling
} from '#database/billing.js';
import { createUserWithKey, getUserByEmail } from '#database/users.js';

import Stripe from 'stripe';
import { createLogger } from '#helpers/logger.js';
import { sendThanksForSubscribingEmail } from '#helpers/emails.js';

const logger = createLogger('payments');

const stripe = Stripe(process.env.STRIPE_API_KEY);

export async function handleCheckoutSessionCompleted(eventData) {
	switch (eventData.mode) {
		case 'subscription': {
			return handleSubscriptionEvent(eventData);
		}
		case 'payment': {
			return handleOneTimePaymentEvent(eventData);
		}
	}
}

/**
 * Handles a Stripe subscription event from a completed checkout session
 *
 * We fetch the subscription the customer paid for and provision access to
 * the correct plan.
 */
async function handleSubscriptionEvent(eventData) {
	logger.info('handling successful checkout session for subscription');

	const {
		customer: customerId,
		customer_email,
		customer_details,
		subscription: subscriptionId
	} = eventData;

	// Depending on how the email was passed to the checkout session
	// the customer_email field can be null, so we can get the email
	// from the customer_details property instead
	const customerEmail = customer_email || customer_details.email;

	const subscription = await stripe.subscriptions.retrieve(subscriptionId);
	const { price } = subscription.items.data[0];

	const billingData = {
		customerId, // (required)
		subscriptionId, // (required)
		stripePriceId: price.id, // (required)
		planActive: true, // (required)
		subscriptionStatus: subscription.status, // (optional) will be updated on subscription cancel/delete
		interval: price.recurring.interval, // (optional) record if monthly or yearly plan
		currency: subscription.currency // (optional) record currency for future billing
	};

	const user = await getUserByEmail({ email: customerEmail });
	if (user) {
		logger.info(`🚀 updating existing user ${user.email} to new plan ${price.id}`);
		await updateUserBilling(user.uuid, billingData);
		// (optional) send thanks for subscribing email
		sendThanksForSubscribingEmail({ email: customerEmail });
	} else {
		logger.info(`✨ creating new user ${customerEmail} who just paid for new plan ${price.id}`);
		// if the user doesn't exist yet then create them first
		const { user, key } = await createUserWithKey({
			email: customerEmail,
			stripePriceId: price.id
		});
		await updateUserBilling(user.uuid, billingData);
		// and then send them a welcome email
		sendThanksForSubscribingEmail({ email: customerEmail, licenseKey: key, userIsNew: true });
	}
}

async function handleOneTimePaymentEvent() {
	/**
	 * (optional) handle one time payments here
	 * Fetch the products the customer purchased and provision access.
	 *
	 * const { id: sessionId } = eventData;
	 * const { data: lineItems } = await stripe.checkout.sessions.listLineItems(sessionId);
	 * const product = lineItems[0];
	 * const priceId = product.price.id;
	 *
	 * 👉 Provision access to this product
	 */
}

export async function handleSubscriptionUpdated(eventData, previousAttributes) {
	const { id: subscriptionId, customer: customerId } = eventData;

	const user = await getUserBySubscriptionId({ subscriptionId });
	if (!user) {
		// This event is fired when the checkout session is completed with updates
		// during the checkout that we can ignore, usually nothing to worry about here.
		logger.warn(`No customer found for updated Stripe subscription: ${subscriptionId}`);
		return null;
	}

	const subscription = await stripe.subscriptions.retrieve(subscriptionId);

	// We can determine what was updated by comparing;
	// a) the current subscription object
	// b) the previous attributes object containing the names of the
	//    updated attributes and their values prior to the event
	// The previous attributes will only contain data that was updated
	// so it's a little messy to check if it exists and then if it's changed

	const update = getEventUpdateData(subscription, previousAttributes);
	switch (update.type) {
		// User subscribed to a plan
		case 'plan': {
			const { newPrice } = update;
			const billingData = {
				customerId, // (required)
				subscriptionId, // (required)
				stripePriceId: newPrice.id, // (required)
				planActive: true, // (required)
				subscriptionStatus: subscription.status, // (optional) will be updated on subscription cancel/delete
				interval: newPrice.recurring.interval, // (optional) record if monthly or yearly plan
				currency: subscription.currency // (optional) record currency for future billing
			};

			logger.info(`↗️ updating plan for user (${user.email}) to new plan ${newPrice.id}`);
			await updateUserBilling(user.uuid, billingData);
			break;
		}
		// User canceled their plan (may remain active until end of billing period depending on your Stripe settings)
		case 'cancel': {
			const { endsAt } = update;
			logger.info(`❌ cancelling plan for user (${user.email})`);
			await cancelUserBilling(user.uuid, {
				endsAt
			});
			break;
		}
		// User reactivated their previously canceled plan
		case 'reactivate': {
			logger.info(`🔄 reactivating plan for user (${user.email})`);
			await reactivateUserBilling(user.uuid);
			break;
		}
		// Subscription status changed
		case 'status': {
			const { status } = update;
			const billingData = {
				subscriptionStatus: status
			};
			logger.info(`🔃 changing user (${user.email}) plan status to ${status}`);
			await changeUserBillingStatus(user.uuid, billingData);
			break;
		}
		default: {
			logger.info(`Unknown update event type ${update.type} from Stripe`);
		}
	}
}

export async function handleSubscriptionDeleted(eventData) {
	const { id: subscriptionId } = eventData;

	const user = await getUserBySubscriptionId({ subscriptionId });
	if (!user) {
		logger.warn(`No customer found for deleted Stripe subscription: ${subscriptionId}`);
		return null;
	}

	const billingData = {
		subscriptionId
	};

	await deactivateUserBilling(user.uuid, billingData);
}

export async function deleteSubscription(subscriptionId) {
	return await stripe.subscriptions.del(subscriptionId);
}

function getEventUpdateData(subscription, previousAttributes) {
	// 1. plan change
	if (previousAttributes?.items?.data) {
		const previousPriceId = previousAttributes?.items?.data[0]?.price?.id;
		const { price } = subscription.items.data[0];
		if (previousPriceId && previousPriceId !== price.id) {
			/**
			 * If you want to check if it's a plan upgrade/downgrade
			 * you can do this here by fetching the plans in your config
			 * and comparing the previousPriceId and new price.id
			 */
			return {
				type: 'plan',
				previousPrice: previousAttributes?.items?.data[0]?.price,
				newPrice: price
			};
		}
	}

	/**
	 * If a subscription is canceled it will remain active until the billing period ends.
	 * Record this to show a banner, different actions on the billing page, or email to ask for feedback etc.
	 * To make subscriptions cancel immediately you can change your Stripe settings.
	 */
	if (
		subscription.cancel_at_period_end === true &&
		previousAttributes.cancel_at_period_end === false
	) {
		return {
			type: 'cancel',
			endsAt: subscription.current_period_end * 1000
		};
	}

	/**
	 * If a subscription is canceled the customer can still reactivate it until the billing period ends
	 * cancel_at_period_end will change to false to confirm they reactivated their subscription
	 */
	if (
		subscription.cancel_at_period_end === false &&
		previousAttributes.cancel_at_period_end === true
	) {
		return {
			type: 'reactivate'
		};
	}

	/**
	 * If a subscription status changes then record the change on the user
	 * this allows you to optionally show a banner or send an email if the status
	 * is "canceled" or "past_due" etc
	 */
	if (previousAttributes?.status !== subscription.status) {
		return {
			type: 'status',
			status: subscription.status
		};
	}

	return {
		type: 'other'
	};
}
