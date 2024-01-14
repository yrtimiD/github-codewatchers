import { Octokit } from '@octokit/rest';
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
	try {
		let { data: codeownersFile } = await octokit.rest.repos.getContent({
			owner: owner,
			repo: repo,
			ref: ref,
			path: '.github/CODEOWNERS',
			mediaType: { format: 'raw' }
		});
		console.dir(codeownersFile);
		return parseCodeOwners(codeownersFile as unknown as string);
	} catch (e: any) {
		throw Error(`Can't download .github/CODEOWNERS. ${e?.message}`);
	}
};

export async function check(octokit: Octokit, owner: string, repo: string, ref: string, shaFrom: string, shaTo: string) {
	let CO = await loadCodeowners(octokit, owner, repo, ref);
	console.dir(CO);

	const { data } = await octokit.rest.repos.compareCommits({
		owner: owner,
		repo: repo,
		base: shaFrom,
		head: shaTo,
	});
	const { commits, files, diff_url } = data;
	let fileNames = files?.map(f => f.filename);

	let matches: string[] = [];
	CO.forEach(co => {
		let rules = ignore().add(co.matches);
		let hasMatch = fileNames?.some(f => rules.ignores(f));
		if (hasMatch) {
			matches.push(co.owner);
		}
	});

	return matches;
}
