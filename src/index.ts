import * as core from '@actions/core';
import { Octokit } from '@octokit/action';
import { Context, Options } from './types';
import { check } from './match';


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
	let limit = Number.parseInt(core.getInput('limit', { required: true }), 10);
	let options: Options = { shaFrom, shaTo, codewatchers, ignoreOwn, limit };


	let notifications = await check(context, options);

	core.setOutput('notifications', notifications);
}

main()
	.catch((e) => {
		console.error(e);
		core.setFailed(`Failed: ${e}`);
	});
