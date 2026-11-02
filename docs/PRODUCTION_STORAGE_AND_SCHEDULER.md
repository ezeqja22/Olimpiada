# Olimpiada.al — private storage and scheduled jobs (staging release gate)

The production Supabase organization is **Olimpiada Org** (Free). A private
Storage bucket **olimpiada-private** exists on project `kohedppeopyetktyujmr`.
It accepts PDF/JPEG/PNG/WEBP with a **25 MiB per-object limit**. Never turn
the bucket public. There are no browser/client Storage RLS permissions.

## 1. Production storage (requires secure server-side credentials)

The backend supports Supabase Storage through its S3-compatible API using
the existing `boto3` dependency. Configure the **existing Railway backend**
only after testing using a non-production S3 credential. Use the Supabase
dashboard: Storage > S3 > Enable S3 connection, generate project S3 access
keys. Do **not** put those keys in GitHub, issues, frontend code or chat.

Environment variables in Railway's existing backend service:

```text
S3_PRIVATE_BUCKET=olimpiada-private
S3_ENDPOINT_URL=https://kohedppeopyetktyujmr.storage.supabase.co/storage/v1/s3
S3_REGION=eu-north-1
S3_ACCESS_KEY_ID=<secret set privately in Railway>
S3_SECRET_ACCESS_KEY=<secret set privately in Railway>
```

S3 keys bypass Storage RLS: only the FastAPI server may hold them.
Client sessions use FastAPI's existing authentication/authorization routes.
No public/signed file URLs are needed. Keep S3 credentials confidential,
rotate upon exposure and restrict who can view environment variables.

The helper in `private_pdf_storage.py` applies path-style addressing for
custom S3 endpoints and omits the unsupported S3 SSE header for Supabase.
AWS S3 still receives `AES256`. Uploaded files are private server-side.
Do not enable upload endpoints before validating credential access, sample
upload, download, deletion, and permission checks with synthetic files.

**Quota:** Free Storage includes 1 GB total; this bucket's object size cap is
25 MiB. Run a usage check before bulk materials or adding many student files.
Uploads should be rejected/capped when close to the Free limit.

## 2. Problem of the Week without an additional Railway service

The existing production Railway backend currently has one replica and runs
FastAPI with one Uvicorn process. After the exact code is deployed and
verified, `ENABLE_INLINE_SCHEDULER=1` opts in to a minute-based loop within
that process. It calls the same services as `backend/phase2_cron.py`, so
schedules use Europe/Tirane calendar boundaries and are catch-up aware.

```text
ENABLE_INLINE_SCHEDULER=1
```

**Never** enable this while `phase2_cron.py` is scheduled elsewhere.
Run only one API replica/process, otherwise email notifications may be
duplicated. This is an availability tradeoff: while FastAPI is down or
sleeping, transitions resume on the next scheduled poll after startup.
Minute polling normally transitions within 60 seconds of the deadline;
it is not a real-time guarantee.

The flag defaults to disabled, including CI and Docker staging where a
separate scheduler exists. Do not enable real mailing to synthetic accounts.

## 3. Gate before live deployment

- Verify the Railway `DATABASE_URL` points to `kohedppeopyetktyujmr`
  privately; do not copy the connection string into GitHub or chat.
- Verify backup/restore readiness; the previous internal table snapshot is
  **not** a full PostgreSQL logical backup.
- Run all PostgreSQL + backend regression + browser CI on the exact commit.
- Verify the live frontend owner/project and latest Nov 2 UI changes.
- Confirm authenticated upload permissions and private document reads.
- Confirm SMTP/Resend, cron single ownership, and subscription policies.
- Keep the production PR in **Draft** until these gates pass.

The updates in this staging branch do not deploy or change Railway config.
