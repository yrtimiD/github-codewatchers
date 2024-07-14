import { Octokit } from '@octokit/rest';
import * as core from '@actions/core';

import { loadCodewatchers } from './codewatchers';
import { Context, GH, Notif, Options } from './types';


const PAGE_SIZE = 100;

export async function check(context: Context, options: Options): Promise<Notif.Notif[]> {
	let { octokit, owner, repo } = context;
	let { shaFrom, shaTo, ignoreOwn } = options;
	let watchers = await loadCodewatchers(context, options);
	core.debug(JSON.stringify(watchers, ['user', 'patterns', 'login']));

	core.info(`Comparing ${shaFrom}...${shaTo}`);
	let commits: string[] = [];
	if (shaFrom === '0000000000000000000000000000000000000000') {
		core.info(`Unusable 'shaFrom' value (probably new branch was created).`);
	} else {
		let commitsIter = octokit.paginate.iterator(octokit.rest.repos.compareCommits, { owner, repo, base: shaFrom, head: shaTo, per_page: PAGE_SIZE });
		for await (let { data } of commitsIter) {
			context.compareLink ??= data.html_url;
			commits.push(...data.commits.map(c => c.sha) ?? []);
			if (commits.at(-1) === shaTo) {
				break;
			}
		}
	}

	let notifications: Notif.Notif[] = [];
	for (let sha of commits) {
		core.debug(`Checking ${sha}`);
		let commit: GH.Commit = await fetchFullCommit(octokit, owner, repo, sha);

		let fileNames = commit.files.flatMap(f => [f.filename, f.previous_filename]).filter(f => f != null);
		core.info(`${fileNames?.length} file(s) were changed in ${sha}.`);

		let N: Notif.Notif = { commit: stripCommit(commit), watchers: [] };
		watchers.forEach(cw => {
			if (ignoreOwn && (cw.user.login === commit.author?.login || cw.user.login === commit.committer?.login)) return;

			let hasMatch = fileNames?.some(f => cw.ignore.ignores(f));
			if (hasMatch) {
				N.watchers.push(stripUser(cw.user));
			}
		});

		if (N.watchers.length > 0) {
			core.info(`Matched for ${N.watchers.length} watcher(s)`);
			notifications.push(N);
		}

	}
	core.info(`Created ${notifications.length} notification(s)`);

	return notifications;
}

async function fetchFullCommit(octokit: Octokit, owner: string, repo: string, sha: string): Promise<GH.Commit> {
	let filesIter = octokit.paginate.iterator(octokit.rest.repos.getCommit, { owner, repo, ref: sha });
	let commit: GH.Commit = null;
	for await (let { data } of filesIter) {
		if (commit) {
			commit.files.push(...data.files ?? []);
			core.debug(`+${data.files.length} file(s)`);
		} else {
			commit = data;
			core.debug(`${data.files.length} file(s)`);
		}
	}
	commit.files.forEach(f => delete f.patch); // patch field is huge and hardly useful for notifications
	return commit;
}

export function aggregateCommits(context: Context, options: Options, notifications: Notif.Notif[]): Notif.Notif[] {
	let { aggregateNotificationsLimit } = options;

	let groupByWatchers: { [names: string]: Notif.Notif[] } = Object.create({});
	for (let n of notifications) {
		let key = n.watchers.map(w => w.login).sort().join(';');
		(groupByWatchers[key] ??= []).push(n);
	}
	for (let [g, n] of Object.entries(groupByWatchers)) {
		if (n.length > aggregateNotificationsLimit) {
			groupByWatchers[g] = [{
				watchers: n[0].watchers,
				commit: {
					html_url: context.compareLink,
					commit: {
						author: aggregateUsers(n.map(n => n.commit.commit.author)),
						committer: aggregateUsers(n.map(n => n.commit.commit.committer)),
						message: `[${n.length} commits]`,
					},
					sha: '0000000000000000000000000000000000000000',
				}
			}];
		}
	}

	return Object.values(groupByWatchers).flat();
}

export function aggregateFiles(context: Context, options: Options, notifications: Notif.Notif[]): Notif.Notif[] {
	let { aggregateFilesLimit } = options;

	for (let n of notifications) {
		// nullify all files info above allowed limit
		for (let i = aggregateFilesLimit; i < n.commit.files?.length; i++) n.commit.files[i] = null;
	}
	return notifications;
}

function stripCommit(c: GH.Commit): Notif.Commit {
	return {
		sha: c.sha,
		html_url: c.html_url,
		stats: c.stats,
		commit: {
			author: c.commit.author,
			committer: c.commit.committer,
			message: c.commit.message
		},
		files: c.files.map(f => ({
			sha: f.sha,
			blob_url: f.blob_url,
			raw_url: f.raw_url,
			filename: f.filename,
			previous_filename: f.previous_filename,
			additions: f.additions,
			changes: f.changes,
			deletions: f.deletions,
			status: f.status,
		})),
	}
}

function stripUser(u: Partial<GH.User>): Notif.User {
	return {
		login: u.login,
		name: u.name,
		email: u.email,
		type: u.type,
		company: u.company,
		avatar_url: u.avatar_url,
		gravatar_id: u.gravatar_id,
		html_url: u.html_url
	}
}

function aggregateUsers<U extends { name?: string, email?: string }>(users: U[]): U {
	if (users.length === 1) return users[0];

	let uniqueNames = new Set(users.map(u => u.name));
	let unique = [...uniqueNames].map(un => users.find(u => u.name === un));
	if (unique.length > 1) {
		return ({
			name: unique.map(u => u.name).join(', '),
			email: unique.map(u => u.email).join(';'),
		}) as U;
	} else {
		let u = { name: users[0].name, email: users[0].email };
		return u as U;
	}
}