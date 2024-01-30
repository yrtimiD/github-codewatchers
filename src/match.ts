import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import * as core from '@actions/core';
import ignore from 'ignore';

import { loadCodewatchers } from './codewatchers';
import { Commit, Context, Notif, Options } from './types';

const PAGE_SIZE = 100;

export async function check(context: Context, options: Options): Promise<Notif[]> {
	let { octokit, owner, repo } = context;
	let { shaFrom, shaTo, ignoreOwn } = options;
	let watchers = await loadCodewatchers(context, options);
	core.debug(JSON.stringify(watchers, ['user', 'patterns', 'login']));

	core.info(`Comparing ${shaFrom}...${shaTo}`);

	let commits: string[] = [];
	let commitsIter = octokit.paginate.iterator(octokit.rest.repos.compareCommits, { owner, repo, base: shaFrom, head: shaTo, per_page: PAGE_SIZE });
	for await (let { data } of commitsIter) {
		commits.push(...data.commits.map(c => c.sha) ?? []);
		if (commits.at(-1) === shaTo) {
			break;
		}
	}

	let notifications: Notif[] = [];
	for (let sha of commits) {
		core.debug(`Checking ${sha}`);
		let commit: Commit = await fetchFullCommit(octokit, owner, repo, sha);

		let fileNames = commit.files.map(f => f.filename);
		core.info(`${fileNames?.length} file(s) were changed in ${sha}.`);

		let N: Notif = { commit, watchers: [] };
		watchers.forEach(cw => {
			if (ignoreOwn && (cw.user.login === commit.author.login || cw.user.login === commit.committer.login)) return;

			let hasMatch = fileNames?.some(f => cw.ignore.ignores(f));
			if (hasMatch) {
				N.watchers.push(cw.user);
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

async function fetchFullCommit(octokit: Octokit, owner: string, repo: string, sha: string): Promise<Commit> {
	let filesIter = octokit.paginate.iterator(octokit.rest.repos.getCommit, { owner, repo, ref: sha });
	let commit: Commit = null;
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

