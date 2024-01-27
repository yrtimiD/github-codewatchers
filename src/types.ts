import { Octokit, RestEndpointMethodTypes } from '@octokit/action';
import { Ignore } from 'ignore';


export type Context = {
	owner: string,
	repo: string,
	ref: string,
	refName: string,
	octokit: Octokit
};

export type Options = {
	codewatchers: string,
	shaFrom: string,
	shaTo: string,
	ignoreOwn: boolean
};

export type User = RestEndpointMethodTypes['users']['getByUsername']['response']['data'];

export type Commit = RestEndpointMethodTypes["repos"]["getCommit"]["response"]["data"];

export type CodeWatchers = {
	user: Partial<User>,
	patterns: string[]
	ignore: Ignore;
};

export type Notif = {
	watchers: Partial<User>[],
	commit: Commit,
};

