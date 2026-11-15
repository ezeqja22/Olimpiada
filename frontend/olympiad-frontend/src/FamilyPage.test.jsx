import React from 'react';
import {test,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import axios from 'axios';
import FamilyPage from './FamilyPage';
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn()}}));
vi.mock('./context/LanguageContext',()=>({useLanguage:()=>({lang:'en'})}));
beforeEach(()=>{vi.clearAllMocks();localStorage.setItem('token','isolated-test-token');});
test('family controls preserve separate parent acceptance and student consent',async()=>{
 axios.get.mockImplementation(url=>Promise.resolve({data:url.includes('/student/')?[{id:9,parent_id:3,status:'parent_accepted'},{id:10,parent_id:4,status:'pending'}]:[{id:8,student_id:2,status:'pending'}]}));
 axios.post.mockResolvedValue({data:{}});
 render(<MemoryRouter><FamilyPage/></MemoryRouter>);
 await screen.findByRole('button',{name:'Accept connection'});
 expect(screen.getAllByRole('button',{name:'Approve'})).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Decline'}));
 await waitFor(()=>expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/experience/student/parent-links/9/approve?approve=false'),{},expect.anything()));
 await screen.findByText('Your response was recorded.');
 fireEvent.click(screen.getByRole('button',{name:'Accept connection'}));
 await waitFor(()=>expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/experience/parent/links/8/accept'),{},expect.anything()));
});
test('family loading failure offers a real retry without exposing stale invitations',async()=>{
 axios.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({data:[]});
 render(<MemoryRouter><FamilyPage/></MemoryRouter>);
 await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Retry'}));
 await screen.findByText('As a parent');expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
