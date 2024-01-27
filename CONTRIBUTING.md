## Contributing
### Local testing
Prepare `.env` file in the repo root with next content (replace <xxx> placeholders with actual values):
```
GITHUB_REPOSITORY="<OWNER/REPO>"
GITHUB_REF="refs/heads/<BRANCH>"
GITHUB_REF_NAME="<BRANCH>"
GITHUB_TOKEN="<GITHUB PAT TOKEN WITH REPO AND USERS READ PERMISSIONS>"
GITHUB_ACTION='.'
INPUT_SHA_FROM=<FROM COMMIT>
INPUT_SHA_TO=<TO COMMIT>
INPUT_CODEWATCHERS=".github/CODEWATCHERS"
INPUT_IGNORE_OWN=false
```

Before first run `npm install`, and then `npm test`


### Build and Commit
Ensure to run `npm run build` before commit to update `dist` folder.

