import React from 'react';
import {test,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
import axios from 'axios';
import Signup from './Signup';
const {logout}=vi.hoisted(()=>({logout:vi.fn()}));
vi.mock('axios',()=>({default:{post:vi.fn()}}));
vi.mock('./context/AuthContext',()=>({useAuth:()=>{React.useState(null);return {logout};}}));
vi.mock('./context/LanguageContext',()=>({useLanguage:()=>({lang:'en'})}));
vi.mock('./components/Layout',()=>({default:({children})=><main>{children}</main>}));
vi.mock('./components/ToastProvider',()=>({useToast:()=>({showToast:vi.fn()})}));
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();});
function Destination(){const location=useLocation();return <h1>Verify {location.state.email}</h1>;}
test('registration calls hooks only during render and preserves notification consent',async()=>{
 axios.post.mockResolvedValue({data:{}});
 render(<MemoryRouter initialEntries={['/signup']}><Routes><Route path="/signup" element={<Signup/>}/><Route path="/verify-email" element={<Destination/>}/></Routes></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Username'),{target:{value:'synthetic'}});fireEvent.change(screen.getByLabelText('Email'),{target:{value:'synthetic@example.org'}});fireEvent.change(screen.getByLabelText('Password'),{target:{value:'test-only-password'}});
 fireEvent.click(screen.getByRole('checkbox',{name:'Email about likes, comments and follows'}));fireEvent.click(screen.getByRole('button',{name:'Create Account'}));
 await screen.findByRole('heading',{name:'Verify synthetic@example.org'});
 expect(logout).toHaveBeenCalledTimes(1);expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/register'),expect.objectContaining({email_notifications:true,marketing_emails:false}));
});
