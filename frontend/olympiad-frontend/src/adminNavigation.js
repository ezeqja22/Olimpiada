// Single source of truth for the sidebar, dashboard directory and breadcrumbs.
// Keep permissions consistent with the existing admin routes.
const asset = (file) => 'https://res.cloudinary.com/dqmmgk88b/image/upload/' + file;
const icons = {
 dashboard: asset('v1760811298/Dashboard_admin_panel_omb7cw.svg'),
 users: asset('v1760811397/Users_admin_panel_lzwnqx.svg'),
 forums: asset('v1760811442/Forums_admin_panel_bmseel.svg'),
 reports: asset('v1760811440/Reports_admin_panel_mun0ix.svg'),
 history: asset('v1760811353/Users_Hirstory_admin_panel_eqvfdf.svg'),
 settings: asset('v1760811439/Settings_admin_panel_cpayja.svg'),
 email: asset('v1760811297/Email_admin_panel_zjmkz7.svg'),
 analytics: asset('v1760811310/Analytics_admin_panel_en0409.svg'),
};
const item = (path,en,sq,descriptionEn,descriptionSq,icon,adminOnly=false) =>
 ({path,en,sq,descriptionEn,descriptionSq,icon,adminOnly});
export const adminGroups = [
 {id:'overview',en:'Overview',sq:'Përmbledhje',items:[
  item('/admin','Dashboard','Paneli kryesor','Overview and management tools','Përmbledhje dhe mjete administrimi','dashboard'),
  item('/admin/analytics','Analytics','Statistikat','Platform activity and trends','Aktiviteti dhe statistikat e platformës','analytics'),
 ]},
 {id:'competitions',en:'Competitions',sq:'Garat',items:[
  item('/admin/olympiads','Olympiads','Olimpiadat','Review, edit and publish competition guides','Shqyrto, redakto dhe publiko udhëzuesit e olimpiadave','olympiads'),
  item('/admin/weekly','Weekly challenge','Sfida e javës','Schedule problems, grade solutions and publish rankings','Programo problemet, vlerëso zgjidhjet dhe publiko renditjen','weekly'),
 ]},
 {id:'learning',en:'Learning resources',sq:'Burimet mësimore',items:[
  item('/admin/library','Online library','Biblioteka online','Upload and manage books, PDFs and training materials','Ngarko dhe administro libra, PDF dhe materiale trajnimi','library'),
  item('/admin/courses','Materials & tests','Materiale dhe teste','Create learning materials, assignments and tests','Krijo materiale mësimore, detyra dhe teste','courses'),
  item('/admin/content','Educational content','Përmbajtja mësimore','Manage educational content and teacher subjects','Administro përmbajtjen mësimore dhe lëndët e mësuesve','forums'),
 ]},
 {id:'community',en:'Community & moderation',sq:'Komuniteti dhe moderimi',items:[
  item('/admin/users','Users','Përdoruesit','Manage members, roles and accounts','Administro anëtarët, rolet dhe llogaritë','users'),
  item('/admin/forums','Forums','Forumet','Moderate discussions and forums','Modero diskutimet dhe forumet','forums'),
  item('/admin/reports','Reports','Raportimet','Review reported content and moderation requests','Shqyrto përmbajtjen e raportuar dhe kërkesat për moderim','reports'),
  item('/admin/user-history','User history','Historiku i përdoruesve','Review member activity and history','Shqyrto aktivitetin dhe historikun e anëtarëve','history'),
 ]},
 {id:'mentoring',en:'Teachers & families',sq:'Mësuesit dhe familjet',items:[
  item('/admin/teachers','Teacher applications','Aplikimet e mësuesve','Review and verify teacher applications','Shqyrto dhe verifiko aplikimet e mësuesve','history'),
  item('/admin/tutoring','1-to-1 tutoring','Mentorimi individual','Manage tutoring requests','Administro kërkesat për mentorim individual','users'),
  item('/admin/parents','Parent reports','Raportet e prindërve','Review family and student progress reports','Shqyrto raportet e familjeve dhe progresin e nxënësve','reports'),
 ]},
 {id:'website',en:'Website & communication',sq:'Faqja dhe komunikimi',items:[
  item('/admin/site-content','Website content','Përmbajtja e faqes','Edit public pages, banners and branding','Redakto faqet publike, bannerat dhe identitetin vizual','settings',true),
  item('/admin/faq','FAQ','Pyetjet e shpeshta','Manage frequently asked questions','Administro pyetjet e shpeshta','faq'),
  item('/admin/support','Support','Mbështetja','Respond to support requests','Përgjigju kërkesave për mbështetje','email'),
  item('/admin/email','Email campaigns','Fushatat me email','Compose and manage email campaigns','Përgatit dhe administro fushatat me email','email',true),
  item('/admin/settings','System settings','Cilësimet e sistemit','Manage platform configuration','Administro konfigurimin e platformës','settings',true),
 ]},
];
export function adminIcon(key){ return icons[key]; }
export function adminRoleLabel(role,lang){
 const labels={admin:['Administrator','Administrator'],super_admin:['Super administrator','Superadministrator'],moderator:['Moderator','Moderator'],reviewer:['Reviewer','Shqyrtues'],user:['User','Përdorues'],teacher:['Teacher','Mësues'],student:['Student','Nxënës']};
 return labels[role]?.[lang==='sq'?1:0] || role?.replaceAll('_',' ') || '';
}
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function getAdminGroups(role, query=''){
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 return adminGroups.map(group=>({...group,items:group.items.filter(entry=>{
  if(entry.adminOnly&&!['admin','super_admin'].includes(role))return false;
  const haystack=normalize([group.en,group.sq,entry.en,entry.sq,entry.descriptionEn,entry.descriptionSq,entry.path].join(' '));
  return terms.every(term=>haystack.includes(term));
 })})).filter(group=>group.items.length);
}
export function isAdminRouteActive(current,path){
 return path==='/admin'?current===path:current===path||current.startsWith(path+'/');
}

export function adminStatusLabel(status,lang){
 const labels={pending:['Pending','Në pritje'],approved:['Approved','Miratuar'],rejected:['Rejected','Refuzuar'],open:['Open','E hapur'],in_progress:['In progress','Në proces'],under_review:['Under review','Në shqyrtim'],resolved:['Resolved','Zgjidhur'],dismissed:['Dismissed','Hedhur poshtë'],active:['Active','Aktiv'],inactive:['Inactive','Joaktiv'],banned:['Banned','I bllokuar'],scheduled:['Scheduled','Programuar'],published:['Published','Publikuar'],closed:['Closed','Mbyllur'],draft:['Draft','Draft'],sent:['Sent','Dërguar'],failed:['Failed','Dështuar']};
 return labels[status]?.[lang==='sq'?1:0] || String(status||'').replaceAll('_',' ');
}
