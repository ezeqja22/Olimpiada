import React from 'react';
import {test,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import axios from 'axios';
import AdminForums from './AdminForums';
const {confirm}=vi.hoisted(()=>({confirm:vi.fn()}));
vi.mock('axios',()=>({default:{get:vi.fn(),delete:vi.fn()}}));
vi.mock('./components/ToastProvider',()=>({useToast:()=>({showToast:vi.fn()})}));
vi.mock('./components/ConfirmProvider',()=>({useConfirm:()=>({confirm})}));
beforeEach(()=>vi.clearAllMocks());
test('search remains focused during loading, and a failed search can be retried',async()=>{
 axios.get.mockResolvedValue({data:{forums:[],pagination:{}}});render(<MemoryRouter><AdminForums/></MemoryRouter>);
 await waitFor(()=>expect(screen.queryByRole('status')).not.toBeInTheDocument());
 axios.get.mockRejectedValueOnce(new Error('offline'));const input=screen.getByRole('searchbox',{name:'Search all forums'});input.focus();fireEvent.change(input,{target:{value:'geometry'}});
 expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load forums');expect(input).toHaveFocus();expect(input).toHaveValue('geometry');
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());expect(axios.get).toHaveBeenLastCalledWith(expect.stringContaining('search=geometry'),expect.anything());
});
test('cancelled deletion leaves the forum intact and its reader reachable',async()=>{
 axios.get.mockResolvedValue({data:{forums:[{id:42,title:'Synthetic forum',creator:'Example'}],pagination:{}}});confirm.mockResolvedValue(false);render(<MemoryRouter><AdminForums/></MemoryRouter>);
 expect(await screen.findByRole('link',{name:'Synthetic forum'})).toHaveAttribute('href','/forum/42');fireEvent.click(screen.getByRole('button',{name:'Delete'}));await waitFor(()=>expect(confirm).toHaveBeenCalled());expect(axios.delete).not.toHaveBeenCalled();
});

vi.mock("./context/LanguageContext",()=>({useLanguage:()=>({lang:"en"})}));
