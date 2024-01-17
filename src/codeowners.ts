import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import * as core from '@actions/core';
import ignore from 'ignore';


export type Context = {
	owner: string,
	repo: string,
	ref: string,
	refName: string,
}

type CodeOwner = { owner: string, matches: string[] };
function parseCodeWatchers(content: string): CodeOwner[] {
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

async function loadCodewatchers(octokit: Octokit, context: Context, codewatchers: string): Promise<CodeOwner[]> {
	let { owner, repo, ref } = context;
	let CO: CodeOwner[] = [];
	core.info(`Loading "${codewatchers}" file from ${ref}...`);
	try {
		let { data: codeownersFile } = await octokit.rest.repos.getContent({
			owner: owner,
			repo: repo,
			ref: ref,
			path: codewatchers,
			mediaType: { format: 'raw' }
		});
		core.debug(codeownersFile as unknown as string);
		CO = parseCodeWatchers(codeownersFile as unknown as string);
		core.info(`Got ${CO.length} owners`);
	} catch (e: any) {
		throw Error(`Can't download "${codewatchers}" file. ${e?.message}`);
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

export type Notif = { to: string, subj: string, body: string };
type CompareCommitsData = RestEndpointMethodTypes["repos"]["compareCommits"]["response"]["data"];
function composeMessage(context: Context, commits: CompareCommitsData["commits"], files: CompareCommitsData["files"], diff_url: string) {
	let { owner, repo, refName } = context;
	let shortSha = (sha: string) => sha.substring(0, 8);
	return {
		subj: `${commits[0]?.commit?.author?.name} pushed to the ${owner}/${repo} [${refName}]`,
		body: [
			'<html>',
			'<head><style>',
			'ul {list-style: none;} .sha {font-family: monospace;}',
			'</style></head>',
			'<body>',
			`<h2>${commits[0]?.commit?.author?.name} pushed new changes to ${owner}/${repo} [${refName}]</h2>`,
			'<h3>Files</h3>',
			'<ul>',
			...files.map((f) => `<li><a href="${f.blob_url}">${f.filename}</a></li>`),
			'</ul>',
			'<br/>',
			'<h3>Commits</h3>',
			'<ul>',
			...commits.map((c) => `<li><a href="${c.html_url}" class="sha">${shortSha(c.sha)}</a>: ${c.commit.message.split(/$/m)[0]}</li>`),
			'</ul>',
			'</body></html>'
		].join('')
	};
}

export async function check(octokit: Octokit, context: Context, codeowners: string, shaFrom: string, shaTo: string): Promise<Notif[]> {
	let { owner, repo } = context;
	let CO = await loadCodewatchers(octokit, context, codeowners);
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

	let message = composeMessage(context, commits, files, diff_url);
	core.debug(message.subj);
	core.debug(message.body);

	let notif: Notif[] = [];
	CO.forEach(co => {
		if (commits.every(commit => co.owner === commit.commit.author.email)) return;
		let rules = ignore().add(co.matches);
		let hasMatch = fileNames?.some(f => rules.ignores(f));
		if (hasMatch) {
			notif.push({ to: co.owner, subj: message.subj, body: message.body });
		}
	});

	core.info(`Created ${notif.length} notifications`);

	return notif;
}
