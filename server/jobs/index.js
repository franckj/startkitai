/**
 * The scheduled jobs list
 *
 * Jobs should look like this:
 * {
 * 	name: 'daily-task',
 *	cron: '0 0 * * *'
 * }
 *
 * Where the name matches a file in this directory that
 * you'd like to run on the cron schedule
 */
export default [
	{
		name: 'example-daily-task',
		cron: '0 0 * * *'
	},
	// start: usage-limits
	{
		name: 'reset-daily-usage',
		cron: '0 0 * * *'
	},
	{
		name: 'reset-monthly-usage',
		cron: '0 0 1 * *'
	}
	// end: usage-limits
];
