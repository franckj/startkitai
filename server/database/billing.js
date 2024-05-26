import {
	getDefaultPlanId,
	getPlanById,
	getPlanByStripePriceId,
	getPlanLimits
} from '#helpers/plans.js';

import LicenseKey from './models/LicenseKey.js';
import User from './models/User.js';

/**
 * Updates the billing details for an existing user.
 * @param {string} uuid - The UUID of the user to update.
 * @param {Object} billingDetails - The new billing details.
 * @returns {Promise<Object>} The result of the update operation.
 */
export async function updateUserBilling(uuid, billingDetails) {
	const {
		customerId,
		subscriptionId,
		stripePriceId,
		planId,
		planActive,
		subscriptionStatus,
		interval,
		currency
	} = billingDetails;

	let plan;
	if (stripePriceId) {
		plan = getPlanByStripePriceId(stripePriceId);
	} else {
		plan = getPlanById(planId);
	}

	const user = await User.findOneAndUpdate(
		{ uuid },
		{
			$set: {
				'billing.planName': plan.name,
				'billing.planId': plan.id,
				'billing.customerId': customerId,
				'billing.subscriptionId': subscriptionId,
				'billing.stripePriceId': stripePriceId,
				'billing.planActive': planActive,
				'billing.subscriptionStatus': subscriptionStatus,
				'billing.interval': interval,
				'billing.currency': currency
			}
		},
		{ new: true }
	);
	// update the limits on the license key
	await LicenseKey.updateOne(
		{ userUuid: uuid },
		{
			$set: {
				limits: getPlanLimits(plan.id)
			}
		}
	);
	return user;
}

/**
 * Cancels the billing for a user.
 * @param {string} uuid - The UUID of the user whose billing is to be canceled.
 * @param {Object} options - Options for the cancellation.
 * @param {Date|string} options.endsAt - The date when the billing ends.
 * @returns {Promise<Object>} The result of the update operation.
 */
export async function cancelUserBilling(uuid, { endsAt }) {
	const user = await User.updateOne(
		{
			uuid
		},
		{
			$set: {
				'billing.canceledAt': new Date(),
				'billing.endsAt': new Date(endsAt)
			}
		}
	);
	return user;
}

/**
 * Reactivates billing for a user.
 * @param {string} uuid - The UUID of the user whose billing is to be reactivated.
 * @returns {Promise<Object>} The result of the update operation.
 */
export async function reactivateUserBilling(uuid) {
	const user = await User.findOneAndUpdate(
		{
			uuid
		},
		{
			$set: {
				'billing.reactivatedAt': new Date()
			},
			$unset: {
				'billing.canceledAt': 1,
				'billing.endsAt': 1
			}
		},
		{ new: true }
	);
	return user;
}

/**
 * Deactivates billing for a user, setting them back to a free plan.
 * @param {string} uuid - The UUID of the user whose billing is to be deactivated.
 * @param {Object} options - Options for the deactivation.
 * @param {string} options.subscriptionId - The ID of the subscription that is being deactivated.
 * @returns {Promise<Object>} The result of the update operation.
 */
export async function deactivateUserBilling(uuid, { subscriptionId }) {
	const plan = getPlanById(getDefaultPlanId());
	// set the user back to a free user
	// and unset any properties that give users access
	const user = await User.findOneAndUpdate(
		{
			uuid
		},
		{
			$set: {
				'billing.planName': plan.name,
				'billing.planId': plan.id,
				'billing.planActive': false,
				'billing.subscriptionStatus': 'canceled',
				'billing.previousSubscriptionId': subscriptionId,
				'billing.deactivatedAt': new Date()
			},
			// remove properties that define the active plan but we'll be keeping;
			// - customerId (keep the same Stripe data if they resubscribe)
			// - currency (this currency must be used for future new payments or subscriptions in Stripe)
			// - previousSubscriptionId (we unset subscriptionId but keep a reference to the previous subscription)
			$unset: {
				'billing.stripePriceId': 1,
				'billing.interval': 1,
				'billing.subscriptionId': 1,
				'billing.canceledAt': 1,
				'billing.endsAt': 1
			}
		},
		{ new: true }
	);

	// update the limits on the license key back to defaults
	await LicenseKey.updateOne(
		{ userUuid: uuid },
		{
			$set: {
				limits: getPlanLimits(getDefaultPlanId())
			}
		}
	);

	return user;
}

/**
 * Changes the billing status of a user.
 * @param {string} uuid - The UUID of the user whose billing status is to be changed.
 * @param {Object} options - New status for the user's billing.
 * @param {string} options.subscriptionStatus - The new subscription status.
 * @returns {Promise<Object>} The result of the update operation.
 */
export async function changeUserBillingStatus(uuid, { subscriptionStatus }) {
	const user = await User.findOneAndUpdate(
		{
			uuid
		},
		{
			$set: {
				'billing.subscriptionStatus': subscriptionStatus
			}
		},
		{ new: true }
	);
	return user;
}

/**
 * Asynchronously retrieves a user from the database by their subscription ID.
 * @param {Object} params - An object containing the function's parameters.
 * @param {string} params.subscriptionId - The subscription ID associated with the user to retrieve.
 * @returns {Promise<Object|null>} A promise that resolves with the user object if found, or null if not found.
 */
export async function getUserBySubscriptionId({ subscriptionId }) {
	return await User.findOne({ 'billing.subscriptionId': subscriptionId });
}
