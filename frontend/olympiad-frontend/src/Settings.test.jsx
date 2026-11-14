import React from 'react';
import { test,expect,vi,beforeEach } from 'vitest';
import { render,screen,fireEvent,waitFor } from '@testing-library/react';
import { MemoryRouter,Routes,Route } from 'react-router-dom';
import axios from 'axios';
import Settings from './Settings';
const {logout}=vi.hoisted(()=>({logout:vi.fn()}));
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn(),put:vi.fn()}}));
vi.mock('./context/AuthContext',()=>({useAuth:()=>{React.useState(null);return {logout};}}));
vi.mock('./context/LanguageContext',()=>({useLanguage:()=>({lang:'en'})}));
vi.mock('./components/Layout',()=>({default:({children})=><main>{children}</main>}));
beforeEach(()=>{vi.clearAllMocks();localStorage.setItem('token','isolated-test-token');axios.get.mockResolvedValue({data:{}});axios.post.mockResolvedValue({status:200});});
test('verified account deletion logs out and returns home without calling hooks from a handler',async()=>{
 render(<MemoryRouter initialEntries={['/settings']}><Routes><Route path="/settings" element={<Settings/>}/><Route path="/homepage" element={<h1>Home destination</h1>}/></Routes></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:/^Delete Account$/}));
 fireEvent.click(screen.getByRole('button',{name:/Yes, Delete Account/}));
 fireEvent.change(await screen.findByLabelText('Verification code'),{target:{value:'123456'}});
 fireEvent.submit(screen.getByLabelText('Verification code').closest('form'));
 await screen.findByRole('heading',{name:'Home destination'});
 expect(logout).toHaveBeenCalledTimes(1);
 expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/delete-account'),{verification_code:'123456'},expect.anything());
});

test('notification changes disable concurrent saves and roll back after a failed request',async()=>{
 axios.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/notification-preferences')?{email_follows:true}:{username:'student'}}));
 let rejectSave;axios.put.mockImplementation(()=>new Promise((resolve,reject)=>{rejectSave=reject;}));
 render(<MemoryRouter><Settings/></MemoryRouter>);
 const boxes=await screen.findAllByRole('checkbox',{name:'Follows'});const follows=boxes[0];
 expect(follows).toBeChecked();fireEvent.click(follows);
 expect(follows).not.toBeChecked();expect(follows).toBeDisabled();
 rejectSave(new Error('isolated failure'));
 await screen.findByRole('alert');expect(follows).toBeChecked();expect(follows).not.toBeDisabled();
 expect(axios.put).toHaveBeenCalledTimes(1);
});
