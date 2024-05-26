import { Resend } from 'resend';
import { createLogger } from './logger.js';

let resend = null;
if (process.env.RESEND_API_KEY) {
	resend = new Resend(process.env.RESEND_API_KEY);
}
const sendingAddress = process.env.RESEND_SENDING_ADDRESS;
const audienceId = process.env.RESEND_AUDIENCE_ID;

const logger = createLogger('emails');

export async function sendMagicLink({ link, email }) {
	if (!resend) {
		logger.warn(
			`You haven't set up email sending yet. See https://startkit.ai/docs/features/emails for more info`
		);
		return;
	}
	logger.interactive('magic-link').await('sending magic link email...');
	try {
		const { data, error } = await resend.emails.send({
			from: sendingAddress,
			to: email,
			subject: 'Try the StartKit.AI Demos',
			html: `<p>Thanks for trying out the StartKit.AI demos, click here to confirm your email address: <a href="${link}">${link}</a></p>`
		});
		if (error) {
			throw new Error(error.message);
		}
		logger.interactive('magic-link').success('sent magic link email');
		return data;
	} catch (err) {
		logger.interactive('magic-link').error(`failed to send magic link`, err.message);
		throw err;
	}
}

export async function sendTestEmail({ email }) {
	if (!resend) {
		logger.warn(
			`You haven't set up email sending yet. See https://startkit.ai/docs/features/emails for more info`
		);
		return;
	}
	logger.interactive('send-test').await('sending test email...');
	try {
		const { data, error } = await resend.emails.send({
			from: sendingAddress,
			to: email,
			subject: 'Test email from StartKit.AI',
			html: `<p>If you're reading this then you've setup sending emails, nice work!</p>`
		});
		if (error) {
			throw new Error(error.message);
		}
		logger.interactive('send-test').success('sent test email');
		return data;
	} catch (err) {
		logger.interactive('send-test').error(`failed to send test email`, err.message);
		throw err;
	}
}

export async function addUserToMailingList({ email }) {
	if (!resend || !audienceId) {
		logger.warn(
			`You haven't set up your mailing list yet. See https://startkit.ai/docs/features/emails for more info`
		);
		return;
	}
	logger.interactive('list-add').await('adding user to mailing list');
	try {
		const { error } = await resend.contacts.create({
			email,
			unsubscribed: false,
			audienceId
		});

		if (error) {
			throw new Error(error.message);
		}

		logger.interactive('list-add').success('added user to mailing list');
	} catch (err) {
		logger.interactive('list-add').error('Failed to add user to mailing list', err.message);
		throw err;
	}
}

export async function removeUserFromMailingList({ email }) {
	if (!resend || !audienceId) {
		logger.warn(
			`You haven't set up your mailing list yet. See https://startkit.ai/docs/features/emails for more info`
		);
		return;
	}
	logger.interactive('list-remove').await('removing user from mailing list');
	try {
		await resend.contacts.remove({
			email,
			audienceId
		});
		logger.interactive('list-remove').success('removed user from mailing list');
	} catch (err) {
		logger.interactive('list-remove').error('failed to remove user from mailing list', err.message);
		throw err;
	}
}

export function sendThanksForSubscribingEmail(/*{ userIsNew = false, email, licenseKey }*/) {}
