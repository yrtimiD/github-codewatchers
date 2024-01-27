# github-codewatchers Commit notifier

GitHub Action which helps to send notification about specified changed files to these files owners.

The action accepts push `from` and `to` commits and checks them against .github/CODEWATCHERS file. If any commit has matched files - the action outputs array of watchers (as [GitHub API User](https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-a-user)) and commit (as [GitHub API Commit](https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit)) object.

## Local testing
Prepare `.env` file in the repo root with next content (replace <xxx> placeholders with actual values):
```
GITHUB_REPOSITORY="<OWNER/REPO>"
GITHUB_REF="refs/heads/<BRANCH>"
GITHUB_REF_NAME="<BRANCH>"
GITHUB_TOKEN="<GITHUB PAT TOKEN WITH COMMIT READ PERMISSIONS>"
INPUT_SHA-FROM=<FROM COMMIT>
INPUT_SHA-TO=<TO COMMIT>
GITHUB_ACTION='.'
```

Run `npm install && npm test`


## Build and Commit
Ensure to run `npm run build` before commit to update `dist` folder.


## Known limitations
* Only up to 3000 files from each commit can be matched ([Get a commit](https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit) GitHub API limitation )