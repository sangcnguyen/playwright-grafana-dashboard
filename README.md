# Playwright QA reporting

Playwright test results go into PostgreSQL, and Grafana shows them on dashboards.

## Setup

Needs Node.js and Docker.

```sh
npm install
npx playwright install
npm run db:up
npm run test:integration
```

Grafana runs at http://localhost:3000 (login `admin` / `admin`).

## Scripts

- `npm run test:integration`, `test:staging`, `test:production`: run tests with `TEST_ENV` set to that name
- `npm run test:headed`: run tests in visible browsers
- `npm run db:up`: start PostgreSQL and Grafana

`TEST_ENV` only labels the run in the database. To test a different site, set `BASE_URL` (default `https://demo.playwright.dev`).

## How it works

[reporters/postgres-reporter.ts](reporters/postgres-reporter.ts) saves results when a run finishes. It applies [db/schema.sql](db/schema.sql) first, so the tables are created automatically. It connects to `localhost:5432` as `playwright` / `playwright`.

- `test_runs`: one row per run, with totals and environment
- `test_results`: one row per test attempt, with error, steps and console output

Dashboards are in [grafana/provisioning/dashboards/json](grafana/provisioning/dashboards/json):

- **QA dashboard**: latest run, pass rate and duration trends, failures, slowest tests
- **Run details**: all tests in one run, opened from the QA dashboard
