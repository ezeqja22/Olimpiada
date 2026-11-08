export const primaryNavigation = [
  { to: "/homepage", en: "Home", sq: "Kreu" },
  { to: "/feed", en: "Problems", sq: "Probleme" },
  { to: "/forums", en: "Forums", sq: "Forumet" },
  { to: "/weekly", en: "Weekly", sq: "Sfida e javës" },
  { to: "/courses", en: "Learning", sq: "Mësimi" },
];
export const moreNavigation = [
  { to: "/tutoring", en: "Tutoring", sq: "Mentorim" },
  { to: "/faq", en: "FAQ", sq: "Pyetje të shpeshta" },
  { to: "/support", en: "Support", sq: "Suport" },
  { to: "/teacher/apply", en: "Become a teacher", sq: "Bëhu mësues" },
];
export const subjects = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Other",
];
// Only explicit, recent in-app navigation may supply a login return destination.
export function loginIntent(to) {
  return { redirectTo: to, loginIntentAt: Date.now() };
}
export function loginDestination(
  state,
  now = Date.now(),
  logoutAt = Number(sessionStorage.getItem("olimpiada_logout_at") || 0),
) {
  const to = state?.redirectTo;
  if (
    typeof to !== "string" ||
    !to.startsWith("/") ||
    to.startsWith("//") ||
    /[\\\\\r\n]/.test(to)
  )
    return "/homepage";
  if (state?.loginIntentAt <= logoutAt) return "/homepage";
  if (
    !Number.isFinite(state?.loginIntentAt) ||
    now - state.loginIntentAt > 15 * 60 * 1000 ||
    now < state.loginIntentAt
  )
    return "/homepage";
  if (
    /^\/(login|signup|logout|verify-email|reset-password|forgot-password)([/?#]|$)/.test(
      to,
    )
  )
    return "/homepage";
  return to;
}
