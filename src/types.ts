import { Octokit, RestEndpointMethodTypes } from '@octokit/action';
import { Ignore } from 'ignore';


export type Context = {
	owner: string,
	repo: string,
	ref: string,
	refName: string,
	octokit: Octokit,
	compareLink?: string,
};

export type Options = {
	codewatchers: string,
	codewatchersRef: string,
	shaFrom: string,
	shaTo: string,
	ignoreOwn: boolean,
	aggregateFilesLimit: number,
	aggregateNotificationsLimit: number,
};

export namespace GH {
	export type User = RestEndpointMethodTypes['users']['getByUsername']['response']['data'];

	export type Commit = RestEndpointMethodTypes["repos"]["getCommit"]["response"]["data"];
}

export namespace Notif {
	export type CodeWatchers = {
		user: Partial<GH.User>,
		patterns: string[]
		ignore: Ignore;
	};

	export type User = {
		login: string;
		avatar_url: string;
		gravatar_id: string | null;
		html_url: string;
		type: string;
		name: string | null;
		company: string | null;
		email: string | null;
	};

	export type Notif = {
		watchers: Partial<User>[],
		commit: Commit,
	};

	export type Commit = {
		sha: string;
		html_url: string;
		commit: {
			author: {
				name?: string;
				email?: string;
				date?: string;
			};
			committer: {
				name?: string;
				email?: string;
				date?: string;
			};
			message: string;
		};
		stats?: {
			additions?: number;
			deletions?: number;
			total?: number;
		};
		files?: {
			sha: string;
			filename: string;
			previous_filename?: string;
			status?:
			| "added"
			| "removed"
			| "modified"
			| "renamed"
			| "copied"
			| "changed"
			| "unchanged";
			additions?: number;
			deletions?: number;
			changes?: number;
			blob_url?: string;
			raw_url?: string;
		}[];
	};
}