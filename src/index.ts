import * as core from '@actions/core';
import { Octokit } from '@octokit/action';
import { Context, check } from './codeowners';

export async function main(): Promise<void> {
	let [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
	let context: Context = {
		owner,
		repo,
		ref: process.env.GITHUB_REF,
		refName: process.env.GITHUB_REF_NAME,
	};

	let shaFrom = core.getInput('sha-from', { required: true });
	let shaTo = core.getInput('sha-to', { required: true });
	let codewatchers = core.getInput('codewatchers', { required: true });

	let octokit = new Octokit();
	let notifications = await check(octokit, context, codewatchers, shaFrom, shaTo);
	core.setOutput('notifications', notifications);
}

main()
	.catch((e) => {
		console.error(e);
		core.setFailed(`Failed: ${e}`);
	});
