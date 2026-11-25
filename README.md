# Aegis Review

A release-readiness workspace for AppSec and AI engineering teams. Create a release, import recorded security observations as regression fixtures, review failed or missing checks, assign remediation owners, and replace fixtures to reevaluate a release. Export the evidence and results as JSON.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

For a built instance, run `npm run build` followed by `npm start`. The default address is `127.0.0.1:4173`. Configure `HOST`, `PORT`, and `AEGIS_DB` for the bind address, port, and SQLite location. The default database is `.data/workspace.sqlite`. Set `AEGIS_SECURE_COOKIE=1` when serving behind an HTTPS reverse proxy.

## Fixture format

Import a JSON array of 1–500 uniquely named fixtures. Each fixture must include at least one boolean observation.

```json
[
  {
    "name": "Standard request",
    "protectedDataRedacted": true,
    "outputSchemaValid": true,
    "toolScopeAllowed": true,
    "humanApprovalEnforced": true
  }
]
```

An explicit false result fails the check. A check with no observations is marked **Not run**. A check with passing observations and incomplete coverage is marked **Needs attention**. The release is ready only when all four checks pass across the full fixture set.

Observations are supplied by the team or its existing evaluations. Aegis Review calculates readiness from those observations. It makes no model or target network calls. The sample release includes an illustrative artifact inventory and generated observations.

## Current scope

This repository contains a working MVP with a browser UI, a Node API, and SQLite persistence. Each browser session receives an isolated workspace through an opaque cookie. The **Teams** view tracks release and remediation ownership. Shared sign-in, invitations, role-based permissions, audit history, and hosted operation are future SaaS work.

Gartner lists [AI Security Testing](https://www.gartner.com/reviews/market/ai-security-testing) as a market and includes testing, exposure management, and runtime defense in its broader [AI Application Security](https://www.gartner.com/reviews/market/ai-application-security) category. This MVP focuses on defensive release evidence.

## Verification

Run `npm test` for the check engine and API tests.
