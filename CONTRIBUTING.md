# Contribution Guide

Hey there! We are really excited that you are interested in contributing. Before
submitting your contribution, please make sure to take a moment and read through
the following guide:

## Repository Setup

```sh
fnm install
corepack enable
pnpm install
```

## Development

```sh
pnpm dev
```

## Tests

```sh
pnpm test
```

## Submitting a Contribution

1. Fork the repository
2. Create a new branch for your contribution
3. Make your changes
4. Submit a pull request

Some points to keep in mind:

- Before starting to work on a feature, please make sure to open an issue first
  and discuss it with the maintainers.
- If you are working on a bug fix, please provide a detailed description of the
  bug in the pull request.
- It's OK to have multiple small commits as you work on the PR - GitHub will
  automatically squash them before merging.
- Please make sure the PR title follows
  [Conventional Commits](https://www.conventionalcommits.org/) format.
- Please make sure to rebase your branch on top of the latest `main` branch
  before submitting the PR.

Recommendations (not required, may not apply to all PRs):

- Add tests for your changes.
- Update the documentation if necessary.

## License

When you submit code changes, your submissions are understood to be under
[the same MIT license](LICENSE.md) that covers the project. Feel free to contact
the maintainers if that's a concern.
