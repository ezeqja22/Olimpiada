import {expect,test} from "vitest";
import {adminGroups,adminLabel,adminPathActive,visibleAdminGroups} from "./adminNavigation";
const entries = groups => groups.flatMap(group => group.items);

test("every existing admin destination is present exactly once, in both languages", () => {
 const items=entries(adminGroups);
 const expected=["","analytics","olympiads","weekly","library","courses","content","users","forums","reports","user-history","teachers","tutoring","parents","site-content","faq","support","email","settings"].map(slug=>slug?"/admin/"+slug:"/admin");
 expect(items.map(item=>item.path).sort()).toEqual(expected.sort());
 for(const group of adminGroups) {
  expect(group.en).toBeTruthy();expect(group.sq).toBeTruthy();
  for(const entry of group.items) {expect(adminLabel(entry,"en")).toBeTruthy();expect(adminLabel(entry,"sq")).toBeTruthy();}
 }
 expect(adminLabel(items.find(item=>item.path==="/admin/olympiads"),"sq")).toBe("Olimpiadat");
 expect(adminLabel(items.find(item=>item.path==="/admin/library"),"en")).toBe("Online library");
});

test("admin-only shortcuts respect the original role restrictions even during search", () => {
 const paths=role=>entries(visibleAdminGroups(role)).map(entry=>entry.path);
 for(const role of ["admin","super_admin"]) expect(paths(role)).toContain("/admin/settings");
 for(const role of ["moderator","reviewer"]) {
  expect(paths(role)).not.toContain("/admin/settings");
  expect(paths(role)).not.toContain("/admin/site-content");
  expect(paths(role)).not.toContain("/admin/email");
  expect(entries(visibleAdminGroups(role,"email"))).toHaveLength(0);
  expect(paths(role)).toContain("/admin/olympiads");
 }
});

test("search recognizes both languages and unaccented Albanian spelling", () => {
 const paths=query=>entries(visibleAdminGroups("admin",query)).map(entry=>entry.path);
 expect(paths("olimpiadat")).toEqual(["/admin/olympiads"]);
 expect(paths("Olympiads")).toEqual(["/admin/olympiads"]);
 expect(paths("mesuesit")).toContain("/admin/teachers");
 expect(paths("NOT A SECTION")).toEqual([]);
});

test("active paths are exact or nested and never match unrelated prefixes",()=>{
 expect(adminPathActive("/admin","/admin/")).toBe(true);
 expect(adminPathActive("/admin","/admin/weekly")).toBe(false);
 expect(adminPathActive("/admin/library","/admin/library/23")).toBe(true);
 expect(adminPathActive("/admin/library","/admin/library-other")).toBe(false);
});
