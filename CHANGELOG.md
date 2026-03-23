# Changelog

## v3.0.0

### Changed
- Updated to the node24 runtime

## v2.1.2

### Fixed
- Gracefully handle new branches/tags pushes

## v2.1.1

### Changed
- Better users aggregation for multiple commits
- Show unique list of users/emails instead of just "multiple users"

## v2.1.0

### Added
- `codewatchers_ref` configuration option to control branch of loaded CODEWATCHERS file
- `aggregate_files_limit` setting to trigger files aggregation
- `aggregate_notifications_limit` setting to trigger notifications aggregation

### Changed
- Strip less interesting commit fields from the output

### Fixed
- Fixed large pushes processing issues

## v1.0.4

### Added
- Limit number of produced notifications
- Useful to avoid sending too much notifications on big merges or rebases

## v1.0.3

### Fixed
- Prevent unexpected failure if GitHub returns empty author or committer

## v1.0.2

### Removed
- Drop files.patch property from output (they might be huge but hardly useful for notifications)

## v1.0.1

### Added
- Initial release