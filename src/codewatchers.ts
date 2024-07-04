import { Octokit } from '@octokit/rest';
import * as core from '@actions/core';
import { Notif, Context, Options, GH } from './types';
import ignore from 'ignore';


export async function loadCodewatchers(context: Context, options: Options): Promise<Notif.CodeWatchers[]> {
	let { octokit, owner, repo } = context;
	let { codewatchers, codewatchersRef } = options;

	let CW: Notif.CodeWatchers[] = [];
	let file: string;
	core.info(`Loading "${codewatchers}" file from ${codewatchersRef}...`);
	try {
		let { data } = await octokit.rest.repos.getContent({ owner, repo, ref: codewatchersRef, path: codewatchers, mediaType: { format: 'raw' } });
		if (typeof data === 'string') {
			file = data;
			core.debug(file);
		} else {
			throw Error(`Unexpected result from getContent API. Expected string got ${typeof data}`);
		}
	} catch (e: any) {
		throw Error(`Can't download "${codewatchers}" file. ${e?.message}`);
	}

	let parsed = parseCodeWatchers(file);

	core.info(`Resolving users...`);
	for (let names in parsed) {
		let patterns = parsed[names];
		CW.push({
			user: await resolveUser(octokit, names),
			patterns: patterns,
			ignore: ignore().add(patterns)
		});
	}

	core.info(`Loaded ${CW.length} watchers`);
	return CW;
}

function parseCodeWatchers(content: string) {
	let items: { [name: string]: string[] } = {};
	let lines = content.split(/$/m).map(l => l.trim()).filter(l => !l.startsWith('#') && l.length > 0);
	lines.forEach(line => {
		let [pattern, ...owners] = line.split(/\s+/);
		owners.forEach(owner => {
			(items[owner] ??= []).push(pattern);
		});
	})
	return items;
}

async function resolveUser(octokit: Octokit, emailOrLogin: string): Promise<Partial<GH.User>> {
	core.debug(`Resolving ${emailOrLogin}...`);
	let user: Partial<GH.User> = {};
	try {
		if (emailOrLogin.startsWith('@')) {
			user.login = emailOrLogin.substring(1);
		} else if (emailOrLogin.includes('@')) {
			user.email = emailOrLogin;

			let { data } = await octokit.search.users({ q: `${user.email} in:email type:user` }); // this returns only partial info, still full user need to be resolved by login
			user.login = data.items[0]?.login;
		}

		let { data } = await octokit.users.getByUsername({ username: user.login });
		user = data;
	} catch (e: any) {
		core.notice(`Unable to resolve ${emailOrLogin}: ${e?.message}`);
	}

	if (user.name) {
		core.debug(`Resolved to ${user.name}`);
	}

	return user;
}
