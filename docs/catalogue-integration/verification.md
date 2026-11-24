# Integration verification — in progress, not merge-ready

Branch: codex/integration-olympiads-library. Integrates master c7020d9 and feature d26df95; logo/favicon changes retained. No production changes or deployments.

## Implemented and tested
- Closing weekly submissions no longer publishes results. Staff explicitly publish after closing and complete grading (user-approved policy). Pending and approved/unscored submissions block publication. Historical published rows are not modified. Submission/review/publication lock the same challenge row; PostgreSQL concurrency stress remains to be run.
- Public rankings require published status, not merely an expired deadline. Time-derived closing works if scheduler is stopped. Europe/Tirane schedule boundaries unchanged.
- Migration 88f2702 hides fileless legacy library metadata, retaining records and storage keys; new database default is hidden. Public catalogue omits fileless entries. Explicit admin visibility remains supported.
- Catalogue introductions use SitePageIntro; removed dark hero/headline conflict; protected cover headings remain readable. Browser visual verification pending.

## Evidence
- Complete backend suite: 63 passed, 68 subtests passed (620 existing deprecation warnings), 7.61 s, local SQLite.
- Complete frontend suite: 67 passed / 29 files; production build passes. Main JS 312.16 kB / 98.96 kB gzip.
- staging/catalogue_migration_check.py: PostgreSQL 17, predecessor schema reconstructed from master model definitions and stamped 77f26f3 (not a production dump). Upgrade 88f2701 + 88f2702, legacy privacy assertion, 18 guide rows, RLS flags, downgrade to 77f26f3 and re-upgrade passed. Database/cluster removed, including failed harness attempts.
- Railway staging currently runs 24e85a5 (November 6), not this branch. No deployment performed yet.

## Migration / rollback
Only use an isolated DB until approved. Run `alembic upgrade head` from revision 77f26f3 with DATABASE_URL explicitly selected. Take a verified backup before eventual production rollout.
Rolling back 88f2702 restores the previous visibility default but deliberately does NOT republish hidden records. Staff can restore visibility after checking a file is present and publication is appropriate.
Downgrading 88f2701 drops library_files, olympiad_guides and scores: it destroys new feature data. Prefer rolling application code forward/fixing issues; export and verify all new files/guides/scores before any downgrade. Legacy library rows survive the rehearsed rollback.
Deploying old weekly scheduler code after adopting manual publication can publish closed weeks automatically: disable the old worker before any application rollback and review pending weeks. No production scheduler configuration changed here.

## Outstanding before merge
- PDF bounded concurrency/cache/rate limiting, malformed/encrypted/resource exhaustion tests, concurrent reader/download performance, storage options and watermark quality.
- Expanded role matrix, PostgreSQL race tests, public leaderboard data minimization.
- Bilingual new admin strings and maintainable bilingual guide content; 18 guides' official sources/participation and seed-library redistribution rights/idempotency review. No external PDFs downloaded or seeded.
- Playwright desktop/mobile journeys and before/after screenshots on new interfaces; existing workflows regression checks.
- Verify staging DB isolation, deploy only staging, verify preview uses staging; current staging branch is old.
- Live grants/RLS role behavior is not established by checking RLS flags alone. This rehearsal does not verify production revision or settings.

Local test logs are under staging/.local-state and are not committed. No test credentials are committed.
