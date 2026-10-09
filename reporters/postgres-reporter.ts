import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import { readFileSync } from "node:fs";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import pg from "pg";

const SCHEMA = readFileSync(
  path.join(import.meta.dirname, "../db/schema.sql"),
  "utf8",
);

// Playwright colors error messages; strip ANSI codes so they read cleanly in Grafana.
const clean = (text: string | undefined) =>
  text ? stripVTControlCharacters(text) : null;

const joinOutput = (chunks: (string | Buffer)[]) =>
  chunks.length
    ? clean(chunks.map((chunk) => chunk.toString()).join(""))
    : null;

// Renders the step tree as an indented log, e.g. "  ✓ page.goto(/todomvc) (120ms)".
const formatSteps = (steps: TestStep[], depth = 0): string =>
  steps
    .map((step) => {
      const line = `${"  ".repeat(depth)}${step.error ? "✗" : "✓"} ${step.title} (${Math.round(step.duration)}ms)`;
      return step.steps.length
        ? `${line}\n${formatSteps(step.steps, depth + 1)}`
        : line;
    })
    .join("\n");

type Row = {
  test: TestCase;
  result: TestResult;
};

export default class PostgresReporter implements Reporter {
  private rootDir = "";
  private startedAt = new Date();
  private rows: Row[] = [];

  onBegin(config: FullConfig, _suite: Suite) {
    this.rootDir = config.rootDir;
    this.startedAt = new Date();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.rows.push({ test, result });
  }

  async onEnd(result: FullResult) {
    const client = new pg.Client({
      host: "localhost",
      port: 5432,
      database: "playwright",
      user: "playwright",
      password: "playwright",
    });

    try {
      await client.connect();
      await client.query(SCHEMA);
      await client.query("BEGIN");

      // Count each test once, using its final attempt.
      const finalResults = new Map<TestCase, TestResult>();
      for (const { test, result } of this.rows) finalResults.set(test, result);
      const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
      for (const test of finalResults.keys()) {
        const outcome = test.outcome();
        if (outcome === "expected") counts.passed++;
        else if (outcome === "unexpected") counts.failed++;
        else if (outcome === "flaky") counts.flaky++;
        else counts.skipped++;
      }

      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO test_runs
           (started_at, finished_at, duration_ms, status, total, passed, failed, flaky, skipped, environment)
         VALUES ($1, now(), $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          this.startedAt,
          Math.round(result.duration),
          result.status,
          finalResults.size,
          counts.passed,
          counts.failed,
          counts.flaky,
          counts.skipped,
          process.env.TEST_ENV?.trim() || null,
        ],
      );
      const runId = rows[0].id;

      for (const { test, result } of this.rows) {
        await client.query(
          `INSERT INTO test_results
             (run_id, project, file, line, title, status, outcome, retry, duration_ms, started_at,
              error, error_stack, steps, stdout, stderr)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            runId,
            test.parent.project()?.name ?? null,
            path.relative(this.rootDir, test.location.file),
            test.location.line,
            test.titlePath().slice(3).join(" › "),
            result.status,
            test.outcome(),
            result.retry,
            Math.round(result.duration),
            result.startTime,
            clean(result.error?.message),
            clean(result.error?.stack),
            formatSteps(result.steps) || null,
            joinOutput(result.stdout),
            joinOutput(result.stderr),
          ],
        );
      }

      await client.query("COMMIT");
      console.log(
        `[postgres-reporter] Saved run #${runId} with ${this.rows.length} results.`,
      );
    } catch (err) {
      const message =
        (err as Error).message ||
        (err as { code?: string }).code ||
        String(err);
      console.warn(`[postgres-reporter] Could not save results: ${message}`);
    }
  }

  printsToStdio() {
    return false;
  }
}
