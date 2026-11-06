# Release without new private uploads

The release no longer requires S3_PRIVATE_BUCKET or PRIVATE_FILES_DIR.
- Weekly answers are text only; file submission/download endpoints are removed.
- Teacher applications use JSON text fields and require manual admin approval. No ID/portrait is collected. Approval does not constitute identity verification.
- Teacher cards no longer request portrait files.
- Site editor images use existing HTTPS URLs or bundled assets; upload endpoints are removed.
- Library and subscriptions remain removed.
- Existing master profile/problem/comment/forum image uploads still use Cloudinary.

No schema migration is required. Historical columns, records and files are retained, but retired downloads are unavailable. Account for any real attachment-only submissions before release.

Also fixed: CORS wraps account authorization so the allowed frontend receives 401/403 errors. Weekly/admin effects no longer return promises as React cleanup functions when navigating away.

## Production checks still required

Local tests cannot verify live deployment configuration. Before merging:
1. Confirm Railway and Vercel use the exact release commit and test the authenticated preview.
2. Check production REACT_APP_API_URL, FRONTEND_ORIGINS and that STAGING_MODE is off.
3. Verify real registration/password-reset email delivery with a controlled account.
4. Verify legacy Cloudinary uploads; these use a different storage provider.
5. Run exactly one scheduler: ENABLE_INLINE_SCHEDULER=1 with a single API process/replica, OR a separate phase2_cron worker. Otherwise weekly transitions and learning notices will not run. Keep inactive-account cleanup disabled unless deliberately approved.
6. Compare current production schema/revision to the release and keep a verified backup. Earlier reported schema checks are not a current automated production comparison. Keep Supabase Data API disabled.

Browser, PostgreSQL, historical migration and Docker checks now run for this release branch.

## Rollback

Revert this commit and redeploy matching frontend/backend versions together. No schema rollback is needed. Restoring upload code restores its storage requirements; it does not fix missing storage. Master/production is not changed by this work.
