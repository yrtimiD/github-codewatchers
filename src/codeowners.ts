import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import * as core from '@actions/core';
import ignore from 'ignore';

type CodeOwner = { owner: string, matches: string[] };
function parseCodeOwners(content: string): CodeOwner[] {
	let CO: { [name: string]: CodeOwner } = {};
	let lines = content.split(/$/m).map(l => l.trim()).filter(l => !l.startsWith('#') && l.length > 0);
	lines.forEach(line => {
		let [pattern, ...owners] = line.split(/\s+/);
		owners.forEach(owner => {
			(CO[owner] = CO[owner] ?? { owner: owner, matches: [] }).matches.push(pattern);
		});
	})
	return Object.values(CO);
}

async function loadCodeowners(octokit: Octokit, owner: string, repo: string, ref: string): Promise<CodeOwner[]> {
	let CO: CodeOwner[] = [];
	core.info(`Loading .github/CODEOWNERS file`);
	try {
		let { data: codeownersFile } = await octokit.rest.repos.getContent({
			owner: owner,
			repo: repo,
			ref: ref,
			path: '.github/CODEOWNERS',
			mediaType: { format: 'raw' }
		});
		core.debug(codeownersFile as unknown as string);
		CO = parseCodeOwners(codeownersFile as unknown as string);
		core.info(`Got ${CO.length} owners`);
	} catch (e: any) {
		throw Error(`Can't download .github/CODEOWNERS. ${e?.message}`);
	}

	core.info(`Resolving owners emails...`);
	for (let co of CO) {
		co.owner = await resolveEmail(octokit, co.owner);
	}

	return CO;
}

async function resolveEmail(octokit: Octokit, username: string): Promise<string> {
	core.debug(`Resolving email for ${username}...`);
	let email: string | null = null;
	try {
		if (username.startsWith('@')) {
			username = username.substring(1);
			let { data } = await octokit.users.getByUsername({ username: username });
			email = data.email;
			core.debug(`Resolved to ${email}`);
		}
	} catch (e: any) {
		core.notice(`Unable to resolve email for ${username}: ${e?.message}`);
	}

	return email ?? username;
}

type CompareCommitsData = RestEndpointMethodTypes["repos"]["compareCommits"]["response"]["data"];
function formatPush(owner: string, repo: string, ref: string, commits: CompareCommitsData["commits"], files: CompareCommitsData["files"], diff_url: string): string {
	let shortSha = (sha: string) => sha.substring(0, 8);
	return [
		'<html>',
		'<head><style>',
		'ul {list-style: none;} .sha {font-family: monospace;}',
		'</style></head>',
		'<body>',
		`<h2>${commits[0]?.commit?.author?.name} pushed new changes to ${owner}/${repo} [${ref}]</h2>`,
		'<h3>Files</h3>',
		'<ul>',
		...files.map((f) => `<li><a href="${f.blob_url}">${f.filename}</a></li>`),
		'</ul>',
		'<br/>',
		'<h3>Commits</h3>',
		'<ul>',
		...commits.map((c) => `<li><a href="${c.html_url}" class="sha">${shortSha(c.sha)}</a>: ${c.commit.message}</li>`),
		'</ul>',
		'</body></html>'
	].join('');
}

export type Notif = { owner: string, message: string };
export async function check(octokit: Octokit, owner: string, repo: string, ref: string, shaFrom: string, shaTo: string): Promise<Notif[]> {
	let CO = await loadCodeowners(octokit, owner, repo, ref);
	core.debug(JSON.stringify(CO));
	core.debug(JSON.stringify(CO, null, 2));

	core.info(`Comparing ${shaFrom} with ${shaTo}...`);
	const { data } = await octokit.rest.repos.compareCommits({
		owner: owner,
		repo: repo,
		base: shaFrom,
		head: shaTo,
	});
	const { commits, files, diff_url } = data;
	let fileNames = files?.map(f => f.filename);
	core.info(`${fileNames?.length} files were changed in ${commits.length} commits.`);

	let message = formatPush(owner, repo, ref, commits, files, diff_url);
	core.debug(message);

	let notif: Notif[] = [];
	CO.forEach(co => {
		let rules = ignore().add(co.matches);
		let hasMatch = fileNames?.some(f => rules.ignores(f));
		if (hasMatch) {
			notif.push({ owner: co.owner, message: message });
		}
	});

	core.info(`${notif.length} matches`);

	return notif;
}
