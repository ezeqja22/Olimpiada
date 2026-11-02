# Windows local staging — NO Docker

This is the fastest way to test the user interface and most backend features.

Prerequisites: **Python 3.12**, **Node.js 22.12+**, Git.

CMD (repository root):

    git fetch origin
    git switch staging-validation
    git pull --ff-only origin staging-validation
    staging\local-setup.cmd

**The setup creates 6 accounts** (Admin, Teacher, Free, Basic, Medium, Premium) and prints
their randomly generated demo passwords once to CMD. Record them locally.
If already seeded, demo users are kept and no new passwords are printed.
To reset demo passwords only (without deleting your test data):

    staging\\local-reset-passwords.cmd

Demo login accounts use `demo-admin@example.com`, `demo-free@example.com`,
`demo-basic@example.com`, `demo-medium@example.com`,
`demo-premium@example.com`, `demo-teacher@example.com`.

**Upgrading from older staging:** the launcher automatically renames the six
old `@olimpiada.test` accounts to `@example.com`, preserving their existing
passwords and other data. Restart the API after pulling this change.
The `example.com` addresses are reserved for examples and are not mailboxes.

Open **two separate CMD windows** in the repository root:

    staging\local-api.cmd

And:

    staging\local-frontend.cmd

Local URLs:
- Site: http://127.0.0.1:5174/homepage
- Backend API: http://127.0.0.1:8001/docs

The local SQLite database, test files and a random signing secret are stored
in ignored \`staging/.local-state/\`. All ports are loopback-only.

**Important limits**:
- This is **SQLite**, not production PostgreSQL; DB migrations and concurrency
  are still verified separately in GitHub Actions with PostgreSQL.
- The local version does **not** send email and has no Mailpit inbox.
  Verification emails are unavailable. Use pre-verified demo accounts.
- Do not enter real personal information, payment data or identity photos.
- Do not connect production accounts, SMTP, Cloudinary or storage credentials.
- Closing each CMD window stops its local server but preserves demo data.
- Do not merge staging-validation to master merely because local testing works.

If it fails, copy just the error messages — never share demo passwords or secrets.

## Website text & photo editor (Admin only)

Log in with `demo-admin@example.com` and open:

    http://127.0.0.1:5174/admin/site-content

The new **Përmbajtja e Website-it** item is inside the existing Admin sidebar.
Use the left panel to choose a homepage section (including founders, cards,
mentors, partner) or a main page (FAQ, Support, pricing, weekly challenge,
library, courses, forums, teaching/tutoring). Choose **SQ/EN** to update the
corresponding text; upload JPG/PNG/WEBP (<=5MB), review the inline preview,
then **Ruaj ndryshimet** to publish in the *local test database*.

- Empty texts automatically fall back to their original translated content.
- Founder biographies: first description line; each additional line is a bullet.
- The editor changes public page copy and photos, not payment prices, plan
  entitlements, login/security strings, or private user-generated content.
  Use the existing Admin menus for questions in FAQ, learning resources,
  teacher assignments, and forum/course objects.
- The former `/admin/branding` URL points to this editor.
- Photos uploaded on no-Docker staging are saved in its isolated state
  under `staging/.local-state/` and **are not production media**.
- Production photo uploads use configured Cloudinary; do not merge/deploy
  until production storage, backups and database migrations are validated.
