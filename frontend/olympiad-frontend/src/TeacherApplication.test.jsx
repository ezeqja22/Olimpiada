import React from 'react';
import {test,expect,vi} from 'vitest';
import {render,screen,fireEvent,act} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import axios from 'axios';
import {TeacherApplicationPage,TeacherWorkspace} from './ExperiencePages';
const user={id:1,email:'test@example.org'};
vi.mock('axios',()=>({default:{get:vi.fn(),post:vi.fn()}}));
vi.mock('./context/AuthContext',()=>({useAuth:()=>({currentUser:user})}));
vi.mock('./context/LanguageContext',()=>({useLanguage:()=>({lang:'en'})}));
vi.mock('./components/SitePageIntro',()=>({default:()=>null}));
test('application read failure does not offer a duplicate application and can retry',async()=>{
 axios.get.mockRejectedValueOnce(new Error('offline'));
 render(<MemoryRouter><TeacherApplicationPage/></MemoryRouter>);
 await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Dërgo aplikimin'})).not.toBeInTheDocument();
 axios.get.mockResolvedValueOnce({data:{status:'pending'}});
 fireEvent.click(screen.getByRole('button',{name:'Retry'}));await screen.findByText('Statusi: pending');
 expect(axios.post).not.toHaveBeenCalled();
});

test('grading view ignores an old course response after changing selection',async()=>{
 let resolveOld;
 axios.get.mockImplementation(url=>url.endsWith('/classes')?Promise.resolve({data:[]}):url.endsWith('/courses')?Promise.resolve({data:[{id:1,title:'One'},{id:2,title:'Two'}]}):url.includes('/1/submissions')?new Promise(r=>{resolveOld=r}):Promise.resolve({data:[{attempt_id:22,student_id:2,answers:'Second answer'}]}));
 render(<MemoryRouter><TeacherWorkspace/></MemoryRouter>);
 const buttons=await screen.findAllByRole('button',{name:'Shiko dorëzimet'});
 fireEvent.click(buttons[0]);fireEvent.click(buttons[1]);await screen.findByText(/Second answer/);
 await act(async()=>resolveOld({data:[{attempt_id:11,student_id:1,answers:'Old answer'}]}));
 expect(screen.queryByText(/Old answer/)).not.toBeInTheDocument();expect(screen.getByText(/Second answer/)).toBeInTheDocument();
});
