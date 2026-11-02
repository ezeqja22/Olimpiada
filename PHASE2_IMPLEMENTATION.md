# Olimpiada.al — FAZA 2

Branch: phase-2-core-features (based on phase-1-foundation-security, not master).
This is implementation code in the fork, not a production deployment.

## Screens and features
- /weekly — public Problem of the Week and private student submissions (text or PDF/JPG/PNG/WEBP).
- /admin/weekly — schedule a Monday challenge, supply official solution, review submissions, approve/reject. Approved submissions are public winners **only after Sunday 20:00 Europe/Tirane**.
- /create-problem and forum problem modal — visual math toolbar for common math expressions, automatic LaTeX serialization compatible with existing API, while preserving original problem/draft workflow.
- /forum-catalog — all approved forum titles, clear Basic/Medium/Premium entitlements, locked visuals.
- /admin/forum-tiers — set required plan per forum; privately invited forums also require valid membership.
- /forums and /forum/:id — existing forum chat/comments, tasks and forums preserved. Staff/Teacher can post materials and manage forums, students can post forum tasks they own and text comments.
- /courses — formatted lessons, homework and server-timed tests, with scheduled publication.
- /teacher/courses and /admin/courses — publishing tools.
- /library — public metadata catalogue (Books / Booklets / Papers / Scanned Olympiads), subject/level tags, olympiad/year.
- /library/:id — subscriber-only per-page canvas reader, server-side watermarked WEBP output and no full-PDF download endpoint.
- /admin/library — authenticated PDFs (25 MB / 400 pages max).

## Deployment requirements and safeguards
1. Back up and migrate **a staging copy of the existing PostgreSQL database** before production, using:
       alembic upgrade head
2. Phase 1 is a dependency. Do not deploy only Phase 2 on master without applying earlier migrations.
3. Configure a private storage backend:
   - Preferred: S3_PRIVATE_BUCKET, S3_ENDPOINT_URL (for S3-compatible provider), S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
   - Alternative for staging/single-instance servers: PRIVATE_FILES_DIR pointing to a persistent mounted directory outside the public/static web root. Ephemeral app disk is not safe in production.
   - Apply bucket policy denying public reads and restrict storage access credentials. Set encryption/backup and file retention appropriately.
4. Run **one** external cron entry per minute to apply scheduled transitions reliably (from repository root):
       * * * * * /venv/bin/python backend/phase2_cron.py
   It checks authoritative UTC timestamps derived from Europe/Tirane:
   Monday 08:00 opens scheduled challenge; Sunday 20:00 publishes approved winners and official solution.
   Idempotent: repeated calls do not double-publish. If offline at the target time it catches up once active.
5. Continue the Phase 1 daily finance/user cleanup cron independently. Do NOT run the Phase 1 costly daily job every minute.
6. Add private storage backups, and test publishing + PDF rendering on the intended hosting platform. Set max upload size at proxy/CDN as well.
7. Publish only scanned olympiad pages/books for which the platform holds the necessary distribution rights.

## Security boundaries and honest limitations
- Backend entitlement and resource access checks, not client blur, control protected content.
- Per-user signed JWT plus DB session timeout from Phase 1.
- Tests: questions are withheld before the test is started; server enforces scheduled availability, per-attempt time limit and one submission.
- Private PDFs never have a directly public URL, and only page images with watermark are returned to active subscribers. The client canvas disables ordinary copy/right-click/print shortcuts in the viewer.
- This is **not** screenshot-proof DRM. Device screenshots, browser devtools, secondary cameras and determined screen captures are outside the control of ordinary web pages. No web technology can promise a universal "no screenshot" guarantee.
- Canvas page images remain capturable by sufficiently motivated users. Watermarks help deter redistribution but do not fully stop it.
- Forum text chat is the existing community communication workflow; standalone private DMs are not included in this phase.

## QA before merge / production
- Run GitHub Actions ("Phase 1 & 2 checks") and inspect backend integration tests + frontend build.
- Test 10-minute JWT session behavior during timed exams (active page must keep session alive).
- Test with Free/Basic/Medium/Premium + trial + Teacher/Reviewer/Admin/Super Admin.
- Test paid forum tier changes, membership invitation and banned-member behavior.
- Test mobile visual math editor, insertion cursor, and problem saving with mixed text/formulas.
- Test the weekly schedule around March/October daylight-saving changes using Europe/Tirane.
- Test signed private PDFs, annual storage cost, image/page loading, upload size rejection and private attachments.
- Confirm no private file bucket is publicly readable and Cloudinary does not unintentionally mirror protected files.
- Confirm course scheduling/timer transitions on a real database and private browsers.
- Do not merge to master without reviewing staging and validating the backup recovery process.
