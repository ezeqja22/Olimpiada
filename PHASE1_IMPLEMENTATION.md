# Olimpiada — Faza 1 (branch: phase-1-foundation-security)

## Status
Implementation in the fork; NOT deployed. Existing production app must not be pointed to this branch until migrations, access tests and payment verification have passed.

## Migration & environment
1. Back up PostgreSQL and private assets.
2. Run from repository root with DATABASE_URL set: alembic upgrade head. The repository now includes an alembic.ini and a corrected import path. Test this on a PostgreSQL snapshot first.
3. Start backend with existing DATABASE_URL, SECRET_KEY and private Cloudinary credentials.
4. Configure Google Analytics measurement ID via existing Admin Settings google_analytics_id, then GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON (JSON string) in backend; give service account Viewer on GA4 property.
5. Make sure the existing Google Analytics consent flow is not duplicated; the new client prompt requires opt-in.
6. Assign the initial Super Admin out of band by setting users.is_superuser=true for the designated owner in a controlled database operation. An existing admin cannot grant itself Super Admin using the API.
7. Keep the original owner repository and default master branch unchanged until validation.

## Business rules
- Public: GET /public/problem-of-week, /public/forums (public titles only), /public/library (titles only), /site-info.
- Student Free: no protected course content.
- Free Trial: 1 calendar month of Medium access, one manual claim only (/access/trial/start).
- Basic: 1,000 ALL/month; forum access.
- Medium: 2,500 ALL/month; forum, materials, tests, meets.
- Premium: 2,500 ALL/month plus separately arranged 1:1 session payments; tutor-request approval never automatically charges money.
- Payment: private Cloudinary authenticated image, reviewer approve/reject. Approval only activates a plan once. Multiple months extend current same-plan access, with calendar-month arithmetic.
- Roles: student, teacher, reviewer, admin, super_admin; legacy moderator/admin remain mapped to staff. API role changes require Super Admin.
- A 10-minute idle timeout is enforced both in browser and by DB-backed revocable JWT sessions. Prior 24h tokens require signing in again.
- Inactive >365-day student accounts are anonymized (PII purged, email/username released) rather than hard-deleted to preserve foreign-key integrity and finance history. Staff accounts are excluded.
- Year-end expense email is sent in January of following year to designated Super Admin users.
- Internal site statistics remain separate from the GA4 Data API metrics; the dashboard shows both.

## Outstanding before production
- Verify Alembic migration on a database snapshot and existing data.
- Confirm banking details and manual receipt process with the business owner.
- Confirm per-session 1:1 prices, scheduling and payment collection; requests currently await manual admin confirmation.
- Verify Cloudinary authenticated-delivery support and private receipt signed URLs.
- QA actual student/staff flows on staging for 10-minute inactivity, trial usage, expired plans, forum-level content access, GA4 consent, upload approval, repeated approvals.
- Schedule the included backend/phase1_cron.py via a single daily external cron worker (example in file header), and prevent duplicate workers. The current periodic tasks run only while the API process stays alive; for multi-worker deployments use a dedicated single scheduled worker or external cron with locking.
- Review privacy/legal retention policy with counsel before activating year-old account anonymization.
