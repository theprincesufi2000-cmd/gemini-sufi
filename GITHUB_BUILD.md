# GitHub Build V4.2

The workflows intentionally do NOT use `cache: npm`, so GitHub Actions will not require a lock file.

Debug:
Actions → Android Debug APK → Run workflow.

Release:
Actions → Android Release APK AAB → Run workflow.

Node is pinned to 22. The Node 20 deprecation message is not an error.

If GitHub still shows `cache: npm`, you are running an older workflow file from the repository. Replace the workflow files with the ones in this package and commit/push them.
