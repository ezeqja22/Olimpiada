import React from 'react';
import {describe,expect,test,vi} from 'vitest';
import {render,screen,fireEvent,within} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import {adminGroups,getAdminGroups,isAdminRouteActive} from './adminNavigation';
import AdminDirectory from './components/AdminDirectory';

const language=vi.hoisted(()=>({lang:'en'}));
vi.mock('./context/LanguageContext',()=>({useLanguage:()=>language}));

const expected=['/admin','/admin/analytics','/admin/olympiads','/admin/weekly','/admin/library','/admin/courses','/admin/content','/admin/users','/admin/forums','/admin/reports','/admin/user-history','/admin/teachers','/admin/tutoring','/admin/parents','/admin/site-content','/admin/faq','/admin/support','/admin/email','/admin/settings'].sort();
describe('Admin navigation',()=>{
 test('every admin workspace appears exactly once and has bilingual labels and descriptions',()=>{
  const entries=adminGroups.flatMap(group=>group.items);
  expect(entries.map(item=>item.path).sort()).toEqual(expected);
  for(const group of adminGroups){expect(group.en).toBeTruthy();expect(group.sq).toBeTruthy();}
  for(const item of entries){expect(item.en).toBeTruthy();expect(item.sq).toBeTruthy();expect(item.descriptionEn).toBeTruthy();expect(item.descriptionSq).toBeTruthy();}
 });
 test('preserves existing role restrictions even during search',()=>{
  const admin=getAdminGroups('admin').flatMap(g=>g.items);
  expect(admin).toHaveLength(19);
  expect(getAdminGroups('super_admin').flatMap(g=>g.items)).toHaveLength(19);
  for(const role of ['moderator','reviewer']){
   const staff=getAdminGroups(role).flatMap(g=>g.items);
   expect(staff).toHaveLength(16);
   expect(staff.some(i=>i.adminOnly)).toBe(false);
   expect(getAdminGroups(role,'Email campaigns')).toEqual([]);
  }
 });
 test('search works across both languages and ignores Albanian diacritics',()=>{
  expect(getAdminGroups('admin','olimpiadat').flatMap(g=>g.items).map(i=>i.path)).toContain('/admin/olympiads');
  expect(getAdminGroups('admin','perdoruesit').flatMap(g=>g.items).map(i=>i.path)).toContain('/admin/users');
  expect(getAdminGroups('admin','library').flatMap(g=>g.items).map(i=>i.path)).toContain('/admin/library');
  expect(getAdminGroups('admin','zzzzz')).toEqual([]);
 });
 test('active matching respects route boundaries',()=>{
  expect(isAdminRouteActive('/admin/library','/admin')).toBe(false);
  expect(isAdminRouteActive('/admin/library','/admin/library')).toBe(true);
  expect(isAdminRouteActive('/admin/library-other','/admin/library')).toBe(false);
 });
 test('dashboard exposes both new pages and filters them in either language',()=>{
  language.lang='en';
  render(<MemoryRouter><AdminDirectory role="admin"/></MemoryRouter>);
  expect(screen.getByRole('link',{name:/Olympiads/})).toHaveAttribute('href','/admin/olympiads');
  expect(screen.getByRole('link',{name:/Online library/})).toHaveAttribute('href','/admin/library');
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'olimpiadat'}});
  expect(screen.getByRole('link',{name:/Olympiads/})).toBeInTheDocument();
  expect(screen.queryByRole('link',{name:/Online library/})).not.toBeInTheDocument();
 });
 test('Albanian moderator directory uses translated labels and hides restricted tools',()=>{
  language.lang='sq';
  render(<MemoryRouter><AdminDirectory role="moderator"/></MemoryRouter>);
  expect(screen.getByRole('link',{name:/^Olimpiadat/})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/^Biblioteka online/})).toBeInTheDocument();
  expect(screen.queryByRole('link',{name:/^Cilësimet e sistemit/})).not.toBeInTheDocument();
 });
});

vi.mock('axios',()=>({default:{get:vi.fn()}}));
test('the actual admin sidebar renders the new catalogue routes',async()=>{
 language.lang='en';
 axios.get.mockResolvedValue({data:{role:'admin',username:'Test staff'}});
 const originalMatchMedia=window.matchMedia;
 Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});
 localStorage.setItem('token','synthetic');
 try{
  render(<MemoryRouter initialEntries={['/admin']}><Routes><Route path='/admin' element={<AdminLayout/>}><Route index element={<div>Admin home</div>}/></Route></Routes></MemoryRouter>);
  const navigation=await screen.findByRole('navigation',{name:'Admin navigation'});
  expect(within(navigation).getByRole('link',{name:'Olympiads'})).toHaveAttribute('href','/admin/olympiads');
  expect(within(navigation).getByRole('link',{name:'Online library'})).toHaveAttribute('href','/admin/library');
  expect(within(navigation).getAllByRole('link')).toHaveLength(19);
  fireEvent.change(screen.getByRole('searchbox',{name:'Find a tool'}),{target:{value:'biblioteka'}});
  expect(within(navigation).getByRole('link',{name:'Online library'})).toBeInTheDocument();
  expect(within(navigation).queryByRole('link',{name:'Olympiads'})).not.toBeInTheDocument();
 }finally{Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:originalMatchMedia});localStorage.removeItem('token');}
});
