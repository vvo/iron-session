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
verified against a commit. `9.0.1` was the first release published from CI, and
its attestation resolves to commit `a0bd646`.

### How the workflow authenticates

There is no `NPM_TOKEN`. npm stopped letting tokens bypass 2FA for direct
publishing, so any token now gets challenged for an OTP and the run dies with:

```
[ERR_PNPM_OTP_NON_INTERACTIVE] The registry requires additional authentication,
but pnpm is not running in an interactive terminal
```

Rotating the token does not help. No token type bypasses 2FA anymore.

Instead the workflow uses npm **trusted publishing**: the `publish` job's
`permissions: id-token: write` lets npm exchange a GitHub OIDC token for a
short-lived publish credential. Starting the workflow is the approval. This is
configured on npmjs.com, under the `iron-session` package → Settings → Trusted
Publisher:

- Publisher: GitHub Actions
- Repository: `vvo/iron-session`
- Workflow: `release.yaml`
- Environment: `release`
- Allowed: `npm publish`

If the entry is missing or its workflow filename does not match, publishing fails with a bare
`404` or `ENEEDAUTH`. npm masks OIDC failures, so either error means "check the
trusted publisher config", not "the package does not exist".

### The job that can publish installs nothing

The workflow has two jobs. `build` has no `id-token` permission: it installs
dependencies with `--ignore-scripts`, runs every check and packs the tarball
with `pnpm pack`. `publish` holds `id-token: write` and only runs Node and npm on
that tarball. Never add a `pnpm install` or `npm install` of project
dependencies to `publish`: a compromised dev dependency would get a token that
can publish a release.

`build` must not set `registry-url` on `actions/setup-node`. It writes an
`_authToken` line into `.npmrc`, which used to make `pnpm publish` skip the
OIDC exchange and publish without provenance
([pnpm/pnpm#11495](https://github.com/pnpm/pnpm/pull/11495)). `publish` does set
it, because it runs npm, not pnpm, and `NODE_AUTH_TOKEN` stays unset there so
OIDC wins.

### Release checklist

1. Bump `version` in `package.json` and update `CHANGELOG.md` on a PR, merge it.
2. Dispatch `Release` with `dry-run: true` first. It runs every check and packs
   the tarball without publishing.
3. Dispatch `Release` for real with the right dist-tag. `beta` for anything with
   a `-` in the version, `latest` only for a stable release. The workflow refuses
   `latest` for a prerelease.
4. The workflow checks the version went out with provenance. If it fails,
   check by hand: `npm view iron-session@X.Y.Z dist.attestations.url` must print
   a URL.
5. Tag it and create the GitHub release. Use `--prerelease` for betas.

```sh
git tag -a vX.Y.Z -m vX.Y.Z
git push origin vX.Y.Z
gh release create vX.Y.Z --generate-notes
```

If a release is half-done (published but untagged, or
tagged but unpublished),
say so rather than papering over it. Check the real state with
`npm view iron-session dist-tags` and `git ls-remote --tags origin`.

## Testing

Three layers, and they catch different things.

```sh
pnpm test            # unit tests, src/*.test.ts
pnpm test:e2e        # browser tests against a local fixture app
pnpm test:e2e:deployed   # the examples site, on a real deployment
```

`pnpm test:e2e` runs `e2e/session.spec.ts` on Chromium, Firefox and WebKit
against `e2e/fixture`, a minimal Next app on localhost:3210. Playwright starts
it. WebKit is not optional: #870 is a Safari cookie report, so we need a real
assertion there rather than another theory.

Playwright builds the fixture before starting it, because `next start` serves
whatever is already in `.next`. Without that build step a stale `.next` silently
tests the previous commit: adding the `/cache` route left 12 local failures
pointing at missing test ids, while CI stayed green because it builds the fixture
in its own step.

`pnpm test:e2e:deployed` runs `e2e/examples.spec.ts` against a URL you give it.
It needs `BASE_URL`, and a preview URL also needs the project's Protection
Bypass for Automation secret, because previews are behind Vercel
Authentication and otherwise answer 302 to `vercel.com/sso-api`:

```sh
BASE_URL=https://get-iron-session.vercel.app pnpm test:e2e:deployed
BASE_URL=https://<preview>.vercel.app \
  VERCEL_AUTOMATION_BYPASS_SECRET=... pnpm test:e2e:deployed
```

CI runs it on `deployment_status`, so every preview is tested before merge and
production again after. That workflow exists because v9 shipped with every
example answering an empty 500: the examples read their passwords from the
environment, nothing set them on the Vercel project, and since the password is
read per request the builds stayed green.

Two traps in the deployed suite. Both look like flakiness and are not, so don't
"simplify" the waits away:

- The SWR examples render their login form in the server HTML, and it submits
  through a React `onSubmit` that calls `preventDefault()`. Clicking before
  hydration posts to the page URL instead of the session route and logs nobody
  in. `openExample` waits for the client's session GET first.
- They also pass `optimisticData`, so the logged-in UI appears before the POST
  that sets the cookie has answered. The rendered state proves nothing: `login`
  waits for the cookie, and the counter waits for its PATCH.

To run the examples app locally, copy `examples/next/.env.example` to
`examples/next/.env.local` first. Without it every session route throws.

`pnpm dev` serves the examples on **https://iron-session.localhost** through
[portless](https://portless.sh), which replaces `next dev --experimental-https`
and the certificates it wanted managed. The first run asks for your password
once, to trust a local CA and bind port 443; without that it falls back to a
port-suffixed URL, which still works.

The https is the point, not the nice URL. Our cookies default to `secure: true`,
and browsers disagree about storing those on an insecure origin: WebKit refuses,
Chromium and Firefox keep them on localhost. Developing over plain http means
the session works in Chrome and breaks in Safari, which is
[#870](https://github.com/vvo/iron-session/issues/870). Over https the examples
run the same defaults locally that they run in production.

Because portless terminates TLS in front of Next, an absolute redirect built
from `request.nextUrl.origin` or `new URL(request.url).origin` points at the
port Next is listening on, `https://localhost:<dev port>`, which speaks plain
http. The browser gets `ERR_SSL_PROTOCOL_ERROR` and the flow dies. Route
handlers redirect with `seeOther()` from `examples/next/src/see-other.ts`, which
sends a relative `Location` the browser resolves against the URL it asked for,
correct behind the proxy and on Vercel both. The magic-link and OAuth callback
routes were still building absolute URLs, so those two examples were broken
under `pnpm dev` while every other one worked. Anything needing a real absolute
URL, a magic link or an OAuth `redirect_uri`, uses `requestOrigin()`, which
reads `host` and `x-forwarded-proto` off the request.

Note `.node-version` pins **24**, because portless needs it. That is the version
for our own tooling and CI jobs. The library still supports Node 22.13+:
`engines` says so and the `test-node` matrix covers 22.13.0 explicitly.

## Conventions

- Commit messages and PR titles follow
  [Conventional Commits](https://www.conventionalcommits.org/).
- Open PRs as drafts with no reviewers assigned.
- Pin third-party GitHub Actions to a full commit SHA with the version in a
  trailing comment, matching the existing workflows.
- `pnpm test` runs the unit tests, see Testing above for the other two layers.
  The full gate the release runs is in the `Verify` step of
  `.github/workflows/release.yaml`; run those locally before asking for a
  release.
