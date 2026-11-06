# Olimpiada.al — production scheduler and uploads

This document supersedes the earlier private-library/S3 setup notes. The
current release **does not use private S3 storage**. The library was retired,
weekly answers accept text, teacher applications use profile text (not identity
documents), and the site editor accepts HTTPS image URLs. Legacy user uploads
(profiles, problems, comments, forums) still use Cloudinary.

Do not add `S3_PRIVATE_BUCKET`, `S3_ACCESS_KEY_ID`, or other S3 credentials to
Railway to enable features that no longer exist. Previously stored database
columns and private files are preserved; this release does not delete them.

## Weekly competition and scheduled coursework

The backend's scheduled worker opens/closes weekly challenges and dispatches
time-sensitive coursework notifications. One supported option is a single
in-process scheduler in a single-process, single-replica Railway API:

```text
ENABLE_INLINE_SCHEDULER=1
```

The default is **off**. Alternatively, schedule `backend/phase2_cron.py` in a
dedicated worker and leave the in-process scheduler disabled. Never run both or
multiple schedulers. The in-process worker polls approximately once per minute;
while the API sleeps or is down, jobs resume after it restarts. Verify the
current Railway instance/replica layout before enabling.

Keep `ENABLE_INACTIVE_ACCOUNT_CLEANUP` **disabled** unless account deletion is
explicitly approved; it is independent of the weekly scheduler.

## Before enabling production

1. Verify the exact release commit is deployed to Vercel *and* Railway.
2. Verify the backend `DATABASE_URL` targets the expected existing database,
   and that a fresh logical backup can actually be restored. Never paste
   database credentials into PR comments or chat.
3. Verify Alembic revision `77f26f3` and smoke-test login, forum access, weekly
   challenges, course publication, FAQ, and support abuse controls.
4. Check Cloudinary user uploads and SMTP/SES email on controlled test accounts.
5. Verify only one scheduler owner is active, and check logs after a scheduled
   transition. Verify that `STAGING_MODE` is not enabled on the live backend.
6. Leave Supabase Data API disabled; all app database traffic goes through FastAPI.

Configuration changes are **not** made by preparing or merging this code branch.
They require an explicit production rollout decision.
