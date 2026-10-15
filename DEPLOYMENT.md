# Crosswired publication status

## Public game and source

- **Play: https://tandemtales.github.io/crosswired/**
- Source: https://github.com/TandemTales/crosswired
- Visibility: **public**, explicitly approved by the owner after the initial private-repository plan blocker.
- Branch: `main`.
- Pages source: `main` / `/docs`; HTTPS enforced; Pages API reports `built` and `public: true`.
- Prototype and Pages-ready build commit: `01eebf3c56ebde97c7907bf85653bd42f248d771`.
- First successful public deployment commit: `7bddc0e37174a9d86b7e12d09e0e8d36dda47596`.
- [First successful deployment workflow](https://github.com/TandemTales/crosswired/actions/runs/38796194838).

## Verification on 2026-10-15

- All five public runtime assets returned HTTP **200** without authentication and their SHA-256 hashes matched the local tested `docs/` build exactly.
- Full deployed Chromium browser smoke suite: **14/14 passing** in a fresh anonymous context. This covered visible signal propagation, invalid wiring, placement, persistence, relay-to-weapon behavior, keyboard movement, pause/resume, a complete three-bout run with salvaged clock and armor, AI victory/loss, six edit/retry cycles, chassis changes and a 390px narrow-screen layout.
- No browser page exceptions or failed asset responses.
- Local engine suite: **10/10 passing**, including 100 deterministic reset/edit/retry cycles.
- `npm run build` copies and byte-verifies the five runtime assets into `docs/`, plus `.nojekyll`. Public Pages contains runtime assets only; the now-public source repository also contains documentation and tests.
- Local evidence: `.preview/public/http-results.json`, `.preview/public/browser-results.json`, and five deployed desktop/mobile screenshots. These generated QA files remain ignored by Git.

## Audit before public visibility

Reviewed both existing commits, all 21 tracked paths and 41 tracked file versions before changing visibility. Credential-pattern scanning found no credentials. Manual content review found no material private user data or inappropriate artifacts. Generated screenshots, local QA output, dependencies and environment/credential files were absent from tracked history. The optional browser test contains host-specific development paths, which are not credentials or private application data.

## Initial blocker and resolution

The first private-repository Pages creation attempt returned HTTP **422**, “Your current plan does not support GitHub Pages for this repository.” TandemTales uses GitHub Free. GitHub's [Pages availability documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) confirms Free supports public-repository Pages.

The owner subsequently explicitly approved making the existing repository public to publish it. After the audit, that exact repository was made public and Pages setup succeeded. No plan was purchased, credentials created, authorization expanded, or separate `-play` repository created. No other project was modified.

## Local play remains available

Run `npm start` from this directory and open http://127.0.0.1:4187. No installation or paid service is needed.

See [QA.md](QA.md) for the initial local verification and known prototype limits.
