# Agent Instructions

These instructions apply to all agent-driven development work in this repository.

## Versioning Rule

- Before every agent-authored git commit, bump the app version.
- Default to a patch bump unless the user explicitly asks for minor or major.
- Keep `package.json` and `src/shared/constants/index.ts` (`APP_VERSION`) in sync.
- Update any lockfile/version artifacts that should stay in sync.
- Preferred command:
  `npm version patch --no-git-tag-version`

## Commit Workflow

- Make code changes first.
- Run the requested verification steps.
- Bump the version immediately before creating the commit so the version reflects the committed state.
- Include the version bump in the same commit as the code changes.

## If The User Overrides This

- Follow the user's explicit instruction if they ask to skip the bump or use a different version increment.
