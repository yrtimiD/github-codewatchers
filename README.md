# github-codeowners-commit-notify

GitHub Action which helps to send notification about specified changed files to these files owners.

The action accepts push `from` and `to` commits and checks them agains CODEOWNERS file. If there are any matches - action outputs prepared notifications messages (with "`to`", "`subj`" and "`body`" fields) which can be send over any channel.

Example pipeline is in [example](/example) folder.


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


## TODO
* [ ] support paging for API calls
