import * as core from '@actions/core';
import { Octokit } from '@octokit/action';
import { check } from './codeowners';

export async function main(): Promise<void> {
	let [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')
	let ref = process.env.GITHUB_REF!;

	// let token = core.getInput('github-token', { required: true });
	let shaFrom = core.getInput('sha-from', { required: true });
	let shaTo = core.getInput('sha-to', { required: true });

	let octokit = new Octokit();
	// await testConnection(octokit);
	let matches = await check(octokit, owner, repo, ref, shaFrom, shaTo);
	core.setOutput('notifications', matches);
}

main()
	.catch((e) => {
		console.error(e);
		core.setFailed(`Failed: ${e}`);
	});