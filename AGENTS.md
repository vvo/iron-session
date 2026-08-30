# AGENTS.md

Notes for agents and humans working in this repo. Read the release section before
touching anything that ships to npm.

## Releasing

**Never run `pnpm publish` or `npm publish` from a laptop.** The only supported
path is the `Release` workflow (`.github/workflows/release.yaml`), dispatched
manually from the Actions tab.

Publishing locally is possible, and that is the problem. It skips the checks the
workflow runs, and it produces a tarball with no provenance attestation, which
cannot be fixed after the fact: npm versions are immutable. `9.0.0`,
`9.0.0-beta.0` and `9.0.0-beta.1` all went out this way and none of them can be
verified against a commit.

### How the workflow authenticates

There is no `NPM_TOKEN`. npm stopped letting tokens bypass 2FA for direct
publishing, so any token now gets challenged for an OTP and the run dies with:

```
[ERR_PNPM_OTP_NON_INTERACTIVE] The registry requires additional authentication,
but pnpm is not running in an interactive terminal
```

Rotating the token does not help. No token type bypasses 2FA anymore.

Instead the workflow uses npm **trusted publishing**: `permissions: id-token:
write` lets pnpm exchange a GitHub OIDC token for a short-lived publish
credential, and npm attaches the provenance statement itself. This is configured
on npmjs.com, under the `iron-session` package → Settings → Trusted Publisher:

- Publisher: GitHub Actions
- Repository: `vvo/iron-session`
- Workflow: `release.yaml`
- Environment: `release`

If that entry is missing or its workflow filename does not match, publish fails
with a bare `404 Not Found - PUT https://registry.npmjs.org/iron-session`. npm
masks OIDC failures as 404s, so a 404 on publish means "check the trusted
publisher config", not "the package does not exist".

### Two ways to silently lose provenance

Both of these publish successfully and produce an unverifiable tarball, so the
workflow checks the registry afterwards rather than trusting the exit code.

1. **Do not add `registry-url` to `actions/setup-node`.** It writes an
   `_authToken` line into `.npmrc`, and a statically configured token used to
   make `pnpm publish` skip the OIDC exchange entirely
   ([pnpm/pnpm#11495](https://github.com/pnpm/pnpm/pull/11495)). Fixed in recent
   pnpm, but there is no reason to have the line at all.
2. **Do not route publishing through `changeset publish` or a spawned
   `npm publish`.** Under pnpm 11 that path did not reach npm's OIDC flow
   ([pnpm/pnpm#11566](https://github.com/pnpm/pnpm/issues/11566)). Call
   `pnpm publish` directly.

### Release checklist

1. Bump `version` in `package.json` and update `CHANGELOG.md` on a PR, merge it.
2. Dispatch `Release` with `dry-run: true` first. It runs every check and packs
   the tarball without publishing.
3. Dispatch `Release` for real with the right dist-tag. `beta` for anything with
   a `-` in the version, `latest` only for a stable release. The workflow refuses
   `latest` for a prerelease.
4. Confirm the run's "Verify the published version has provenance" step passed.
5. Tag it and create the GitHub release. Use `--prerelease` for betas.

```sh
git tag -a vX.Y.Z -m vX.Y.Z
git push origin vX.Y.Z
gh release create vX.Y.Z --generate-notes
```

If a release is half-done (published but untagged, or tagged but unpublished),
say so rather than papering over it. Check the real state with
`npm view iron-session dist-tags` and `git ls-remote --tags origin`.

## Conventions

- Commit messages and PR titles follow
  [Conventional Commits](https://www.conventionalcommits.org/).
- Open PRs as drafts with no reviewers assigned.
- Pin third-party GitHub Actions to a full commit SHA with the version in a
  trailing comment, matching the existing workflows.
- `pnpm test` runs the unit tests. The full gate the release runs is in the
  `Verify` step of `.github/workflows/release.yaml`; run those locally before
  asking for a release.
