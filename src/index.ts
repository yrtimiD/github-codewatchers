import * as core from '@actions/core';
import { Octokit } from '@octokit/action';
import { Context, Options } from './types';
import { aggregateCommits, aggregateFiles, check } from './match';


export async function main(): Promise<void> {
	let [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
	let context: Context = {
		owner,
		repo,
		ref: process.env.GITHUB_REF,
		refName: process.env.GITHUB_REF_NAME,
		octokit: new Octokit()
	};

	let shaFrom = core.getInput('sha_from', { required: true });
	let shaTo = core.getInput('sha_to', { required: true });
	let codewatchers = core.getInput('codewatchers', { required: true });
	let ignoreOwn = core.getBooleanInput('ignore_own', { required: true });
	let aggregateFilesLimit = Number.parseInt(core.getInput('aggregate_files_limit', { required: false }), 10) || 20;
	let aggregateNotificationsLimit = Number.parseInt(core.getInput('aggregate_notifications_limit', { required: false }), 10) || 5;
	let options: Options = { shaFrom, shaTo, codewatchers, ignoreOwn, aggregateFilesLimit, aggregateNotificationsLimit };

	let notifications = await check(context, options);
	notifications = aggregateCommits(context, options, notifications);
	notifications = aggregateFiles(context, options, notifications);

	core.setOutput('notifications', notifications);
}

main()
	.catch((e) => {
		console.error(e);
		core.setFailed(`Failed: ${e}`);
	});
