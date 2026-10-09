CREATE TABLE IF NOT EXISTS test_runs (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT,
  total INTEGER,
  passed INTEGER,
  failed INTEGER,
  flaky INTEGER,
  skipped INTEGER,
  environment TEXT
);

CREATE TABLE IF NOT EXISTS test_results (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES test_runs (id) ON DELETE CASCADE,
  project TEXT,
  file TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  outcome TEXT NOT NULL,
  retry INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  error TEXT
);

ALTER TABLE test_results
ADD COLUMN IF NOT EXISTS line INTEGER,
ADD COLUMN IF NOT EXISTS error_stack TEXT,
ADD COLUMN IF NOT EXISTS steps TEXT,
ADD COLUMN IF NOT EXISTS stdout TEXT,
ADD COLUMN IF NOT EXISTS stderr TEXT;

ALTER TABLE test_runs
ADD COLUMN IF NOT EXISTS environment TEXT;