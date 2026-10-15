# Crosswired publication status

## Private source: uploaded

- Repository: https://github.com/TandemTales/crosswired
- Visibility: **private**, verified through GitHub's repository API before upload.
- Branch: `main`.
- Prototype and Pages-ready build commit: `01eebf3c56ebde97c7907bf85653bd42f248d771`.
- Publication was explicitly authorized on 2026-10-15, including the private repository and public playable GitHub Pages build.

## Public GitHub Pages: blocked by the existing plan

The organization API reports TandemTales uses the `free` plan. Creating a public Pages site from `main` / `/docs` returned HTTP **422**:

> Your current plan does not support GitHub Pages for this repository.

GitHub's [Pages availability documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) states that GitHub Free for organizations supports Pages in public repositories; private repositories require an eligible paid plan. The repository must remain private, and no purchase or authorization expansion is permitted by this task. No plan was purchased, repository visibility changed, credentials created, or alternate publication route used.

**No public playable deployment exists from this publication attempt.** `https://tandemtales.github.io/crosswired/` is only the expected default location if Pages becomes available; it is not a delivered playable URL.

## Build and checks

- `npm test`: 10 engine tests passing after publication preparation.
- Existing browser verification: 14 checks passing, including a complete three-bout run; see [QA.md](QA.md).
- `npm run build`: copies and byte-verifies the five runtime assets into `docs/`, plus `.nojekyll`.
- Public build contains only `index.html`, `style.css`, `app.js`, `engine.js`, `favicon.svg` and `.nojekyll`. It excludes QA evidence, tests, local server and repository documentation.
- `git diff --cached --check` passed before the prototype commit.

## Local play remains available

Run `npm start` from this directory and open http://127.0.0.1:4187. No installation or paid service is needed.

If an eligible organization plan is already provided later, Pages can be enabled from branch `main`, folder `/docs`, and public deployment must then be verified. The present task does not authorize buying that plan or making the source repository public.
