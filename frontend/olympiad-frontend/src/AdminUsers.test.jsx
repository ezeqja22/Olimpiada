import React from 'react';
import {test,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import axios from 'axios';
import AdminUsers from './AdminUsers';
const {confirm}=vi.hoisted(()=>({confirm:vi.fn()}));
vi.mock('axios',()=>({default:{get:vi.fn(),put:vi.fn(),post:vi.fn(),delete:vi.fn()}}));
vi.mock('./context/AuthContext',()=>({useAuth:()=>({currentUser:{role:'admin'}})}));
vi.mock('./components/ToastProvider',()=>({useToast:()=>({showToast:vi.fn()})}));
vi.mock('./components/ConfirmProvider',()=>({useConfirm:()=>({confirm})}));
beforeEach(()=>{vi.clearAllMocks();confirm.mockResolvedValue(false);axios.get.mockResolvedValue({data:{users:[{id:1,username:'Student',email:'test@example.org',role:'student',is_active:true,created_at:'2026-01-01'}],pagination:{total:1,pages:1}}});});
test('search queries the server and ordinary admins cannot assign roles',async()=>{
 render(<AdminUsers/>);await screen.findByRole('combobox',{name:'Role for Student'});
 expect(screen.getByRole('combobox',{name:'Role for Student'})).toBeDisabled();
 fireEvent.change(screen.getByRole('searchbox',{name:'Search all members'}),{target:{value:'another-page'}});
 await waitFor(()=>expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('search=another-page'),expect.anything()));
});
test('cancelled delete and ban operations do not mutate accounts',async()=>{
 const prompt=vi.spyOn(window,'prompt').mockReturnValue(null);
 render(<AdminUsers/>);await screen.findByRole('combobox',{name:'Role for Student'});
 fireEvent.click(screen.getByRole('button',{name:/Delete/}));await waitFor(()=>expect(confirm).toHaveBeenCalled());
 fireEvent.click(screen.getByRole('button',{name:'Ban',exact:true}));
 expect(axios.delete).not.toHaveBeenCalled();expect(axios.put).not.toHaveBeenCalled();prompt.mockRestore();
});

vi.mock("./context/LanguageContext",()=>({useLanguage:()=>({lang:"en"})}));
