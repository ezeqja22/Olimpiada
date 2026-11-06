# Remaining release features — master integration review

This review branch combines `master` (including the previously approved Stage 1
visual-math-editor fixes and Stage 2 FAQ/support spam protections) with
`release/olimpiada-all-changes-2026-11-02`. It is prepared for a PR review; it
does not modify production infrastructure, production data, or `master` by itself.

## Included

- **Weekly Problem of the Week:** admin-created challenges, text solutions,
  reviewed winners, scheduled opening/closing, and results publication.
- **Learning:** scheduled materials, timed tests, homework submissions and
  grading, with normal account/ownership/private-forum checks.
- **Teacher and family tools:** optional teacher application and admin review,
  assigned-class management workspace, meeting/grades workflow, and family
  reports with consent checks.
- **Admin and public UX:** redesigned homepage, bilingual content, site editor,
  announcements/notifications, analytics consent and GA4 dashboard, teacher
  review tools, support, and FAQ management.
- **Security fixes:** existing login/CORS/editor fixes, Stage 2 FAQ/support
  endpoints (including abuse protection), single handlers for those routes,
  session validation, and permission regression tests.

## Explicit decisions preserved

- **No subscription gating:** no billing/tier checking, trial sales, tier-based
  forum visibility or payment approval flow. Historical subscription columns
  remain in PostgreSQL only for compatibility and audit; ordinary accounts
  retain their content permissions regardless of their former plan.
- **Teachers are regular site participants too:** they see public forums,
  global problems, and published material like other users. Private forums
  still require membership; banned accounts remain barred. Their badge does
  not reveal another author's timed test body or private course management
  data. Their *teacher-only actions* (class meeting creation, grading, etc.)
  retain appropriate class and role controls.
- **No new private file uploads:** weekly submissions are text only, teacher
  applications do not ask for identity documents, the old PDF library is
  retired, and the site editor uses URLs. Existing public Cloudinary upload
  flows remain in place. Historical database rows/files are not deleted.
- **FAQ seed review:** six original FAQ records contain descriptions of the
  retired subscription/library flow. Exact legacy text is deliberately hidden
  from the public `/faq` endpoint until an admin edits it. At `/admin/faq`,
  click **Edit**, update Albanian and English fields, leave **Active** checked,
  then save; the updated record becomes visible. Newly created FAQs are
  visible if Active.

## Validated during integration

- Backend unit/integration suite: **45 passing tests** against an isolated
  ephemeral SQLite database, including public teacher access and private-test
  regression checks.
- Frontend suite: **20 passing tests**; Vite production build succeeds.
- Production PostgreSQL checked **read-only**: Alembic revision `77f26f3` and
  the release's schema tables were found. No migration or data write ran.
- Only one FAQ/support API implementation is registered; this preserves the
  hardened Stage 2 support honeypot/rate limiting and admin permissions.

## Before deploying a merge

1. Ensure Vercel and Railway deploy the **same reviewed commit** and the
   expected backend/production database. Confirm `STAGING_MODE` is off.
2. Obtain and verify a **fresh, restorable PostgreSQL logical backup**. Earlier
   table snapshots and read-only schema checks are not substitute backups.
3. Smoke-test login, teacher/normal roles, public and private forums, weekly
   submissions, timed tests, the site editor, FAQ admin edit, support limits,
   notifications and Cloudinary uploads with controlled accounts.
4. Keep the scheduled worker **disabled until single ownership is verified**.
   Enable exactly one `phase2_cron` worker or the in-process scheduler (only
   one API process/replica). Account cleanup is a separate, opt-in operation.
5. Check production email/analytics settings and review platform logs after
   deployment. The old `olimpiada.al` password-reset link can be addressed
   when DNS/domain is ready; do not treat it as a valid tested end-to-end link.

See `docs/NO_SUBSCRIPTIONS_RELEASE.md`,
`docs/PRIVATE_UPLOAD_REMOVAL.md`, and
`docs/PRODUCTION_STORAGE_AND_SCHEDULER.md` for more detail. Earlier
`PHASE*_IMPLEMENTATION.md` files are historical notes; their old tier and
upload instructions must not be used for the current release.
