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
	let codeowners = core.getInput('codeowners', { required: false });

	let octokit = new Octokit();
	let notifications = await check(octokit, context, codeowners, shaFrom, shaTo);
	core.setOutput('notifications', notifications);
}

main()
	.catch((e) => {
		console.error(e);
		core.setFailed(`Failed: ${e}`);
	});
