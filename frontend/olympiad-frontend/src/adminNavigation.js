// Single source of truth for admin navigation and dashboard shortcuts.
const icon = name => `https://res.cloudinary.com/dqmmgk88b/image/upload/${name}.svg`;
const icons = {
 dashboard: icon("v1760811298/Dashboard_admin_panel_omb7cw"),
 users: icon("v1760811397/Users_admin_panel_lzwnqx"),
 forums: icon("v1760811442/Forums_admin_panel_bmseel"),
 reports: icon("v1760811440/Reports_admin_panel_mun0ix"),
 history: icon("v1760811353/Users_Hirstory_admin_panel_eqvfdf"),
 settings: icon("v1760811439/Settings_admin_panel_cpayja"),
 email: icon("v1760811297/Email_admin_panel_zjmkz7"),
 analytics: icon("v1760811310/Analytics_admin_panel_en0409"),
};
const item = (slug, en, sq, glyph, adminOnly = false) => ({
 path: slug ? `/admin/${slug}` : "/admin", en, sq, icon: icons[glyph], adminOnly,
});
export const adminGroups = [
 {id:"overview", en:"Overview", sq:"Përmbledhje", items:[
  item("", "Dashboard", "Paneli kryesor", "dashboard"),
  item("analytics", "Analytics", "Analitika", "analytics"),
 ]},
 {id:"publishing", en:"Competitions & resources", sq:"Garat dhe materialet", items:[
  item("olympiads", "Olympiads", "Olimpiadat", "reports"),
  item("weekly", "Problem of the Week", "Problema e Javës", "analytics"),
  item("library", "Online library", "Biblioteka online", "forums"),
  item("courses", "Materials & tests", "Materiale dhe teste", "forums"),
  item("content", "Content management", "Menaxhimi i përmbajtjes", "forums"),
 ]},
 {id:"community", en:"Community & moderation", sq:"Komuniteti dhe moderimi", items:[
  item("users", "Users", "Përdoruesit", "users"),
  item("forums", "Forums", "Forumet", "forums"),
  item("reports", "Reports", "Raportimet", "reports"),
  item("user-history", "User history", "Historiku i përdoruesve", "history"),
 ]},
 {id:"learning", en:"Teachers & families", sq:"Mësuesit dhe familjet", items:[
  item("teachers", "Teacher applications", "Aplikimet e mësuesve", "history"),
  item("tutoring", "1-to-1 requests", "Kërkesat individuale", "analytics"),
  item("parents", "Parent reports", "Raportet për prindërit", "users"),
 ]},
 {id:"website", en:"Website & communication", sq:"Faqja dhe komunikimi", items:[
  item("site-content", "Website content", "Përmbajtja e faqes", "settings", true),
  item("faq", "FAQ", "Pyetje të shpeshta", "settings"),
  item("support", "Support", "Mbështetja", "email"),
  item("email", "Email", "Email", "email", true),
  item("settings", "Settings", "Cilësimet", "settings", true),
 ]},
];
export const adminLabel = (entry, lang) => entry[lang === "en" ? "en" : "sq"];
export const adminRoleLabel = (role, lang) => ({
 admin: {en:"Administrator",sq:"Administrator"},
 super_admin: {en:"Super administrator",sq:"Superadministrator"},
 moderator: {en:"Moderator",sq:"Moderator"},
 reviewer: {en:"Reviewer",sq:"Vlerësues"},
 user: {en:"User",sq:"Përdorues"},
 student: {en:"Student",sq:"Nxënës"},
 teacher: {en:"Teacher",sq:"Mësues"},
}[role]?.[lang === "en" ? "en" : "sq"] || String(role || "").replaceAll("_"," "));
export const adminPathActive = (path, pathname) =>
 path === "/admin" ? pathname.replace(/\/$/, "") === path : pathname === path || pathname.startsWith(path + "/");
const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
export function visibleAdminGroups(role, query = "") {
 const search = normalize(query);
 const isAdmin = ["admin","super_admin"].includes(role);
 return adminGroups.map(group => ({
  ...group,
  items: group.items.filter(entry =>
   (!entry.adminOnly || isAdmin) && (!search || normalize([group.en,group.sq,entry.en,entry.sq,entry.path].join(" ")).includes(search))
  ),
 })).filter(group => group.items.length);
}
