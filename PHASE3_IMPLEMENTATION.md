# Historical implementation notes (not current release policy)

Teacher-wide content restrictions, subscription tiers, the private library,
teacher ID/portrait uploads and the site-editor upload endpoint have since been
removed. Read `docs/INTEGRATION_REVIEW.md` and
`docs/PRIVATE_UPLOAD_REMOVAL.md` for the proposed master behavior. The QA and
environment sections below describe the original Phase 3 design, not current
deployment prerequisites.

# Olimpiada.al — Faza 3: UX & Menaxhimi

Branch: \`phase-3-ux-management\`, based on \`phase-2-core-features\`. **Not deployed.**
All changes in this branch depend on the Phase 1 and Phase 2 migrations and code.

## New / improved workflows

1. **Teachers:** A verified existing user applies at \`/teacher/apply\`. The application requires first/last name, birth date, subject, experience bio, private ID image and professional portrait image. It remains **pending** until an Admin or Super Admin approves at \`/admin/teachers\`. Approval grants the teacher role; assignment to a particular forum must be performed separately. Teacher classroom workspace: \`/teacher/workspace\`; only assigned forum content is reachable through the old forum API. Other global feed/problem lists remain locked. Teachers can post class materials, create valid Google Meet meetings and grade homework submissions; the latter creates a result notification.
2. **Notifications & email:** Existing NotificationBell, email sending and legacy email campaign admin UI are reused. New **Email Template Builder** lives within \`/admin/email\`: bilingual templates with safe placeholders \`{{name}}, {{title}}, {{child_name}}, {{forum_name}}, {{result}}, {{link}}\`. Editors can create templates and manually dispatch them to up to 25 explicitly selected verified user IDs. Automatic new homework/test notices use the existing one-minute maintenance process; results are notified when graded, forum meeting announcements are targeted at active forum members. In-app alerts remain available when outbound email isn't configured. Disabled templates do not send.
3. **Parents:** The Admin creates a parent-student link at \`/admin/parents\`; **both** the parent and student must accept through \`/family\` before a private progress report can be sent. Parents use a normal verified user account.
4. **Support & FAQ:** Public \`/support\` creates a ticket. Staff review at \`/admin/support\`, respond and set status. The migration seeds editable bilingual FAQ entries when the FAQ table is empty. Public \`/faq\` renders published questions, with two-language editing and ordering in \`/admin/faq\`. The support form is not a real-time chat; it is ticket-based.
5. **Branding/homepage:** Homepage visually modernized with editorial hero, feature cards, competition and community panels, digital library, Spark Education partner block, optional verified teacher gallery, editable call-to-action and simplified navigation. Admin can configure section titles, subtitles, HTTPS image URLs and internal CTA links in \`/admin/branding\` (six named section keys). Publicly uploaded images go to Cloudinary after compression, not ID-photo storage. No production assets or DNS were changed in this implementation.
6. **Language:** Albanian is default; English is selectable in the homepage navigation and stored in users.preferred_language. New bilingual templates use this preference for in-app and email notices. **Legacy subpages still require a comprehensive translation review**; this phase does not claim every historical UI string has been translated.

## Prepared user-provided image assets

Six resized WebP files have been prepared and are available in the conversation as an image archive, but **they are not yet present in the GitHub repository or public Cloudinary**. Upload via \`/admin/branding\` once staging is configured:
- \`hero-student.webp\` → hero
- \`competition-hall.webp\` → competition
- \`imo-team.webp\` → community
- \`olympiad-book.webp\` → library
- \`spark-partner.webp\` → partner
- \`olympiad-community.webp\` → optional community replacement

The hero/community/library sections currently display designed placeholders until images are uploaded. Check publication permissions and parental/participant consent before posting photographs of students or using booklet covers.

## Staging setup & dependencies

1. Make a verified backup of the existing PostgreSQL database. Test all changes on a **separate staging copy**, not live production.
2. Apply migrations in the repository root with \`DATABASE_URL\` pointing at staging: \`alembic upgrade head\`. Phase 3 adds revisions \`44f26c3\`, \`55f26d3\`, \`66f26e3\` and \`77f26f3\`; the full migration chain requires earlier phase revisions.
3. Configure \`SECRET_KEY\`, existing authentication/email credentials and a non-public document store (S3-compatible \`S3_PRIVATE_BUCKET\`, \`S3_ENDPOINT_URL\`, \`S3_REGION\`, \`S3_ACCESS_KEY_ID\`, \`S3_SECRET_ACCESS_KEY\`; or staging-only persistent \`PRIVATE_FILES_DIR\`). The teacher ID-photo bucket must never allow public reads. Restrict and audit staff access.
4. Configure \`CLOUDINARY_CLOUD_NAME\`, \`CLOUDINARY_API_KEY\`, \`CLOUDINARY_API_SECRET\` for Admin banner uploads. Use different public branding assets and private teacher-vetting images.
5. Configure **either** Resend (\`RESEND_API_KEY\`, \`RESEND_FROM_EMAIL\`) **or** SMTP (\`SMTP_SERVER\`, \`SMTP_PORT\`, \`SMTP_USERNAME\`, \`SMTP_PASSWORD\`), with a verified sending domain. Email failures are logged; an operational retry queue is recommended before sending large volumes.
6. Schedule a **single** every-minute worker, \`python backend/phase2_cron.py\`. This triggers weekly challenge transitions and scheduled coursework alerts. Keep the daily cleanup/year-end report worker \`backend/phase1_cron.py\` on its own daily schedule. Configure observability and single-worker locking.
7. Set up sensible request throttling/captcha at the reverse proxy for public support and signup endpoints. The support route itself has per-email hourly throttling but not IP-level bot protection.

## Required manual tests

- **Teacher review:** submit 2 images, verify pending, unauthorized ID photo access 403, approve with Admin, verify class list empty before assignment, assign one class, verify another class and global forum problems remain blocked. Test teacher upload, meeting and homework grading.
- **Notifications:** create a test/homework, confirm only eligible members are notified once. Confirm "New result" after teacher grading, verify in-app bell and email. Disable a template and ensure it no longer sends. Test English user preference.
- **Family:** link accounts; verify parent-only consent insufficient, both signatures allow report, wrong-user access denied. Review privacy expectations and age/guardian policy for children.
- **Support:** submit ticket without logging in, verify staff notification, respond from Admin and verify email delivery or an explicit failed-delivery state. Add/reorder/deactivate FAQ questions.
- **Branding:** upload actual user-provided WebP images via Admin, verify they render on desktop/mobile with sensible crops and alt text, switch SQ/EN, change text/link, check Spark logo, teacher gallery and empty states.
- **Regression:** Free/Basic/Medium/Premium access and payment verification; forum privacy; timed test; weekly winners; protected PDF library; migration against representative database snapshot; restore backup.

## Security / production limitations

- Teacher ID images are sensitive. Confirm a legal basis for collection, an age-aware notice, retention and deletion policy, private storage backups, incident controls and restricted reviewer roles before production. Staging data should be synthetic.
- Canvas-based libraries discourage casual downloads, but do **not** prevent determined screenshot capture.
- Not a web "live chat": live contact here means a support request/ticket.
- Automatic email delivery depends on configured credentials, worker scheduling, proper recipient addresses and deliverability; GitHub CI cannot verify real delivery.
- User-provided photos are only prepared in a local archive; upload/approval for public use is still outstanding.
- CI validates the build and backend automated tests but not staging user experience or privacy/legal compliance.
- Do not merge with master or deploy until staging is reviewed and security/manual QA is complete.

## Latest hardening

- Reviewer is not authorized to view teacher ID images or manage site branding, email dispatch, support, FAQ, teacher approval or parent reports; Admin/Super Admin controls those workflows.
- Teacher membership is limited to assigned classroom forums and forum administration actions are denied (including banning members, invitations, pins and global forum changes).
- Scheduled coursework alerts require both a material entitlement and access to the specific forum, and each recipient/item pair is recorded to avoid duplicate notifications.
- Forum selection for assigning approved teachers is now a searchable-by-eye named dropdown instead of numeric forum IDs.
- Admin can disable all FAQ items; this does not re-enable initial hard-coded questions.
