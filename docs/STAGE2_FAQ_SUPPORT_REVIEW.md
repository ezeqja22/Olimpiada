# Stage 2 review: FAQ and Support

## Scope

- Public `/faq` and `/support` pages with SQ/EN copy and mobile layout.
- Admin-only `/admin/faq` and `/admin/support` management pages.
- FastAPI `/experience/faq`, `/experience/support/tickets`, and admin endpoints.
- Admin in-app notification for new tickets and optional reply email on a changed reply.
- **No migration, tier gate, paid plan, teacher-scoped access check, or scheduler.**
- The existing moderator/admin permissions are preserved. Regular users and teachers have the same access to the new public pages.

## Existing database

Read-only inspection confirmed `public.faq_entries` (6 records) and `public.support_tickets` (0 records) already exist in the production Supabase project, with the columns expected by the ORM. The new mappings use separate SQLAlchemy metadata to ensure the app's legacy `Base.metadata.create_all()` does **not** create these tables during startup.

All six entries from migration `77f26f3` advertise subscriptions or still-unreleased features. They remain in the database and admin editor, but the public API suppresses an entry **only while its English question and answer exactly match** the known seed text. Editing the entry's answer or creating a replacement makes it eligible for public display if active. No production data was changed.

## Verification performed

- `python -m unittest discover -s tests -p test_help_routes.py -v`: 7 tests pass against an isolated in-memory SQLite database.
- `npm test -- --run`: 7 frontend tests pass (includes Stage 1 math editor tests).
- `npm run build`: successful.
- Main FastAPI app smoke test, isolated temporary SQLite: `GET /experience/faq` HTTP 200, `POST /experience/support/tickets` HTTP 201, expected CORS response.
- `git diff --check`: clean.

## Before production merge

1. Review FAQ wording in the new admin page, since all legacy FAQs remain intentionally hidden until edited.
2. Confirm production backend and frontend deploy together. A Vercel-only preview hitting the existing production Railway API will receive 404 for `/experience/*` until the Stage 2 backend is deployed.
3. Add a provider/edge-level IP abuse limit or CAPTCHA to the anonymous support endpoint before announcing it broadly. The API currently limits each email address to three tickets per hour, which does not stop bots using different addresses.
4. Test one real support submission and one admin reply email after deployment, using a non-sensitive test ticket. No test tickets have been inserted into production.
5. Do **not** merge until the user explicitly approves Stage 2.
