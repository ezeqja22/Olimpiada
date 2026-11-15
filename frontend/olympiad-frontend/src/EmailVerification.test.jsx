import React from 'react';
import {test,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import axios from 'axios';
import EmailVerification from './EmailVerification';
const {loginWithToken}=vi.hoisted(()=>({loginWithToken:vi.fn()}));
vi.mock('axios',()=>({default:{post:vi.fn()}}));
vi.mock('./context/AuthContext',()=>({useAuth:()=>({loginWithToken})}));
vi.mock('./context/LanguageContext',()=>({useLanguage:()=>({lang:'en'})}));
vi.mock('./components/Layout',()=>({default:({children})=><main>{children}</main>}));
vi.mock('./components/ToastProvider',()=>({useToast:()=>({showToast:vi.fn()})}));
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();sessionStorage.clear();});
function open(state={}){render(<MemoryRouter initialEntries={[{pathname:'/verify-email',state:{email:'synthetic@example.org',redirectTo:'/courses',loginIntentAt:Date.now(),...state}}]}><EmailVerification/></MemoryRouter>);}
async function verify(){fireEvent.change(screen.getByLabelText('Verification code'),{target:{value:'123456'}});fireEvent.click(screen.getByRole('button',{name:'Verify email'}));await screen.findByRole('heading',{name:'Email verified'});}
test('verification refreshes the authenticated user before offering the protected destination',async()=>{
 axios.post.mockResolvedValue({status:200});loginWithToken.mockResolvedValue({id:1});open({token:'synthetic-session'});await verify();
 expect(loginWithToken).toHaveBeenCalledWith('synthetic-session');expect(screen.getByRole('link',{name:'Continue →'})).toHaveAttribute('href','/courses');
});
test('verification without a session offers sign in instead of sending users to a protected page',async()=>{
 axios.post.mockResolvedValue({status:200});open();await verify();expect(loginWithToken).not.toHaveBeenCalled();expect(screen.getByRole('link',{name:'Sign in →'})).toHaveAttribute('href','/login');
});
test('failed verification retains the code and does not authenticate',async()=>{
 axios.post.mockRejectedValue({response:{data:{detail:'Invalid verification code'}}});open({token:'synthetic-session'});fireEvent.change(screen.getByLabelText('Verification code'),{target:{value:'654321'}});fireEvent.click(screen.getByRole('button',{name:'Verify email'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Invalid verification code');expect(screen.getByLabelText('Verification code')).toHaveValue('654321');expect(loginWithToken).not.toHaveBeenCalled();
});
