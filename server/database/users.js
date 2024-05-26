import { getDefaultPlanId, getPlanById, getPlanLimits } from '#helpers/plans.js';

import LicenseKey from './models/LicenseKey.js';
import User from './models/User.js';
import { addUserToStats } from './models/Stats.js';
import crypto from 'node:crypto';

/**
 * Creates a new user with an associated license key.
 * @param {Object} params - Parameters for creating the user.
 * @param {string} params.email - Email address of the new user.
 * @param {string} [params.planId=getDefaultPlanId()] - ID of the plan to associate with the user.
 * @param {boolean} [params.mailingListConsent=false] - Whether the user consents to join the mailing list.
 * @param {boolean} [params.requiresApiKey=false] - Whether an API key is required for the user.
 * @returns {Promise<Object>} An object containing the created user and license key.
 */
export async function createUserWithKey({
	email,
	planId = getDefaultPlanId(),
	mailingListConsent = false,
	requiresApiKey = false
}) {
	const plan = getPlanById(planId);

	const user = await User.create({
		email,
		billing: {
			planName: plan.name,
			planId: plan.id
		},
		preferences: {
			mailingListConsent
		}
	});

	const licenseKey = await LicenseKey.create({
		userUuid: user.uuid,
		// start: usage-limits
		limits: getPlanLimits(plan.id),
		// end: usage-limits
		requiresApiKey
	});

	addUserToStats();
	return {
		user,
		key: licenseKey.key
	};
}

/**
 * Asynchronously retrieves a user from the database by their email address.
 * @param {Object} params - An object parameter.
 * @param {string} params.email - The email address of the user to retrieve.
 * @returns {Promise<Object|null>} A promise that resolves with the user object if found, otherwise null.
 */
export async function getUserByEmail({ email }) {
	return await User.findOne({ email });
}

/**
 * Retrieves the license key and user information based on a provided token.
 *
 * @param {string} token - The token associated with the license key.
 * @returns {Promise<{key: object|null, user: object|null}>} An object containing the key and user information or null values if not found.
 */
export async function getKeyAndUserFromToken(token) {
	// fetch the license key record
	const key = await LicenseKey.findOne({ key: token }).select('-id');
	if (!key) {
		return { key: null, user: null };
	}
	// fetch the user record associated with this license key
	const user = await User.findOne({ uuid: key.userUuid }).select('-id');
	return { key, user };
}

/**
 * Creates or updates a new admin user and generates an associated license key.
 *
 * @param {object} params - Parameters for creating the admin user.
 * @param {string} params.email - Email address for the new admin user.
 * @param {string} params.password - Plain text password for the new admin user.
 * @returns {Promise<{user: object, licenseKey: object}>} An object containing the new user and their license key.
 */
export async function createAdminUser({ email, password }) {
	const hashedPassword = hashPassword(password);
	const { user: existingUser } = await getAdminUser();
	let user;
	let licenseKey;

	if (existingUser) {
		user = await User.findOneAndUpdate({
			email,
			password: hashedPassword
		});
		licenseKey = await LicenseKey.findOne({ userUuid: user.uuid });
	} else {
		user = await User.create({
			email,
			roles: ['admin'],
			password: hashedPassword,
			preferences: {
				mailingListConsent: false
			}
		});

		licenseKey = await LicenseKey.create({
			userUuid: user.uuid
		});
	}
	return {
		user,
		licenseKey
	};
}

/**
 * Updates the email and password for an admin user after authentication.
 *
 * @async
 * @function updateAdminUser
 * @param {object} params - Parameters for updating the admin user.
 * @param {string} params.oldEmail - Current email address of the admin user.
 * @param {string} params.newEmail - New email address for the admin user.
 * @param {string} params.oldPassword - Current password of the admin user.
 * @param {string} params.newPassword - New password for the admin user.
 * @returns {Promise<boolean|object>} False if authentication fails, or the result of the update operation.
 */
export async function updateAdminUser({ oldEmail, newEmail, oldPassword, newPassword }) {
	const isValid = await authenticateAdmin(oldEmail, oldPassword);
	if (!isValid) {
		return false;
	}
	const hashedPassword = hashPassword(newPassword);
	const user = await User.findOneAndUpdate(
		{
			email: oldEmail,
			roles: ['admin']
		},
		{
			$set: {
				email: newEmail,
				password: hashedPassword
			}
		},
		{ new: true }
	);
	return user;
}

/**
 * Authenticates an admin user based on email and password.
 *
 * @async
 * @function authenticateAdmin
 * @param {string} email - The email address of the admin user to authenticate.
 * @param {string} password - The password of the admin user to authenticate.
 * @returns {Promise<boolean>} True if authentication is successful, false otherwise.
 */
export async function authenticateAdmin(email, password) {
	const user = await User.findOne({ email, roles: 'admin' }).lean();
	if (!user) {
		return false;
	}
	const { hash, salt } = user.password;
	return checkPassword(password, salt, hash);
}

/**
 * Retrieves the admin user's details and their associated license key.
 *
 * @async
 * @function getAdminUser
 * @returns {Promise<{admin: object, key: object}>} An object containing the admin user's details and license key.
 */
export async function getAdminUser() {
	const admin = await User.findOne({ roles: 'admin' }).select('-password -billing');
	if (!admin) {
		return {};
	}
	const key = await LicenseKey.findOne({ userUuid: admin.uuid });
	return { user: admin, key };
}

/**
 * Hashes a password using a provided salt or generates a new salt.
 *
 * @function hashPassword
 * @param {string} password - The password to hash.
 * @param {string} [salt] - An optional salt to use. If not provided, a new 16-byte salt is generated.
 * @returns {{salt: string, hash: string}} An object containing the salt and the hashed password.
 */
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
	const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
	return {
		salt,
		hash
	};
}

/**
 * Checks if a password matches a hashed password using a specified salt.
 *
 * @function checkPassword
 * @param {string} password - The plaintext password to check.
 * @param {string} salt - The salt used to hash the original password.
 * @param {string} hash - The hashed password to compare against.
 * @returns {boolean} True if the password matches the hashed password, false otherwise.
 */
export function checkPassword(password, salt, hash) {
	const { hash: hashCheck } = hashPassword(password, salt);
	return hashCheck === hash;
}
