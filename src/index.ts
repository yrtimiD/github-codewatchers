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
	await testConnection(octokit);
	let matches = await check(octokit, owner, repo, ref, shaFrom, shaTo);
	core.setOutput('notifications', matches);
}

async function testConnection(octokit: Octokit) {
	try {
		let { data: { login, email } } = await octokit.rest.users.getAuthenticated();
		console.log(`Authenticated as ${login} <${email}>`);
	}
	catch (e: any) {
		throw Error(`Can't authenticate with github. ${e?.message}`);
	}
}

main()
	.catch((e) => {
		console.error(e);
		core.setFailed(`Failed: ${e}`);
	});