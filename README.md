# github-codewatchers Commit notifier

> GitHub Action that triggers notifications about changed files to a list of subscribers.

## Configuration
Subscriptions are managed in a [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) like file where file patterns are associated with users. You can use standard `.github/CODEOWNERS` file or make a new one called `.github/CODEWATCHERS` (can use any name) to have a better configuration flexibility.

### Inputs
* `GITHUB_TOKEN` (required) - token for interaction with GitHub API, standard GITHUB_TOKEN secret provided to each workflow is good enough
* `codewatchers` (optional) - location of the subscriptions file, default is ".github/CODEWATCHERS"
* `ignore_own` (optional) - toggles if committer will get notifications for own commits (boolean, default is "true")
* `sha_from` and `sha_to` (required) - commits range to analize. Usually these are taken from the [push](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#push) event (see example below)
* `aggregate_files_limit` (optional) - Limit after which files list will be replaced with aggregated summary message. (integer, default is 20)
* `aggregate_notifications_limit` (optional) - Limit after which many notifications will be replaces with a single aggregated summary message (for each distinct group of subscribers). (integer, default is 5)

Action doesn't requires repository checkout, all operations are done via GitHub API

```yaml
name: Commit Notify
on: push
jobs:
  get-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Check commits
        id: check
        uses: yrtimiD/github-codewatchers@v1
        with:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
           codewatchers: '.github/CODEWATCHERS'
           ignore_own: true
           sha_from: ${{ github.event.before }}
           sha_to: ${{ github.event.after }}
           aggregate_files_limit: 20
		   aggregate_notifications_limit: 5
    outputs:
      notifications: ${{ steps.check.outputs.notifications }}
```

### Output
If any commit has files matched to subsciption rules - action will output an array of watchers (as simplified [GitHub API User](https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-a-user)) and commit (as simplified [GitHub API Commit](https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit)) object.

Simplified version of output looks next (only most useful fields are shown):
```json
{
  "commit": {
    "sha": "5fd3a8a657f7d78b8e8cdb2747585b24607f7e05",
    "commit": {
      "message": "testing",
      "author": {
        "name": "Example User",
        "email": "example@example.com",
        "date": "2024-04-13T08:00:00Z"
      },
      "committer": {
        "name": "Example User",
        "email": "example@example.com",
        "date": "2024-04-13T08:00:00Z"
      }
    },
    "html_url": "https://github.com/example/example/commit/5fd3a8a657f7d78b8e8cdb2747585b24607f7e05",
    "stats": {
      "total": 2,
      "additions": 1,
      "deletions": 1
    },
    "files": [
      {
        "filename": "some/file/was/changed.txt",
        "status": "modified",
        "additions": 1,
        "deletions": 1,
        "changes": 2,
        "blob_url": "https://github.com/example/example/blob/8b61fc1be2ebe2cfe5102587f55ffabd25a58fa5/some%2Ffile%2Fwas%2Fchanged.txt",
        "raw_url": "https://github.com/example/example/raw/8b61fc1be2ebe2cfe5102587f55ffabd25a58fa5/some%2Ffile%2Fwas%2Fchanged.txt"
      }
    ]
  },
  "watchers": [
    {
      "login": "somewatcher",
      "name": "Some Watcher",
      "email": "Some.Watcher@example.com"
    }
  ]
}
```

## Usage Example
See full example workflow in [examples](examples/)

Example of `.CODEWATCHERS` file
```
*.md         tech_writer@example.com
*.sql        dba@example.com
package.json @somewatcher
```

## Known limitations
* Only up to 3000 files from each commit can be matched (Limitation of [Get a commit](https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit) GitHub API )
