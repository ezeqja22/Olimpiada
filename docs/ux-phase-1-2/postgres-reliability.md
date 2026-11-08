# PostgreSQL reliability verification — 2026-11-08

**PASS. Ready for manual local UI testing. Keep PR #6 in draft until manual review is complete.**

Tested branch `feat/ux-unification-phase-1-2` with PostgreSQL 17.11 on Windows, a new password-protected cluster bound only to `127.0.0.1`, a disposable database, and a real loopback Uvicorn HTTP server. The harness generates its own URL and never accepts an existing database URL. Production and staging were not contacted or modified.

## Load and results

1,105 HTTP requests including two setup logins, ten mixed batches at each concurrency, three injected database-error HTTP requests, and a separate 50-request pool-pressure batch. Total run including initialization and removal: **25.136s**. Mixed traffic duration: **12.502s**. These are short reliability checks, not a sustained capacity/soak benchmark.

| Concurrent requests | Requests | Wave duration | Mixed-request p95 | Result |
| --- | --- | --- | --- | --- |
| 20 | 201 | 3.214s | 0.244s | Pass |
| 35 | 351 | 4.081s | 0.325s | Pass |
| 50 | 501 | 5.207s | 0.393s | Pass |

Representative endpoints: `/auth/login`, `/auth/problems/`, `/auth/forums`, `/site-info`, `/get-settings`, `/core/courses/items`. Authenticated requests include an ordinary student and administrator. Unknown-account login and unauthenticated courses returned 401; missing routes returned 404. All statuses matched their expectations. Failed-login tests used a nonexistent account, avoiding artificial account lockouts.

The additional 50-request pressure batch held each SQLAlchemy connection using PostgreSQL `pg_sleep(0.1)` and completed in **0.780s**, all 200 responses. Pool settings remained **size 5, overflow 10, timeout 30s**. Peak checkout count was **15**, exercising the full available capacity and queuing additional work. **1227 checkouts / 1227 checkins**, zero checked out after every wave and at completion. PostgreSQL showed five idle pooled connections, no idle-in-transaction connections; disposal reduced the database's connections to zero.

## Failures, scheduler and safety

- 31 successful isolated scheduler cycles, 30 overlapping HTTP batches and one recovery cycle. The first cycle opened one scheduled weekly challenge and published one expired challenge; later cycles were idempotent.
- One additional intentionally failed scheduler cycle wrote a probe row then raised a real PostgreSQL division-by-zero error. Its transaction rolled back, its connection returned, and the next cycle succeeded.
- 108 failed endpoint invocations ran exactly once each. HTTP exceptions and SQL errors left zero probe records; no middleware replay.
- The actual `periodic_cleanup` entry point ran one cycle with only its sleep mocked, then cancellation. No `SessionLocal` NameError. Spies confirmed no inactive-account anonymization or annual-finance email invocation.
- Startup callbacks were disabled only in this isolated harness; production scheduler configuration was not changed. Material fixtures do not trigger learning-notice emails; mail adapters were additionally stubbed. **Zero mail calls**, no campaigns or external notifications.
- **Zero deadlocks, pool timeouts or unexpected HTTP errors.** Four PostgreSQL `ERROR: division by zero` entries are deliberate fault injections (three requests, one scheduler). Their timestamped log excerpts are in the JSON report. Uvicorn access/error logging is suppressed for injected failures; no credentials or response tokens are recorded.

## Cleanup verification

The successful run removed two accounts, one problem, one forum, one material, two weekly challenges and 107 login sessions by dropping the exclusively owned database. Per-table counts are recorded in the JSON. Verified: zero connections before drop, database absent from `pg_database`, cluster stopped, loopback port closed, cluster directory removed. No test records remain.

A separate `--verify-failure-cleanup` run intentionally raised immediately after creating fixtures. It exited nonzero as expected; all the same cleanup assertions passed. Its report has `passed: false` to accurately describe the injected test failure, with successful cleanup evidence. The initial Windows pipe-capture setup attempt was interrupted before creating fixtures; its stopped port and removed directory were also checked. No disposable cluster directories remain. Existing SQLite suite tables were also verified empty after regressions.

## Changes and regression suite

No new application bug was found, and no production code, pool limits or database migration changed. Added the reusable isolated PostgreSQL harness and two scheduler regression cases covering either weekly transitions or learning notices failing after a write. Backend suite after changes: **56 passed, 68 subtests passed**, 524 existing warnings, 5.80s. Frontend code is unchanged in this follow-up; prior frontend/build/browser evidence remains in the main report.

## Limits and merge decision

This validates local PostgreSQL session lifecycle and recovery, not production capacity, Railway latency, Supavisor behavior, multiple replicas, prolonged soak behavior or all business endpoints. Schema setup uses SQLAlchemy model metadata including help tables; this is not an Alembic upgrade rehearsal. Ordinary endpoint traffic uses small synthetic datasets, not production cardinality. A pool-pressure endpoint is test-only and is never imported into the deployed app. External mail delivery and destructive account jobs are deliberately untested.

Proceed with manual local UI testing. This check found no additional backend blocker, but does not replace UI acceptance, environment checks or explicit merge approval. PR remains draft; no merge or deployment was performed.

Artifacts: [measured results](postgres-reliability.json), [failure cleanup evidence](postgres-failure-cleanup.json), [reproduction instructions](verification.md).
