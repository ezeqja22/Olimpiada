# Release without subscriptions

This change supersedes the subscription sections in the Phase 1/2 implementation
notes and staging audit. The release no longer sells or checks subscription tiers.

## Behavior

- Existing accounts use feed, problems, bookmarks and drafts without a plan.
- Legacy forum creation/editing again uses the master handler rules (site settings,
  approval, creator and membership permissions), not the release's paid-classroom gate.
- Library, learning materials, tests and tutoring require an account; their existing
  verification, publication, time, ownership and teacher/admin rules still apply.
- Public catalogues remain public. Private forums still require membership and bans
  still apply. Teacher approval and assigned-class isolation remain enforced.
- No pricing/trials/payment submissions, payment approvals or forum-tier editing.
  Retired backend routes return 404; /pricing redirects to /explore for old links.
- Tutoring review remains available at /admin/tutoring. Monthly operating expenses
  remain separate from the removed subscription payment flow.

## Database and rollout

No SQL migration is needed for this removal. Existing subscription/trial columns,
forum required_plan and payment history remain stored but are not used for access.
Do not drop columns or downgrade Alembic. Deploy backend and frontend from the same
release commit; an old backend would still deny free users despite the new UI.

Keep production on master until staging checks are complete. Check normal-account
login/refresh, drafts, notifications, forums, library, course tests and admin denial.
Existing custom CMS copy, FAQ entries or synthetic forum titles saved in the database
may still mention subscriptions; review these through the content editor. Code
defaults and navigation no longer advertise them. No existing CMS data is deleted.

Fresh staging seeds use demo-admin, demo-free, demo-student, demo-member, demo-other
and demo-teacher. Existing seeded accounts continue to work; their old names/tiers
do not change permissions. Do not rerun the seed against an existing database.

## Rollback

Revert this commit and redeploy the preceding backend and frontend together.
No database rollback is required. This restores the earlier tier gates and payment UI,
so accounts without an active tier would again encounter the former restrictions.
